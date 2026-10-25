import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
const app = readFileSync(path.join(ROOT, 'public/app.js'), 'utf8');

test('cliente usa módulo externo e renderiza modelos por malha, sem instâncias de cubos', () => {
  assert.match(html, /<script type="module" src="\/app\.js"><\/script>/);
  const check = spawnSync(process.execPath, ['--check', path.join(ROOT, 'public/app.js')], { encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr || 'sintaxe inválida no módulo cliente');
  assert.match(app, /buildWireframeObject\(THREE,shape/);
  assert.match(app, /connected-triangle-mesh-v1/);
  assert.match(app, /new THREE\.Box3\(\)\.setFromObject\(swarm\)/);
  assert.match(app, /ocean\.update\(delta,false\)/);
  assert.doesNotMatch(app, /InstancedMesh|instanceMatrix|setMatrixAt|setColorAt|BoxGeometry/);
  assert.doesNotMatch(app, /reference_face_voxels|gridSoulReferenceFace|voxel_mesh/);
});

test('CYBER OCEAN exibe métricas reais e controles ligados ao objeto 3D', () => {
  for (const id of ['hudShape', 'hudTriangles', 'hudVertices', 'hudComponents', 'hudDepth', 'hudRotation', 'hudSession', 'hudFps', 'hudStatus']) {
    assert.match(html, new RegExp(`id="${id}"`), `telemetria ausente: ${id}`);
  }
  for (const id of ['meshColor', 'meshIntensity', 'meshSurfaceToggle', 'meshWireframeToggle', 'meshPause', 'meshResetCamera', 'meshPosX', 'meshPosY', 'meshPosZ', 'population']) {
    assert.match(html, new RegExp(`id="${id}"`), `controle ausente: ${id}`);
  }
  for (const handler of ['meshIntensityInput?.addEventListener', 'meshColorInput?.addEventListener', 'meshSurfaceToggle?.addEventListener', 'meshWireframeToggle?.addEventListener', 'meshPauseButton?.addEventListener', 'meshResetButton?.addEventListener', 'updateMeshPosition']) {
    assert.ok(app.includes(handler), `handler ausente: ${handler}`);
  }
  assert.match(html, /CYBER OCEAN/);
  assert.match(html, /TRIANGLES/);
  assert.match(html, /RIGHT DRAG · PAN/);
  assert.match(app, /currentObjectSpeed=elapsedSeconds>0\?Math\.abs\(swarm\.rotation\.y-previousModelRotation\)\/elapsedSeconds:0/);
});

test('exemplos locais incluem formas reconhecíveis e não chamam a API de comando', () => {
  assert.equal((html.match(/data-visual-example="/g) || []).length, 9);
  for (const example of ['shark', 'heart', 'skull', 'sphere', 'wave', 'face']) {
    assert.match(html, new RegExp(`data-visual-example="${example}"`));
    assert.match(app, new RegExp(`${example}:\\{title:`));
  }
  const localExample = app.match(/async function applyVisualExample\(name\)\{([\s\S]*?)\n\}/);
  assert.ok(localExample, 'exemplos devem possuir um fluxo local identificável');
  assert.doesNotMatch(localExample[1], /fetch\(|\/api\/command/, 'o clique de exemplo não deve enviar prompt ao ChatGPT');
  assert.match(app, /shape='shark';active=budgetFromDetail\(32\)/);
});

test('catálogo periódico permanece como conteúdo independente da topologia', () => {
  assert.match(app, /gridSoulColorForAtomicNumber\(e\.z\)/);
  assert.match(app, /gridSoulElementByAtomicNumber\(focusedAtomicNumber\)/);
  assert.match(app, /O catálogo periódico é informativo/);
  assert.match(html, /repeat\(18,minmax\(0,1fr\)\)/);
  assert.match(html, /<details open>/);
  assert.match(app, /function gsBuildAtom\(element\)/);
  assert.match(app, /new THREE\.IcosahedronGeometry/);
});

test('controles de cena mantêm o fluxo de envio e restauro persistente', () => {
  assert.match(app, /JSON\.stringify\(\{message,population:active\}\)/);
  assert.match(app, /get\('demo'\)==='1'/);
  assert.match(html, /id="visualAuto" type="checkbox" checked/);
  assert.match(app, /function frameSwarmToView\(\)/);
  assert.match(app, /readExplicitVisualOverrides\(requestedCommand\)/);
  assert.match(html, /id="visualScale" type="range"/);
  assert.match(html, /id="visualHelp"/);
  assert.match(app, /representation:'connected-triangle-mesh-v1'/);
  assert.equal((app.match(/addEventListener\('pointerdown', function\(event\)/g) || []).length, 1);
});
