import { buildMeshGeometry, inspectIndexedGeometry } from './wireframe_geometry.js';

const clamp = (value, minimum, maximum, fallback) => Number.isFinite(Number(value))
  ? Math.max(minimum, Math.min(maximum, Number(value))) : fallback;

function vertexMarkers(THREE, geometry, maxMarkers = 420) {
  const attribute = geometry.getAttribute('position');
  const bounds = geometry.boundingBox;
  const size = bounds.getSize(new THREE.Vector3());
  const cellSize = Math.max(size.x, size.y, size.z) / Math.sqrt(maxMarkers) * 0.75;
  const cells = new Set();
  const candidates = [];
  for (let index = 0; index < attribute.count; index++) {
    const x = attribute.getX(index), y = attribute.getY(index), z = attribute.getZ(index);
    const cell = `${Math.floor((x - bounds.min.x) / cellSize)}:${Math.floor((y - bounds.min.y) / cellSize)}:${Math.floor((z - bounds.min.z) / cellSize)}`;
    if (cells.has(cell)) continue;
    cells.add(cell);
    candidates.push([x, y, z]);
  }
  const positions = [];
  const stride = candidates.length > maxMarkers ? candidates.length / maxMarkers : 1;
  for (let index = 0; index < Math.min(candidates.length, maxMarkers); index++) {
    positions.push(...candidates[Math.floor(index * stride)]);
  }
  const markerGeometry = new THREE.BufferGeometry();
  markerGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return markerGeometry;
}

export function buildWireframeObject(THREE, shape, options = {}) {
  const geometry = buildMeshGeometry(THREE, shape, {
    detail: options.detail,
    parts: options.parts
  });
  const metrics = inspectIndexedGeometry(geometry);
  if (!metrics.vertices || !metrics.triangles) {
    geometry.dispose();
    throw new Error('O gerador não produziu uma malha triangular renderizável.');
  }
  const baseColor = options.color || '#20DFFF';
  const intensity = clamp(options.intensity, 0.05, 2.5, 1);
  const surfaceMaterial = new THREE.MeshStandardMaterial({
    color: '#041426',
    emissive: '#031627',
    emissiveIntensity: 0.65,
    metalness: 0.16,
    roughness: 0.36,
    transparent: true,
    opacity: 0.34,
    side: THREE.DoubleSide,
    depthWrite: false,
    flatShading: false
  });
  const edgeMaterial = new THREE.MeshBasicMaterial({
    color: baseColor,
    wireframe: true,
    transparent: true,
    opacity: Math.min(0.86, 0.52 + intensity * 0.1),
    depthWrite: false,
    toneMapped: false
  });
  const markerMaterial = new THREE.PointsMaterial({
    color: '#9DF8FF',
    size: 0.019 + intensity * 0.004,
    sizeAttenuation: true,
    transparent: true,
    opacity: Math.min(0.56, 0.28 + intensity * 0.1),
    depthWrite: false,
    toneMapped: false
  });
  const group = new THREE.Group();
  group.name = `GRID_SOUL_MESH_${shape.toUpperCase()}`;
  const surface = new THREE.Mesh(geometry, surfaceMaterial);
  surface.name = 'triangulated-connected-surface';
  const edges = new THREE.Mesh(geometry, edgeMaterial);
  edges.name = 'triangular-wireframe-from-surface';
  const points = new THREE.Points(vertexMarkers(THREE, geometry), markerMaterial);
  points.name = 'sampled-real-surface-vertices';
  group.add(surface, edges, points);
  group.userData = {
    shape,
    topology: metrics,
    supportsSurfaceToggle: true,
    markerSource: 'actual BufferGeometry position attribute'
  };
  return {
    group,
    geometry,
    surface,
    edges,
    points,
    materials: { surface: surfaceMaterial, edges: edgeMaterial, points: markerMaterial },
    metrics,
    setStyle(style = {}) {
      const color = style.color || baseColor;
      const strength = clamp(style.intensity, 0.05, 2.5, intensity);
      edgeMaterial.color.set(color);
      edgeMaterial.opacity = Math.min(0.86, 0.48 + strength * 0.13);
      markerMaterial.size = 0.018 + strength * 0.004;
      markerMaterial.opacity = Math.min(0.56, 0.26 + strength * 0.1);
      surface.visible = style.surfaceVisible !== false;
      edges.visible = style.wireframeVisible !== false;
      points.visible = style.verticesVisible !== false;
      if (style.surfaceColor) surfaceMaterial.color.set(style.surfaceColor);
      if (Number.isFinite(style.surfaceOpacity)) surfaceMaterial.opacity = clamp(style.surfaceOpacity, 0.03, 0.95, 0.34);
    }
  };
}

function seeded(index, salt = 0) {
  const x = Math.sin((index + 1) * 127.1 + (salt + 1) * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function createOceanEnvironment(THREE, options = {}) {
  const group = new THREE.Group();
  group.name = 'GRID_SOUL_CYBER_OCEAN_ENVIRONMENT';
  const waves = [];
  const waveSettings = [
    { width: 52, depth: 34, nx: 78, nz: 50, y: -2.04, z: -3, opacity: 0.23, color: '#087D9A', speed: 1 },
    { width: 90, depth: 34, nx: 92, nz: 32, y: -2.48, z: -18, opacity: 0.13, color: '#075275', speed: 0.58 }
  ];
  for (const setting of waveSettings) {
    const geometry = new THREE.PlaneGeometry(setting.width, setting.depth, setting.nx, setting.nz);
    geometry.rotateX(-Math.PI / 2);
    geometry.getAttribute('position').setUsage(THREE.DynamicDrawUsage);
    const base = new Float32Array(geometry.getAttribute('position').array);
    const material = new THREE.MeshBasicMaterial({
      color: setting.color,
      wireframe: true,
      transparent: true,
      opacity: setting.opacity,
      depthWrite: false,
      toneMapped: false
    });
    const surfaceMaterial = new THREE.MeshBasicMaterial({
      color: '#03243A',
      transparent: true,
      opacity: 0.055,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const surface = new THREE.Mesh(geometry, surfaceMaterial);
    const lines = new THREE.Mesh(geometry, material);
    surface.position.set(0, setting.y, setting.z);
    lines.position.copy(surface.position);
    group.add(surface, lines);
    waves.push({ geometry, base, setting });
  }

  const particleCount = Math.max(80, Math.min(420, Number(options.particleCount) || 220));
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (seeded(i, 1) - 0.5) * 34;
    particlePositions[i * 3 + 1] = -1.25 + seeded(i, 2) * 8.8;
    particlePositions[i * 3 + 2] = -27 + seeded(i, 3) * 39;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMaterial = new THREE.PointsMaterial({
    color: '#15C9EA',
    size: 0.035,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    sizeAttenuation: true,
    toneMapped: false
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.name = 'limited-atmospheric-particles';
  group.add(particles);
  group.userData.particleCount = particleCount;

  let elapsed = 0;
  return {
    group,
    particleCount,
    update(deltaSeconds, paused = false) {
      if (paused) return;
      elapsed += Math.max(0, Math.min(0.06, deltaSeconds));
      for (const { geometry, base, setting } of waves) {
        const attribute = geometry.getAttribute('position');
        for (let i = 0; i < attribute.count; i++) {
          const x = base[i * 3];
          const z = base[i * 3 + 2];
          const y = 0.13 * Math.sin(x * 0.25 + elapsed * setting.speed)
            + 0.075 * Math.cos(z * 0.34 - elapsed * 0.75 * setting.speed)
            + 0.04 * Math.sin((x + z) * 0.18 + elapsed * 0.48);
          attribute.setY(i, y);
        }
        attribute.needsUpdate = true;
      }
      const attribute = particleGeometry.getAttribute('position');
      for (let i = 0; i < attribute.count; i++) {
        const initialY = -1.25 + seeded(i, 2) * 8.8;
        attribute.setY(i, initialY + Math.sin(elapsed * 0.34 + i * 0.17) * 0.06);
      }
      attribute.needsUpdate = true;
    },
    setIntensity(value) {
      const intensity = clamp(value, 0.05, 2.5, 1);
      for (const wave of group.children) {
        if (wave.material?.wireframe) wave.material.opacity = 0.08 + intensity * 0.12;
      }
    },
    dispose() {
      group.traverse(object => {
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
        else object.material?.dispose?.();
      });
    }
  };
}

export function disposeWireframeObject(presentation) {
  if (!presentation?.group) return;
  const geometries = new Set();
  const materials = new Set();
  presentation.group.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    if (Array.isArray(object.material)) object.material.forEach(material => materials.add(material));
    else if (object.material) materials.add(object.material);
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}
