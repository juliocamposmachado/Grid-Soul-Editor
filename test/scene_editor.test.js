import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSceneProject } from '../public/components/scene_editor.js';

test('projeto do editor aceita objetos com geometrias da lista permitida e normaliza campos', () => {
  const project = validateSceneProject({
    version: 1,
    objects: [{ geometry: 'sphere', name: 'Planeta', position: [1, 2, 3], color: '#12abEF', scale: [1, 2, 3] }]
  });
  assert.equal(project.objects.length, 1);
  assert.equal(project.objects[0].type, 'mesh');
  assert.equal(project.objects[0].name, 'Planeta');
  assert.deepEqual(project.objects[0].position, [1, 2, 3]);
  assert.equal(project.objects[0].color, '#12abEF');
});

test('importador rejeita código, geometrias fora da lista e projetos excessivos', () => {
  assert.throws(() => validateSceneProject({ version: 1, objects: [{ geometry: 'ShaderMaterial', code: 'alert(1)' }] }), /não permitida/);
  assert.throws(() => validateSceneProject({ version: 99, objects: [] }), /inválido/);
  assert.throws(() => validateSceneProject({ version: 1, objects: Array.from({ length: 101 }, () => ({ geometry: 'box' })) }), /limite/);
});

test('campos numéricos inválidos são limitados a valores seguros', () => {
  const [object] = validateSceneProject({ version: 1, objects: [{ geometry: 'box', position: [Infinity, -1000, 'x'], scale: [-1, 200, 1] }] }).objects;
  assert.deepEqual(object.position, [0, -100, 0]);
  assert.deepEqual(object.scale, [0.01, 100, 1]);
});

test('projeto preserva modelo principal da lista permitida e valida partes customizadas', () => {
  const project = validateSceneProject({ version: 1, objects: [], mainModel: {
    shape: 'custom', detail: 40, color: '#19dff6', scale: 2,
    parts: [{ kind: 'ellipsoid', x: 1, sx: 2, sy: .8, sz: .7 }]
  } });
  assert.equal(project.mainModel.shape, 'custom');
  assert.equal(project.mainModel.parts.length, 1);
  assert.equal(project.mainModel.parts[0].sx, 2);
  assert.throws(() => validateSceneProject({ version: 1, objects: [], mainModel: { shape: 'custom', parts: [{ kind: 'javascript', code: 'bad' }] } }), /não permitida/);
});
