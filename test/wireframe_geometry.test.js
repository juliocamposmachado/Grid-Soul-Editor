import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildMeshGeometry, inspectIndexedGeometry } from '../public/components/wireframe_geometry.js';
import { buildWireframeObject, createOceanEnvironment, disposeWireframeObject } from '../public/components/wireframe_scene.js';

const MODEL_SHAPES = ['sphere', 'torus', 'spiral', 'wave', 'terrain', 'cloud', 'face', 'shark', 'heart', 'skull', 'building', 'bridge', 'mechanical', 'planet'];

test('formas principais produzem uma única malha triangular conectada com limites finitos', () => {
  for (const shape of MODEL_SHAPES) {
    const geometry = buildMeshGeometry(THREE, shape, { detail: 32 });
    try {
      const metrics = inspectIndexedGeometry(geometry);
      assert.ok(metrics.vertices > 100, `${shape} deve conter uma superfície, não poucos pontos`);
      assert.ok(metrics.triangles > 100, `${shape} deve conter triângulos reais`);
      assert.equal(metrics.connectedComponents, 1, `${shape} precisa ser uma única superfície conectada`);
      assert.equal(metrics.indexed, true);
      assert.ok(metrics.bounds);
    } finally {
      geometry.dispose();
    }
  }
});

test('densidade aumenta a resolução de superfície sem gerar geometrias não indexadas', () => {
  const low = buildMeshGeometry(THREE, 'shark', { detail: 18 });
  const high = buildMeshGeometry(THREE, 'shark', { detail: 46 });
  try {
    const lowStats = inspectIndexedGeometry(low);
    const highStats = inspectIndexedGeometry(high);
    assert.equal(lowStats.connectedComponents, 1);
    assert.equal(highStats.connectedComponents, 1);
    assert.ok(highStats.triangles > lowStats.triangles);
  } finally {
    low.dispose();
    high.dispose();
  }
});

test('objeto wireframe, superfície e marcadores vêm da mesma geometria conectada', () => {
  const presentation = buildWireframeObject(THREE, 'shark', { detail: 32, color: '#19DFF6' });
  try {
    const children = presentation.group.children;
    assert.equal(children.length, 3);
    assert.ok(children.some(child => child.name === 'triangulated-connected-surface'));
    assert.ok(children.some(child => child.name === 'triangular-wireframe-from-surface'));
    const markerCloud = children.find(child => child.name === 'sampled-real-surface-vertices');
    assert.ok(markerCloud.isPoints);
    assert.ok(markerCloud.geometry.getAttribute('position').count > 0);
    assert.equal(presentation.metrics.connectedComponents, 1);
    presentation.setStyle({ color: '#58FFB5', intensity: 1.5, surfaceVisible: false });
    assert.equal(presentation.surface.visible, false);
    assert.equal(presentation.edges.visible, true);
  } finally {
    disposeWireframeObject(presentation);
  }
});

test('oceano de fundo usa geometria triangulada limitada e atualizável', () => {
  const ocean = createOceanEnvironment(THREE, { particleCount: 128 });
  try {
    assert.equal(ocean.particleCount, 128);
    assert.ok(ocean.group.children.some(child => child.isMesh));
    const wave = ocean.group.children.find(child => child.isMesh);
    assert.equal(wave.geometry.getAttribute('position').usage, THREE.DynamicDrawUsage);
    const before = wave.geometry.getAttribute('position').getY(4);
    ocean.update(1 / 30, false);
    const after = wave.geometry.getAttribute('position').getY(4);
    assert.notEqual(after, before);
    ocean.update(1 / 30, true);
    ocean.setIntensity(1.4);
  } finally {
    ocean.dispose();
  }
});

test('composição custom simples também gera superfície indexada', () => {
  const geometry = buildMeshGeometry(THREE, 'custom', {
    detail: 24,
    parts: [{ kind: 'ellipsoid', x: 0, y: 0, z: 0, sx: 0.8, sy: 0.65, sz: 0.7, rx: 0, ry: 0, rz: 0 }]
  });
  try {
    const metrics = inspectIndexedGeometry(geometry);
    assert.equal(metrics.connectedComponents, 1);
    assert.ok(metrics.triangles > 100);
  } finally {
    geometry.dispose();
  }
});
