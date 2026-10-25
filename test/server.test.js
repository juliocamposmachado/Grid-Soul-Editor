import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let child;
let port;
let baseUrl;
let testDirectory;
let serverOutput = '';

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const selected = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return selected;
}

async function waitForServer() {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Servidor encerrou: ${serverOutput}`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Servidor não iniciou: ${serverOutput}`);
}

before(async () => {
  testDirectory = await mkdtemp(path.join(tmpdir(), 'gridsoul-test-'));
  await writeFile(path.join(testDirectory, 'memory.json'), JSON.stringify({
    version: 1, updatedAt: new Date().toISOString(), lastCommand: 'legacy private prompt fixture',
    lastPlan: { shape: 'sphere', population: 2000, energy: 0.6, scale: 1, reply: 'legacy private reply fixture' },
    history: [{ timestamp: new Date().toISOString(), status: 'success', command: 'legacy private prompt fixture', reply: 'legacy private reply fixture', shape: 'sphere', population: 2000 }]
  }));
  port = await freePort();
  baseUrl = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      GRID_SOUL_CHATGPT_BRIDGE: 'extension',
      GRID_SOUL_PORT: String(port),
      GRID_SOUL_MEMORY_FILE: path.join(testDirectory, 'memory.json'),
      GRID_SOUL_AUTOMATION_DIR: path.join(testDirectory, 'automation')
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.setEncoding('utf8').on('data', chunk => { serverOutput += chunk; });
  child.stderr.setEncoding('utf8').on('data', chunk => { serverOutput += chunk; });
  await waitForServer();
});

after(async () => {
  if (child && child.exitCode === null) {
    child.kill('SIGTERM');
    await Promise.race([
      new Promise(resolve => child.once('exit', resolve)),
      new Promise(resolve => setTimeout(resolve, 2000))
    ]);
  }
  if (testDirectory) await rm(testDirectory, { recursive: true, force: true });
});

test('saúde, página e memória respondem sem exigir uma sessão de navegador', async () => {
  const healthResponse = await fetch(`${baseUrl}/api/health`);
  const health = await healthResponse.json();
  assert.equal(healthResponse.status, 200);
  assert.equal(health.ok, true);
  assert.equal(health.bridge, 'extension');
  assert.equal(health.port, port);
  assert.equal(health.browserReady, false);
  assert.deepEqual(health.extension, { connected: false, id: null, version: null, lastSeen: null });

  const pageResponse = await fetch(`${baseUrl}/`);
  const page = await pageResponse.text();
  assert.equal(pageResponse.status, 200);
  assert.match(page, /GRID SOUL/);
  assert.match(page, /automationPanel/);
  const extensionBackground = await readFile(path.join(ROOT, 'chrome-extension/background.js'), 'utf8');
  assert.match(extensionBackground, /chrome\.runtime\.id/);
  assert.match(extensionBackground, /chrome\.runtime\.getManifest\(\)/);
  assert.match(extensionBackground, /chrome\.tabs\.create\(\{ url: 'https:\/\/chatgpt\.com\/', active: true \}\)/);
  assert.match(extensionBackground, /chrome\.scripting\.executeScript\([\s\S]*files: \['content\.js'\]/);
  const extensionManifest = JSON.parse(await readFile(path.join(ROOT, 'chrome-extension/manifest.json'), 'utf8'));
  assert.ok(extensionManifest.permissions.includes('scripting'));
  const extensionContent = await readFile(path.join(ROOT, 'chrome-extension/content.js'), 'utf8');
  assert.match(extensionContent, /waitForComposer/);
  assert.match(extensionContent, /document\.execCommand\('insertText', false, value\)/);
  assert.match(extensionContent, /waitForSendButton/);
  assert.match(extensionContent, /button\[type="submit"\]/);
  assert.match(extensionContent, /conversation-turn/);
  assert.match(extensionContent, /getBoundingClientRect\(\)/);
  assert.match(extensionContent, /Date\.now\(\) \+ 150000/);
  assert.match(extensionContent, /Entre na sua conta do ChatGPT/);
  assert.match(extensionContent, /__GRID_SOUL_BRIDGE_CONTENT_LOADED__/);
  assert.equal(extensionManifest.version, '1.1.6');
  const automationUi = await fetch(`${baseUrl}/automation-ui.js`);
  assert.equal(automationUi.status, 200);
  assert.match(await automationUi.text(), /INTERROMPER TUDO|autoStopAll/);
  const engineeringUi = await fetch(`${baseUrl}/engineering-ui.js`);
  assert.equal(engineeringUi.status, 200);
  assert.match(await engineeringUi.text(), /forgeAnalyze/);
  const osceContent = await fetch(`${baseUrl}/neurovascular-osce.js`);
  assert.equal(osceContent.status, 200);
  assert.match(await osceContent.text(), /NEUROVASCULAR_OSCE_STATIONS/);
  const osceUi = await fetch(`${baseUrl}/neurovascular-osce-ui.js`);
  assert.equal(osceUi.status, 200);
  assert.match(await osceUi.text(), /calculateOsceScore/);
  const forkModule = await fetch(`${baseUrl}/engineering/fork.js`);
  assert.equal(forkModule.status, 200);
  const threeModule = await fetch(`${baseUrl}/vendor/three/build/three.module.js`);
  assert.equal(threeModule.status, 200);
  assert.match(page, /\/vendor\/three\/build\/three\.module\.js/);

  const atlasResponse = await fetch(`${baseUrl}/assets/humanoid_face_88000.bin`);
  assert.equal(atlasResponse.status, 200);
  const atlasBytes = new Uint8Array(await atlasResponse.arrayBuffer());
  assert.equal(String.fromCharCode(...atlasBytes.subarray(0, 4)), 'GSF1');

  const memoryResponse = await fetch(`${baseUrl}/api/memory`);
  const memory = await memoryResponse.json();
  assert.equal(memoryResponse.status, 200);
  assert.equal(memory.lastPlan.shape, 'sphere');
  assert.equal(memory.lastPlan.reply, 'Estado visual restaurado.');
  assert.equal(memory.lastCommand, '');
  assert.equal(memory.historyCount, 1);
  const sanitized = await readFile(path.join(testDirectory, 'memory.json'), 'utf8');
  assert.equal(sanitized.includes('legacy private prompt fixture'), false);
  assert.equal(sanitized.includes('legacy private reply fixture'), false);
});

test('Playwright/CDP é o padrão quando a extensão não foi solicitada explicitamente', async () => {
  const cdpPort = await freePort();
  const cdpBaseUrl = `http://127.0.0.1:${cdpPort}`;
  const cdpChild = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      GRID_SOUL_CHATGPT_BRIDGE: '',
      GRID_SOUL_PORT: String(cdpPort),
      GRID_SOUL_MEMORY_FILE: path.join(testDirectory, 'cdp-memory.json'),
      GRID_SOUL_AUTOMATION_DIR: path.join(testDirectory, 'cdp-automation')
    },
    stdio: ['ignore', 'ignore', 'ignore']
  });

  try {
    const deadline = Date.now() + 10_000;
    let health;
    while (Date.now() < deadline) {
      if (cdpChild.exitCode !== null) throw new Error('Servidor CDP encerrou durante a inicialização.');
      try {
        const response = await fetch(`${cdpBaseUrl}/api/health`);
        if (response.ok) { health = await response.json(); break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(health, 'servidor CDP não iniciou');
    assert.equal(health.bridge, 'cdp');
    assert.equal(health.extension, null);
    assert.equal(health.browserReady, false);
  } finally {
    if (cdpChild.exitCode === null) {
      const exited = new Promise(resolve => cdpChild.once('exit', resolve));
      cdpChild.kill('SIGTERM');
      await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 2000))]);
    }
  }
});

test('a ponte descobre o ID runtime e a versão da extensão, sem fixá-los no manifest', async () => {
  const manifest = JSON.parse(await readFile(path.join(ROOT, 'chrome-extension/manifest.json'), 'utf8'));
  assert.equal(Object.hasOwn(manifest, 'key'), false);
  const report = { id: 'abcdefghijklmnopabcdefghijklmnop', version: manifest.version };
  const extensionOrigin = `chrome-extension://${report.id}`;
  const preflight = await fetch(`${baseUrl}/api/extension/heartbeat`, {
    method: 'OPTIONS',
    headers: {
      Origin: extensionOrigin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type'
    }
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), extensionOrigin);
  assert.match(preflight.headers.get('access-control-allow-methods') || '', /POST/);
  assert.match(preflight.headers.get('access-control-allow-headers') || '', /Content-Type/i);

  const webPreflight = await fetch(`${baseUrl}/api/extension/heartbeat`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://example.com', 'Access-Control-Request-Method': 'POST' }
  });
  assert.equal(webPreflight.status, 403);
  assert.equal(webPreflight.headers.get('access-control-allow-origin'), null);

  const invalid = await fetch(`${baseUrl}/api/extension/heartbeat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...report, id: 'not-a-chrome-extension-id' })
  });
  assert.equal(invalid.status, 400);

  const mismatchedOrigin = await fetch(`${baseUrl}/api/extension/heartbeat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: extensionOrigin },
    body: JSON.stringify({ ...report, id: 'bbcdefghijklmnopabcdefghijklmnop' })
  });
  assert.equal(mismatchedOrigin.status, 403);

  const response = await fetch(`${baseUrl}/api/extension/heartbeat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: extensionOrigin }, body: JSON.stringify(report)
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), extensionOrigin);
  assert.deepEqual(await response.json(), { ok: true });
  const nextResponse = await fetch(`${baseUrl}/api/extension/next`, { headers: { Origin: extensionOrigin } });
  assert.equal(nextResponse.status, 200);
  assert.equal(nextResponse.headers.get('access-control-allow-origin'), extensionOrigin);
  const health = await (await fetch(`${baseUrl}/api/health`, { cache: 'no-store' })).json();
  assert.equal(health.extension.connected, true);
  assert.equal(health.extension.id, report.id);
  assert.equal(health.extension.version, report.version);
  assert.ok(Number.isFinite(Date.parse(health.extension.lastSeen)));
});

test('catálogo comercial documentado e análise local não enviam projeto à IA sem consentimento', async () => {
  const catalogResponse = await fetch(`${baseUrl}/api/engineering/materials`);
  const catalog = await catalogResponse.json();
  assert.equal(catalogResponse.status, 200);
  assert.equal(catalog.verifiedOn, '2026-10-21');
  assert.equal(catalog.materials.length, 6);
  assert.ok(catalog.materials.every(material => material.source_urls.length > 0 && material.source_urls.every(url => url.startsWith('https://'))));
  assert.equal(catalog.materials.find(material => material.id === 'asa').density_g_cm3, 1.13);
  assert.match(catalog.materials.find(material => material.id === 'asa').caveats, /Divergências oficiais/);
  assert.equal(catalog.materials.find(material => material.id === 'reinforced').density_g_cm3, null);

  const clientScriptResponse = await fetch(`${baseUrl}/engineering-ui.js`);
  const clientScript = await clientScriptResponse.text();
  assert.equal(clientScriptResponse.status, 200);
  assert.match(clientScript, /\/api\/engineering\/consent/);
  assert.match(clientScript, /consentToken/);
  assert.doesNotMatch(clientScript, /externalConsent/);
  assert.match(clientScript, /window\.confirm\([\s\S]*JSON\.stringify\(parameters, null, 2\)/);
  assert.match(clientScript, /function markGeometryStale[\s\S]*?clearCurrentMesh\(\)[\s\S]*?metricsRoot\.replaceChildren\(\)/);
  assert.match(clientScript, /materialSnapshot/);
  assert.match(clientScript, /source_labels/);

  const localResponse = await fetch(`${baseUrl}/api/engineering/analyze`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: 'Garfo com comprimento total de 200 mm e quatro dentes', intendedUse: 'food-contact', useAI: false })
  });
  const local = await localResponse.json();
  assert.equal(localResponse.status, 200);
  assert.equal(local.result.parameters.lengthMm, 200);
  assert.match(local.result.warnings.join(' '), /não há validação nem certificação/);

  const missingConsent = await fetch(`${baseUrl}/api/engineering/analyze`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: 'Garfo protótipo', useAI: true, externalConsent: true })
  });
  assert.equal(missingConsent.status, 403);

  const origin = new URL(baseUrl).origin;
  const consentInput = {
    description: 'Garfo de protótipo com comprimento total de 200 mm',
    intendedUse: 'prototype',
    parameters: { lengthMm: 200 }
  };
  const consentWithoutFetchMetadata = await fetch(`${baseUrl}/api/engineering/consent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(consentInput)
  });
  assert.equal(consentWithoutFetchMetadata.status, 403);

  const consentResponse = await fetch(`${baseUrl}/api/engineering/consent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin, 'Sec-Fetch-Site': 'same-origin' },
    body: JSON.stringify(consentInput)
  });
  const consent = await consentResponse.json();
  assert.equal(consentResponse.status, 201);
  assert.match(consent.consentToken, /^[A-Za-z0-9_-]{40,60}$/);
  assert.ok(consent.expiresAt);
  const sessionCookie = consentResponse.headers.get('set-cookie')?.split(';', 1)[0];
  assert.match(sessionCookie || '', /^grid_soul_engineering_session=/);
  assert.match(consentResponse.headers.get('set-cookie') || '', /HttpOnly; SameSite=Strict/);
  assert.match(consentResponse.headers.get('set-cookie') || '', /Path=\/api\/engineering/);

  const consentHeaders = {
    'Content-Type': 'application/json', Origin: origin,
    'Sec-Fetch-Site': 'same-origin', Cookie: sessionCookie
  };
  const changedPayload = await fetch(`${baseUrl}/api/engineering/analyze`, {
    method: 'POST', headers: consentHeaders,
    body: JSON.stringify({ ...consentInput, description: `${consentInput.description} alterado`, useAI: true, consentToken: consent.consentToken })
  });
  assert.equal(changedPayload.status, 403);
  const replayedConsent = await fetch(`${baseUrl}/api/engineering/analyze`, {
    method: 'POST', headers: consentHeaders,
    body: JSON.stringify({ ...consentInput, useAI: true, consentToken: consent.consentToken })
  });
  assert.equal(replayedConsent.status, 403);

  const crossOrigin = await fetch(`${baseUrl}/api/engineering/analyze`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
    body: JSON.stringify({ description: 'Garfo protótipo', useAI: true, externalConsent: true })
  });
  assert.equal(crossOrigin.status, 403);
  const invalidPurpose = await fetch(`${baseUrl}/api/engineering/analyze`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: 'Garfo protótipo', intendedUse: 'production', useAI: false })
  });
  assert.equal(invalidPurpose.status, 400);
});

test('a extensão recebe e devolve um plano validado para um comando', async () => {
  const invalid = await fetch(`${baseUrl}/api/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '   ' })
  });
  assert.equal(invalid.status, 400);

  const commandPromise = fetch(`${baseUrl}/api/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Transforme-se em um rosto humanoide.', population: 17000 })
  });

  let task;
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const response = await fetch(`${baseUrl}/api/extension/next`);
    task = await response.json();
    if (task.id) break;
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  assert.ok(task?.id, 'o servidor não disponibilizou a tarefa');
  assert.match(task.message, /catálogo periódico é metadado independente/);
  assert.equal((await (await fetch(`${baseUrl}/api/extension/next`)).json()).id, task.id, 'GET não deve consumir a tarefa');
  const claim = await fetch(`${baseUrl}/api/extension/claim`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id })
  });
  assert.equal(claim.status, 200);
  const duplicateClaim = await fetch(`${baseUrl}/api/extension/claim`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id })
  });
  assert.equal(duplicateClaim.status, 409);
  assert.deepEqual(await (await fetch(`${baseUrl}/api/extension/next`)).json(), {});

  const plan = {
    reply: 'Plano de teste validado.',
    shape: 'face',
    population: 1000,
    energy: 0.7,
    scale: 2,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    moveX: 0,
    moveY: 0,
    moveZ: 0,
    color: '#00DFFF',
    parts: [],
    paletteMode: 'cyan',
    meshSettings: { detail: 40, color: '#19DFF6', intensity: 1, surfaceVisible: true, wireframeVisible: false },
    focusedAtomicNumber: 6
  };
  const resultResponse = await fetch(`${baseUrl}/api/extension/result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: task.id, result: JSON.stringify(plan), error: '' })
  });
  assert.equal(resultResponse.status, 200);

  const commandResponse = await commandPromise;
  const returnedPlan = await commandResponse.json();
  assert.equal(commandResponse.status, 200);
  assert.equal(returnedPlan.population, 17000);
  assert.equal(returnedPlan.shape, 'face');
  assert.equal(returnedPlan.paletteMode, 'cyan');
  assert.equal(returnedPlan.meshSettings.detail, 40);
  assert.equal(returnedPlan.meshSettings.wireframeVisible, false);
  assert.equal(returnedPlan.focusedAtomicNumber, 6);
  assert.equal(returnedPlan.geometry.population, 17000);
  assert.equal(returnedPlan.identityVersion, 'connected-triangle-mesh-v1');

  const memory = await (await fetch(`${baseUrl}/api/memory`)).json();
  assert.equal(memory.historyCount, 2);
  assert.equal(memory.lastPlan.identityVersion, 'connected-triangle-mesh-v1');
  assert.equal(memory.lastCommand, '');
  const savedMemory = await readFile(path.join(testDirectory, 'memory.json'), 'utf8');
  assert.equal(savedMemory.includes('Transforme-se em um rosto humanoide.'), false);
  assert.equal(savedMemory.includes('Plano de teste validado.'), false);
});

test('o servidor normaliza o perfil grid_soul_humanoid aninhado e aceita sua população explícita', async () => {
  const profile = {
    object: 'grid_soul_humanoid',
    geometry: {
      type: 'human_face', representation: 'voxel_mesh', population: 88000, scale: 2.5,
      density: 0.92, distribution: 'surface_adaptive',
      grid: { type: '3d_cubic_lattice', cellShape: 'cube', size: 0.025, spacing: 0.004,
        adaptiveResolution: true, surfaceConforming: true, preserveFacialFeatures: true }
    },
    energy: 0.88, rotationX: -0.04, rotationY: 0.08, rotationZ: 0,
    moveX: 0, moveY: 0, moveZ: 0, color: '#00E5FF',
    materials: { base: '#005BFF', primary: '#00E5FF', secondary: '#7B2CFF', accent: '#FF38D1',
      highlight: '#FFD34D', metallic: 0.65, roughness: 0.22, emissiveIntensity: 1.8 },
    face: { symmetry: 0.92, eyeDetail: 1, noseDetail: 0.95, mouthDetail: 0.95,
      surfaceDisplacement: 0.035, expression: 'neutral', orientation: 'frontal' },
    mesh: { connectivity: 'neighbor_lattice', renderCubesIndividually: true,
      mergeAdjacentFaces: false, edgeDefinition: 0.08, surfaceContinuity: 0.94, lod: true },
    particles: { enabled: true, count: 1800, distribution: 'orbiting_surface', dispersion: 0.35,
      sizeVariation: 0.8, colors: ['#00E5FF', '#126BFF', '#A52CFF', '#FF38D1', '#FFD34D'] },
    lighting: { bloom: 1.4, contrast: 1.25, ambient: 0.12, keyLight: '#00CFFF',
      rimLight: '#A52CFF', background: '#020617' },
    render: { quality: 'ultra', antialiasing: true, shadows: true, depthOfField: 0.12,
      transparentBackground: false }
  };
  const message = 'Transforme-se em um rosto humanoide com população 88000.';
  const commandPromise = fetch(`${baseUrl}/api/command`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, population: 17000 })
  });
  let task;
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    task = await (await fetch(`${baseUrl}/api/extension/next`)).json();
    if (task.id) break;
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  assert.ok(task?.id, 'a tarefa do perfil não foi entregue à extensão');
  assert.equal((await fetch(`${baseUrl}/api/extension/claim`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id })
  })).status, 200);
  const resultResponse = await fetch(`${baseUrl}/api/extension/result`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: task.id, result: JSON.stringify({ ...profile, reply: 'Perfil facial aplicado.' }), error: '' })
  });
  assert.equal(resultResponse.status, 200);
  const commandResponse = await commandPromise;
  const plan = await commandResponse.json();
  assert.equal(commandResponse.status, 200);
  assert.equal(plan.object, 'grid_soul_humanoid');
  assert.equal(plan.shape, 'face');
  assert.equal(plan.population, 88000);
  assert.equal(plan.geometry.population, 88000);
  assert.equal(plan.scale, 2.5);
  assert.equal(plan.paletteMode, 'cyan');
  assert.equal(plan.geometry.representation, 'connected_triangle_surface');
  assert.equal(plan.faceProfile.geometry.referenceMode, 'procedural_surface');
  assert.equal(plan.mesh.connectivity, 'shared_triangle_indices');
  assert.equal(plan.mesh.renderIndependentCells, false);
  assert.equal(plan.particles, undefined);
  assert.equal(plan.meshSettings.detail, 36);
  assert.equal(plan.meshSettings.wireframeVisible, true);
  assert.equal(plan.face.eyeDetail, 1);
  assert.equal(plan.render.quality, 'ultra');
  assert.equal(plan.faceProfile.lighting.background, '#020617');
  assert.equal(plan.identityVersion, 'connected-triangle-mesh-v1');
});

test('pedido de rosto anexo mantém a malha facial procedural e o orçamento atual', async () => {
  const message = 'Gere um rosto procedural em wireframe que combine com a referência anexada.';
  const commandPromise = fetch(`${baseUrl}/api/command`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, population: 17000 })
  });
  let task;
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    task = await (await fetch(`${baseUrl}/api/extension/next`)).json();
    if (task.id) break;
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  assert.ok(task?.id, 'a tarefa de fidelidade à referência não chegou à extensão');
  assert.match(task.message, /superfícies conectadas de malha triangular/);
  assert.match(task.message, /não é número de cubos/);
  assert.equal((await fetch(`${baseUrl}/api/extension/claim`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id })
  })).status, 200);
  const resultResponse = await fetch(`${baseUrl}/api/extension/result`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: task.id, result: JSON.stringify({
      reply: 'Face de referência.', shape: 'face', population: 17000,
      energy: 0.88, scale: 2.5, rotationX: 0, rotationY: 0, rotationZ: 0,
      moveX: 0, moveY: 0, moveZ: 0, color: '#00E5FF'
    }), error: '' })
  });
  assert.equal(resultResponse.status, 200);
  const response = await commandPromise;
  const plan = await response.json();
  assert.equal(response.status, 200);
  assert.equal(plan.population, 17000);
  assert.equal(plan.geometry.population, 17000);
  assert.equal(plan.faceProfile.geometry.referenceMode, 'procedural_surface');
  assert.equal(plan.faceProfile.geometry.representation, 'connected_triangle_surface');
  assert.equal(plan.faceProfile.geometry.grid, undefined);
  assert.equal(plan.particles, undefined);
});

test('a extensão não consegue responder com uma tarefa inexistente', async () => {
  const response = await fetch(`${baseUrl}/api/extension/result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'nao-existe', result: '{}', error: '' })
  });
  assert.equal(response.status, 404);
});

test('automação começa negada, exige consentimento e recusa origens cruzadas', async () => {
  const permissions = await (await fetch(`${baseUrl}/api/automation/permissions`)).json();
  assert.deepEqual(permissions.permissions.enabled, { terminal: false, files: false, apps: false, browser: false });

  const denied = await fetch(`${baseUrl}/api/automation/terminal/run`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: 'pwd' })
  });
  assert.equal(denied.status, 403);

  const noConsent = await fetch(`${baseUrl}/api/automation/permissions/terminal`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: true })
  });
  assert.equal(noConsent.status, 400);

  const crossOrigin = await fetch(`${baseUrl}/api/automation/permissions/terminal`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
    body: JSON.stringify({ enabled: true, confirmed: true })
  });
  assert.equal(crossOrigin.status, 403);
});

test('comandos e arquivos exigem categorias, escopos e aprovação por operação', async () => {
  const api = async (route, method = 'POST', body = {}) => fetch(`${baseUrl}/api/automation${route}`, {
    method, headers: { 'Content-Type': 'application/json' }, body: method === 'GET' ? undefined : JSON.stringify(body)
  });
  const enable = async category => {
    const response = await api(`/permissions/${category}`, 'PATCH', { enabled: true, confirmed: true });
    assert.equal(response.status, 200);
  };
  const managedDirectory = path.join(testDirectory, 'managed-files');
  await mkdir(managedDirectory, { recursive: true });
  await writeFile(path.join(managedDirectory, '.env'), 'PRIVATE_TEST_SECRET=never-read');
  const auditStream = await api('/events', 'GET');
  const auditReader = auditStream.body.getReader();
  const auditDecoder = new TextDecoder();
  let liveAudit = '';
  const awaitAuditEvent = (async () => {
    const timeout = setTimeout(() => { void auditReader.cancel(); }, 2_000);
    try {
      while (!liveAudit.includes('event: audit\n')) {
        const { value, done } = await auditReader.read();
        if (done) throw new Error('SSE fechou antes do evento de auditoria.');
        liveAudit += auditDecoder.decode(value, { stream: true });
      }
      return liveAudit;
    } finally { clearTimeout(timeout); }
  })();
  await enable('terminal');
  assert.match(await awaitAuditEvent, /"action":"permission"/);
  await auditReader.cancel();
  await enable('files');
  const scopeResponse = await api('/scopes/files', 'POST', { path: managedDirectory, confirmed: true });
  assert.equal(scopeResponse.status, 200);
  const nestedProfile = path.join(managedDirectory, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default');
  await mkdir(nestedProfile, { recursive: true });
  const profileScope = await api('/scopes/files', 'POST', { path: nestedProfile, confirmed: true });
  assert.equal(profileScope.status, 400, 'subdiretórios de perfis de navegador também são bloqueados como raiz concedida');

  const shell = await api('/terminal/run', 'POST', { command: 'pwd; whoami' });
  assert.equal(shell.status, 400);
  const secretFile = await api('/files', 'POST', { action: 'read', path: '.env' });
  assert.equal(secretFile.status, 400);
  const escapeAttempt = await api('/files', 'POST', { action: 'read', path: '../../etc/passwd' });
  assert.equal(escapeAttempt.status, 400);

  const create = await api('/files', 'POST', {
    action: 'create', path: 'nota.txt', content: 'conteudo privado de teste', confirmed: true
  });
  assert.equal(create.status, 202);
  const createTask = (await create.json()).task;
  assert.equal(createTask.status, 'awaiting_confirmation');
  assert.equal(createTask.confirmation.details.preview, 'conteudo privado de teste');
  assert.equal(createTask.confirmation.details.byteLength, Buffer.byteLength('conteudo privado de teste'));
  await assert.rejects(access(path.join(managedDirectory, 'nota.txt')));

  const auditBeforeApproval = await readFile(path.join(testDirectory, 'automation', 'audit.jsonl'), 'utf8');
  assert.equal(auditBeforeApproval.includes('conteudo privado de teste'), false);

  const decision = await api(`/tasks/${createTask.id}/decision`, 'POST', { approved: true });
  assert.equal(decision.status, 202);
  const deadline = Date.now() + 3000;
  let createdTask;
  while (Date.now() < deadline) {
    const response = await api('/tasks', 'GET');
    const data = await response.json();
    createdTask = data.tasks.find(task => task.id === createTask.id);
    if (createdTask?.status === 'completed' || createdTask?.status === 'failed') break;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  assert.equal(createdTask?.status, 'completed', createdTask?.error);
  assert.equal(await readFile(path.join(managedDirectory, 'nota.txt'), 'utf8'), 'conteudo privado de teste');

  const removeRequest = await api('/files', 'POST', { action: 'delete', path: 'nota.txt', confirmed: true });
  const removeTask = (await removeRequest.json()).task;
  assert.equal(removeTask.status, 'awaiting_confirmation');
  const rejected = await api(`/tasks/${removeTask.id}/decision`, 'POST', { approved: false });
  assert.equal(rejected.status, 200);
  assert.equal(await readFile(path.join(managedDirectory, 'nota.txt'), 'utf8'), 'conteudo privado de teste');

  const pendingWrite = await api('/files', 'POST', {
    action: 'create', path: 'cancelado.txt', content: 'não deve ser gravado', confirmed: true
  });
  const pendingTask = (await pendingWrite.json()).task;
  assert.equal(pendingTask.status, 'awaiting_confirmation');
  assert.equal((await api('/stop', 'POST', {})).status, 200);
  const stopped = await api('/tasks', 'GET');
  assert.equal((await stopped.json()).tasks.find(task => task.id === pendingTask.id).status, 'cancelled');
  await assert.rejects(access(path.join(managedDirectory, 'cancelado.txt')));

  const terminal = await api('/terminal/run', 'POST', { command: 'pwd' });
  assert.equal(terminal.status, 202);
  assert.equal((await terminal.json()).task.category, 'terminal');

  const browserEnabled = await api('/permissions/browser', 'PATCH', { enabled: true, confirmed: true });
  assert.equal(browserEnabled.status, 200);
  const localDomain = await api('/scopes/browser', 'POST', { origin: 'https://127.0.0.1', confirmed: true });
  assert.equal(localDomain.status, 400);
  const ungrantedOrigin = await api('/browser/navigate', 'POST', { url: 'https://chatgpt.com/' });
  assert.equal(ungrantedOrigin.status, 400);

  await api('/stop', 'POST', {});
  await api('/permissions/files', 'PATCH', { enabled: false });
  await api('/permissions/terminal', 'PATCH', { enabled: false });
  await api('/permissions/browser', 'PATCH', { enabled: false });
});
