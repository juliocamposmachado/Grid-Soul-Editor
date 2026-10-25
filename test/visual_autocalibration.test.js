import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calibrateVisual,
  computeFrameDistance,
  detectDeviceTier,
  readExplicitVisualOverrides
} from '../public/components/visual_autocalibration.js';

test('auto-calibração cobre novas formas e reduz movimento para melhorar a leitura', () => {
  const shark = calibrateVisual({ shape: 'shark', prompt: 'Crie um tubarão em malha', deviceMemory: 8, hardwareConcurrency: 8 });
  const heart = calibrateVisual({ shape: 'heart', prompt: 'Crie um coração' });
  const face = calibrateVisual({ shape: 'face', prompt: 'Crie um rosto estilizado', deviceMemory: 8, hardwareConcurrency: 8 });
  const cloud = calibrateVisual({ shape: 'cloud', prompt: 'Mostre uma nuvem' });

  assert.equal(shark.population, 82_000);
  assert.equal(heart.population, 55_000);
  assert.equal(face.population, 54_000);
  assert.ok(shark.energy < 0.6);
  assert.ok(face.energy < shark.energy);
  assert.ok(cloud.population >= 1_000 && cloud.population < shark.population);
  assert.match(shark.summary, /Auto \(alto\)/);
  assert.doesNotMatch(shark.summary, /cubos|voxels/i);
});

test('densidade numérica da malha prevalece sobre presets automáticos', () => {
  const prompt = 'Crie um tubarão com densidade da malha 48, energia 0,4 e escala visual 2,7';
  const overrides = readExplicitVisualOverrides(prompt);
  const plan = calibrateVisual({ shape: 'shark', prompt, population: 82_000, energy: 0.18, scale: 2.35 });

  assert.deepEqual(overrides, { population: null, meshDetail: 48, energy: 0.4, scale: 2.7 });
  assert.equal(plan.energy, 0.4);
  assert.equal(plan.scale, 2.7);
});

test('mantém compatibilidade com orçamentos numéricos legados e entende detalhe direto', () => {
  assert.deepEqual(readExplicitVisualOverrides('resolução da malha 32'), { population: null, meshDetail: 32, energy: null, scale: null });
  assert.deepEqual(readExplicitVisualOverrides('densidade 64'), { population: null, meshDetail: 64, energy: null, scale: null });
  assert.deepEqual(readExplicitVisualOverrides('densidade 90'), { population: null, meshDetail: null, energy: null, scale: null });
  assert.deepEqual(readExplicitVisualOverrides('Gere com 12 mil microcubos'), { population: 12_000, meshDetail: null, energy: null, scale: null });
  assert.deepEqual(readExplicitVisualOverrides('Use 88.000 partículas'), { population: 88_000, meshDetail: null, energy: null, scale: null });
  assert.deepEqual(readExplicitVisualOverrides('orçamento de malha: 24.000'), { population: 24_000, meshDetail: null, energy: null, scale: null });
  assert.deepEqual(readExplicitVisualOverrides('energia 0,35 e escala 2.4'), { population: null, meshDetail: null, energy: 0.35, scale: 2.4 });
  assert.equal(calibrateVisual({ shape: 'sphere', prompt: 'orçamento de malha 12 mil' }).population, 12_000);
});

test('limita a estimativa de malha por perfil de dispositivo e teto seguro', () => {
  const low = calibrateVisual({ shape: 'wave', prompt: '', deviceMemory: 2, hardwareConcurrency: 2 });
  const high = calibrateVisual({ shape: 'wave', prompt: '', deviceMemory: 8, hardwareConcurrency: 12 });
  const explicit = calibrateVisual({ shape: 'sphere', prompt: 'orçamento 900000', maxParticles: 500_000 });

  assert.equal(detectDeviceTier({ deviceMemory: 2, hardwareConcurrency: 2 }), 'low');
  assert.ok(low.population < high.population);
  assert.equal(explicit.population, 500_000);
  assert.ok(low.population <= 500_000);
});

test('modo manual preserva parâmetros atuais depois de sanitizar limites', () => {
  const manual = calibrateVisual({ shape: 'torus', automatic: false, population: 17_500, energy: 0.85, scale: 3.25 });
  assert.equal(manual.automatic, false);
  assert.equal(manual.population, 17_500);
  assert.equal(manual.energy, 0.85);
  assert.equal(manual.scale, 3.25);
  assert.match(manual.summary, /Modo manual/);
});

test('enquadramento calcula distância correta para retrato e limita entradas inválidas', () => {
  const landscape = computeFrameDistance({ x: 4, y: 3, z: 1 }, { aspect: 1.8 });
  const portrait = computeFrameDistance({ x: 4, y: 3, z: 1 }, { aspect: 0.5 });
  const invalid = computeFrameDistance({ x: NaN, y: -3, z: Infinity }, { verticalFovDegrees: 0, aspect: 0 });

  assert.ok(landscape.radius > 0);
  const sphericalBoundingBoxFit = landscape.radius / Math.sin(25 * Math.PI / 180) * 1.2;
  assert.ok(landscape.distance < sphericalBoundingBoxFit);
  assert.ok(portrait.distance > landscape.distance);
  assert.ok(Number.isFinite(invalid.distance) && invalid.distance > 0);
});
