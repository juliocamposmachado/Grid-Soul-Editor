import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
import { createAutomationRouter } from './lib/automation/service.js';
import { analyzeForkLocally, buildEngineeringPrompt, sanitizeEngineeringProposal } from './lib/engineering/assistant.js';
import { GRID_SOUL_MATERIALS, MATERIAL_CATALOG_VERIFIED_ON } from './components/material_catalog.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Memória persistente local do GRID SOUL.
const MEMORY_FILE = process.env.GRID_SOUL_MEMORY_FILE
  ? path.resolve(process.env.GRID_SOUL_MEMORY_FILE)
  : path.join(ROOT, 'data', 'gridsoul-memory.json');
const MEMORY_DIR = path.dirname(MEMORY_FILE);
const MEMORY_LIMIT = 100;
const PORT = Number(process.env.GRID_SOUL_PORT || 8765);
const BRIDGE_MODE = process.env.GRID_SOUL_CHATGPT_BRIDGE === 'extension' ? 'extension' : 'cdp';

function emptyMemory() {
  return { version: 1, updatedAt: null, lastCommand: '', lastPlan: null, history: [] };
}

function loadMemory() {
  try {
    const parsed = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.history)) {
      return emptyMemory();
    }
    const lastPlan = parsed.lastPlan && typeof parsed.lastPlan === 'object'
      ? sanitizePlan(parsed.lastPlan)
      : null;
    if (lastPlan) lastPlan.reply = 'Estado visual restaurado.';
    const history = parsed.history.slice(-MEMORY_LIMIT).map(entry => ({
      timestamp: typeof entry?.timestamp === 'string' ? entry.timestamp : null,
      status: typeof entry?.status === 'string' ? entry.status : 'success',
      shape: typeof entry?.shape === 'string' ? entry.shape : undefined,
      population: Number.isFinite(entry?.population) ? entry.population : undefined,
      energy: Number.isFinite(entry?.energy) ? entry.energy : undefined,
      scale: Number.isFinite(entry?.scale) ? entry.scale : undefined,
      color: typeof entry?.color === 'string' ? entry.color : undefined
    }));
    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
      lastCommand: '',
      lastPlan,
      history
    };
  } catch {
    return emptyMemory();
  }
}

let memory;

function saveMemory() {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
  const temporary = MEMORY_FILE + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(memory, null, 2) + '\n',
    { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temporary, MEMORY_FILE);
}

function visualOnlyPlan(plan) {
  const safePlan = JSON.parse(JSON.stringify(plan));
  safePlan.reply = 'Estado visual restaurado.';
  return safePlan;
}

function rememberSuccessfulCommand(plan) {
  const timestamp = new Date().toISOString();
  const safePlan = visualOnlyPlan(plan);

  memory.lastCommand = '';
  memory.lastPlan = safePlan;
  memory.updatedAt = timestamp;
  memory.history.push({
    timestamp,
    status: 'success',
    shape: safePlan.shape,
    population: safePlan.population,
    energy: safePlan.energy,
    scale: safePlan.scale,
    color: safePlan.color
  });
  memory.history = memory.history.slice(-MEMORY_LIMIT);
  saveMemory();
}

function rememberVisualState(plan) {
  memory.lastCommand = '';
  memory.lastPlan = visualOnlyPlan(plan);
  memory.updatedAt = new Date().toISOString();
  saveMemory();
}

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));

const CHROME_EXTENSION_ORIGIN = /^chrome-extension:\/\/([a-p]{32})$/;
app.use('/api/extension', (req, res, next) => {
  const origin = req.get('origin');
  const match = typeof origin === 'string' ? origin.match(CHROME_EXTENSION_ORIGIN) : null;
  if (origin && !match) {
    return res.status(403).json({ error: 'A API da ponte aceita somente origens de extensões Chrome.' });
  }
  if (match) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '600');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.vary('Origin');
  }
  if (req.method === 'OPTIONS') {
    if (!match) return res.sendStatus(403);
    const requestedMethod = req.get('access-control-request-method');
    const requestedHeaders = (req.get('access-control-request-headers') || '')
      .split(',').map(header => header.trim().toLowerCase()).filter(Boolean);
    if (!['GET', 'POST'].includes(requestedMethod) || requestedHeaders.some(header => header !== 'content-type')) {
      return res.sendStatus(403);
    }
    return res.sendStatus(204);
  }
  next();
});
app.use(express.json({ limit: '600kb' }));
app.use('/api/', rateLimit({
  windowMs: 60_000,
  limit: 60,
  skip: req => req.path.startsWith('/extension/')
}));
app.use('/api/automation', createAutomationRouter({ rootDirectory: ROOT, port: PORT }));

const shapes = ['sphere', 'torus', 'spiral', 'wave', 'cloud', 'face', 'terrain', 'custom', 'shark', 'heart', 'skull', 'building', 'bridge', 'mechanical', 'planet'];
const partKinds = ['sphere', 'ellipsoid', 'torus', 'cylinder', 'cone', 'box'];
memory = loadMemory();
try { saveMemory(); }
catch {
  memory = emptyMemory();
  try { fs.unlinkSync(MEMORY_FILE); } catch {}
  console.error('GRID SOUL: memória legada não pôde ser sanitizada e foi desativada nesta sessão.');
}

// GRID_SOUL_CDP_BRIDGE
let busy = false;
let cdpBrowser = null;
let extensionTask = null;

async function getChatGPTPage() {
  if (!cdpBrowser || !cdpBrowser.isConnected()) {
    cdpBrowser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  }

  const contexts = cdpBrowser.contexts();
  if (!contexts.length) throw new Error("Nenhum contexto Chrome disponível.");

  const context = contexts[0];
  const pages = context.pages();
  const allowedChatOrigins = new Set(['https://chatgpt.com', 'https://chat.openai.com']);
  let page = pages.find(candidate => {
    try {
      const url = new URL(candidate.url());
      return url.protocol === 'https:' && allowedChatOrigins.has(url.origin);
    } catch { return false; }
  });

  if (!page) {
    page = await context.newPage();
    await page.goto("https://chatgpt.com/", { waitUntil: "domcontentloaded", timeout: 30000 });
  }

  await page.bringToFront();
  return page;
}

async function firstVisible(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count().catch(() => 0)) {
      if (await locator.isVisible().catch(() => false)) return locator;
    }
  }
  return null;
}


function extractJSON(raw) {
  if (raw && typeof raw === "object") return raw;
  if (typeof raw !== "string") {
    throw new Error("A resposta do ChatGPT não é texto.");
  }

  const text = raw.replace(/```(?:json)?/gi, "");

  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "{") continue;

    let depth = 0;
    let quoted = false;
    let escaped = false;

    for (let j = i; j < text.length; j++) {
      const c = text[j];

      if (quoted) {
        if (escaped) escaped = false;
        else if (c === "\\") escaped = true;
        else if (c === '"') quoted = false;
        continue;
      }

      if (c === '"') quoted = true;
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) {
        try {
          const parsed = JSON.parse(text.slice(i, j + 1));
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed;
          }
        } catch {}
        break;
      }
    }
  }

  throw new Error("O ChatGPT não retornou um JSON válido.");
}

function sanitizePlan(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("O plano visual recebido é inválido.");
  }

  const number = (value, fallback, min, max) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  };
  const boolean = (value, fallback) => typeof value === 'boolean' ? value : fallback;
  const safeColor = (value, fallback) => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value.toUpperCase() : fallback;

  const allowedShapes = new Set(shapes);
  const geometryInput = input.geometry && typeof input.geometry === 'object' && !Array.isArray(input.geometry)
    ? input.geometry : {};
  const isHumanoidObject = input.object === 'grid_soul_humanoid' && geometryInput.type === 'human_face';
  const shape = isHumanoidObject ? 'face' : allowedShapes.has(input.shape) ? input.shape : 'sphere';
  const color = safeColor(input.color, '#19DFF6');
  const rawFaceProfile = input.faceProfile && typeof input.faceProfile === 'object'
    ? input.faceProfile : input;
  const profileGeometry = rawFaceProfile.geometry && typeof rawFaceProfile.geometry === 'object'
    ? rawFaceProfile.geometry : geometryInput;
  const profileFace = rawFaceProfile.face && typeof rawFaceProfile.face === 'object' ? rawFaceProfile.face : {};
  const profileMaterials = rawFaceProfile.materials && typeof rawFaceProfile.materials === 'object' ? rawFaceProfile.materials : {};
  const profileMesh = rawFaceProfile.mesh && typeof rawFaceProfile.mesh === 'object' ? rawFaceProfile.mesh : {};
  const profileLighting = rawFaceProfile.lighting && typeof rawFaceProfile.lighting === 'object' ? rawFaceProfile.lighting : {};
  const profileRender = rawFaceProfile.render && typeof rawFaceProfile.render === 'object' ? rawFaceProfile.render : {};
  const faceProfile = shape === 'face' ? {
    geometry: {
      type: 'human_face',
      representation: 'connected_triangle_surface',
      referenceMode: 'procedural_surface',
      density: number(profileGeometry.density, 0.72, 0.1, 1),
      distribution: 'adaptive_surface'
    },
    materials: {
      base: safeColor(profileMaterials.base, '#041426'),
      primary: safeColor(profileMaterials.primary, color),
      secondary: safeColor(profileMaterials.secondary, '#167EAD'),
      accent: safeColor(profileMaterials.accent, '#00E5FF'),
      highlight: safeColor(profileMaterials.highlight, '#A9F7FF'),
      metallic: number(profileMaterials.metallic, 0.2, 0, 1),
      roughness: number(profileMaterials.roughness, 0.42, 0.02, 1),
      emissiveIntensity: number(profileMaterials.emissiveIntensity, 0.75, 0, 2)
    },
    face: {
      symmetry: number(profileFace.symmetry, 0.92, 0, 1),
      eyeDetail: number(profileFace.eyeDetail, 1, 0, 1.5),
      noseDetail: number(profileFace.noseDetail, 0.95, 0, 1.5),
      mouthDetail: number(profileFace.mouthDetail, 0.95, 0, 1.5),
      surfaceDisplacement: number(profileFace.surfaceDisplacement, 0.035, 0, 0.2),
      expression: ['neutral', 'smile', 'frown'].includes(profileFace.expression) ? profileFace.expression : 'neutral',
      orientation: ['frontal', 'three_quarter', 'profile'].includes(profileFace.orientation) ? profileFace.orientation : 'frontal'
    },
    mesh: {
      connectivity: 'shared_triangle_indices',
      renderIndependentCells: false,
      mergeAdjacentFaces: true,
      surfaceContinuity: number(profileMesh.surfaceContinuity, 1, 0, 1),
      lod: boolean(profileMesh.lod, false)
    },
    lighting: {
      contrast: number(profileLighting.contrast, 1, 0.5, 2),
      ambient: number(profileLighting.ambient, 0.2, 0, 1),
      keyLight: safeColor(profileLighting.keyLight, '#00CFFF'),
      rimLight: safeColor(profileLighting.rimLight, '#167DFF'),
      background: safeColor(profileLighting.background, '#020A18')
    },
    render: {
      quality: ['standard', 'high', 'ultra'].includes(profileRender.quality) ? profileRender.quality : 'high',
      antialiasing: boolean(profileRender.antialiasing, true),
      shadows: boolean(profileRender.shadows, false),
      transparentBackground: boolean(profileRender.transparentBackground, false)
    }
  } : null;
  const meshSettingsInput = input.meshSettings && typeof input.meshSettings === 'object' && !Array.isArray(input.meshSettings)
    ? input.meshSettings : {};
  const meshSettings = {
    detail: Math.round(number(meshSettingsInput.detail, 36, 12, 64)),
    color: safeColor(meshSettingsInput.color, color),
    intensity: number(meshSettingsInput.intensity, 1, 0.1, 2.5),
    surfaceVisible: boolean(meshSettingsInput.surfaceVisible, true),
    wireframeVisible: boolean(meshSettingsInput.wireframeVisible, true)
  };

  const allowedKinds = new Set(partKinds);
  const parts = shape === "custom" && Array.isArray(input.parts)
    ? input.parts.slice(0, 24).filter(p => p && typeof p === "object").map(p => ({
        kind: allowedKinds.has(p.kind) ? p.kind : "sphere",
        x: number(p.x, 0, -4, 4),
        y: number(p.y, 0, -4, 4),
        z: number(p.z, 0, -4, 4),
        sx: number(p.sx, 0.5, 0.05, 3),
        sy: number(p.sy, 0.5, 0.05, 3),
        sz: number(p.sz, 0.5, 0.05, 3),
        rx: number(p.rx, 0, -6.28, 6.28),
        ry: number(p.ry, 0, -6.28, 6.28),
        rz: number(p.rz, 0, -6.28, 6.28)
      }))
    : [];

  return {
    object: shape === 'face' ? 'grid_soul_humanoid' : undefined,
    geometry: faceProfile ? { ...faceProfile.geometry, population: Math.round(number(isHumanoidObject ? geometryInput.population : input.population, 85000, 1000, 500000)), scale: number(isHumanoidObject ? geometryInput.scale : input.scale, 2.5, 0.5, 8) } : undefined,
    materials: faceProfile?.materials,
    face: faceProfile?.face,
    mesh: faceProfile?.mesh,
    lighting: faceProfile?.lighting,
    render: faceProfile?.render,
    meshSettings,
    reply: typeof input.reply === "string"
      ? input.reply.slice(0, 1000)
      : "Plano visual recebido pelo GRID SOUL.",
    shape,
    population: Math.round(number(isHumanoidObject ? geometryInput.population : input.population, 85000, 1000, 500000)),
    energy: number(input.energy, 0.7, 0, 1),
    scale: number(isHumanoidObject ? geometryInput.scale : input.scale, 2.5, 0.5, 8),
    rotationX: number(input.rotationX, 0, -6.28, 6.28),
    rotationY: number(input.rotationY, 0, -6.28, 6.28),
    rotationZ: number(input.rotationZ, 0, -6.28, 6.28),
    moveX: number(input.moveX, 0, -10, 10),
    moveY: number(input.moveY, 0, -10, 10),
    moveZ: number(input.moveZ, 0, -10, 10),
    color,
    paletteMode: ['chemical', 'single', 'rainbow', 'plasma', 'fire', 'green', 'cyan'].includes(input.paletteMode)
      ? input.paletteMode
      : 'cyan',
    focusedAtomicNumber: Number.isInteger(Number(input.focusedAtomicNumber)) && Number(input.focusedAtomicNumber) >= 1 && Number(input.focusedAtomicNumber) <= 118
      ? Number(input.focusedAtomicNumber)
      : null,
    identityVersion: 'connected-triangle-mesh-v1',
    faceProfile,
    parts
  };
}

async function askChatGPT(prompt) {
  const page = await getChatGPTPage();
  const composer = await firstVisible(page, [
    '[data-chatgpt-composer] [role="textbox"][contenteditable="true"]',
    '[role="textbox"][contenteditable="true"]',
    '[aria-label="Ask ChatGPT"]',
    "textarea"
  ]);

  if (!composer) throw new Error("Campo de mensagem não encontrado no ChatGPT.");

  const stopSelectors = [
    'button[data-testid="stop-button"]',
    'button[aria-label*="Stop generating"]',
    'button[aria-label*="Parar"]'
  ];

  if (await firstVisible(page, stopSelectors)) {
    throw new Error("O ChatGPT ainda está gerando uma resposta anterior.");
  }

  const body = page.locator("body");
  const before = await body.innerText().catch(() => "");
  const beforeAssistantCount = await page.locator(
    '[data-message-author-role="assistant"]'
  ).count().catch(() => 0);

  await composer.fill(prompt);

  // O botão de envio da interface atual pode não ter rótulo acessível.
  // Após preencher, o último botão do formulário do compositor é o enviar.
  const form = composer.locator("xpath=ancestor::form[1]");
  const send = form.locator("button").last();

  if (await send.count()) {
    const sendInfo = await send.evaluate(b => ({
      visible: (() => {
        const r = b.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })(),
      disabled: b.disabled,
      aria: b.getAttribute("aria-label"),
      svg: b.querySelector("svg use")?.getAttribute("href") || ""
    }));

    if (sendInfo.visible && !sendInfo.disabled &&
        !/voice|microphone|microfone/i.test(
          (sendInfo.aria || "") + " " + sendInfo.svg
        )) {
      await send.click();
    } else {
      await composer.press("Enter");
    }
  } else {
    await composer.press("Enter");
  }

  const deadline = Date.now() + 180000;
  let lastCandidate = "";
  let stableSince = Date.now();

  while (Date.now() < deadline) {
    await page.waitForTimeout(500);

    const generating = await firstVisible(page, stopSelectors);
    const currentText = await body.innerText().catch(() => "");

    let candidate = "";
    let newResponse = false;

    // Preferir a última mensagem real do assistente quando disponível.
    const messages = page.locator('[data-message-author-role="assistant"]');
    const count = await messages.count().catch(() => 0);

    if (count > beforeAssistantCount && count > 0) {
      candidate = (await messages.nth(count - 1).innerText().catch(() => "")).trim();
      newResponse = candidate.length > 0;
    }

    // Compatibilidade com interfaces que usam marcadores textuais.
    if (!newResponse) {
      const markers = ["ChatGPT said:", "ChatGPT disse:"];
      let markerIndex = -1;
      let markerLength = 0;

      for (const marker of markers) {
        const i = currentText.lastIndexOf(marker);
        if (i > markerIndex) {
          markerIndex = i;
          markerLength = marker.length;
        }
      }

      if (markerIndex >= 0) {
        const tail = currentText.slice(markerIndex + markerLength).trim();
        if (tail && tail !== before.trim()) {
          candidate = tail;
          newResponse = true;
        }
      }
    }

    // Último recurso: considerar apenas o texto acrescentado após o envio.
    if (!newResponse && currentText.startsWith(before)) {
      const appended = currentText.slice(before.length).trim();
      if (appended.length > 10) {
        candidate = appended;
        newResponse = true;
      }
    }

    let validJSON = false;
    if (newResponse && candidate) {
      try {
        extractJSON(candidate);
        validJSON = true;
      } catch {}
    }

    if (candidate !== lastCandidate) {
      lastCandidate = candidate;
      stableSince = Date.now();
    }

    if (generating) stableSince = Date.now();

    if (newResponse && validJSON && !generating &&
        Date.now() - stableSince >= 1800) {
      return candidate;
    }
  }

  console.error("GRID SOUL: tempo esgotado aguardando resposta JSON do ChatGPT.");
  throw new Error("Tempo esgotado aguardando JSON novo do ChatGPT.");
}

function askChatGPTWithExtension(prompt) {
  if (extensionTask) {
    return Promise.reject(new Error('A ponte da extensão já tem um comando pendente.'));
  }

  return new Promise((resolve, reject) => {
    const task = { id: randomUUID(), message: prompt, delivered: false, resolve, reject, timeout: null };
    task.timeout = setTimeout(() => {
      if (extensionTask === task) extensionTask = null;
      reject(new Error('Tempo esgotado aguardando a extensão do Chrome.'));
    }, 180_000);
    extensionTask = task;
  });
}

function requestChatGPT(prompt) {
  return BRIDGE_MODE === 'extension' ? askChatGPTWithExtension(prompt) : askChatGPT(prompt);
}

app.get('/api/memory', (_req, res) => {
  res.json({
    ok: true,
    updatedAt: memory.updatedAt,
    lastCommand: memory.lastCommand,
    lastPlan: memory.lastPlan,
    historyCount: memory.history.length
  });
});

app.post('/api/memory/state', (req, res) => {
  try {
    const plan = sanitizePlan(req.body?.plan);
    rememberVisualState(plan);
    res.json({ ok: true, updatedAt: memory.updatedAt });
  } catch (err) {
    console.error('GRID SOUL memory:', String(err.message || err).slice(0, 200));
    res.status(400).json({ error: 'Estado de memória inválido.' });
  }
});

let extensionPresence = null;
const EXTENSION_HEARTBEAT_TIMEOUT_MS = 90_000;

app.post('/api/extension/heartbeat', (req, res) => {
  if (!req.is('application/json')) return res.status(415).json({ error: 'Envie application/json.' });
  const id = req.body?.id;
  const version = req.body?.version;
  if (typeof id !== 'string' || !/^[a-p]{32}$/.test(id)) {
    return res.status(400).json({ error: 'ID runtime da extensão Chrome inválido.' });
  }
  if (typeof version !== 'string' || !/^\d{1,4}(\.\d{1,4}){0,3}$/.test(version)) {
    return res.status(400).json({ error: 'Versão da extensão inválida.' });
  }
  const originId = req.get('origin')?.match(CHROME_EXTENSION_ORIGIN)?.[1];
  if (originId && originId !== id) return res.status(403).json({ error: 'O ID do heartbeat não corresponde à origem Chrome que o enviou.' });
  extensionPresence = { id, version, lastSeen: new Date().toISOString(), lastSeenAt: Date.now() };
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true });
});

app.get('/api/extension/next', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!extensionTask || extensionTask.delivered) return res.json({});
  res.json({ id: extensionTask.id, message: extensionTask.message });
});

app.post('/api/extension/claim', (req, res) => {
  if (!req.is('application/json')) return res.status(415).json({ error: 'Envie application/json.' });
  const task = extensionTask;
  if (!task || req.body?.id !== task.id) return res.status(404).json({ error: 'Tarefa da extensão não encontrada.' });
  if (task.delivered) return res.status(409).json({ error: 'Tarefa já reivindicada.' });
  task.delivered = true;
  res.json({ ok: true });
});

app.post('/api/extension/result', (req, res) => {
  if (!req.is('application/json')) return res.status(415).json({ error: 'Envie application/json.' });
  const task = extensionTask;
  if (!task || !task.delivered || req.body?.id !== task.id) {
    return res.status(404).json({ error: 'Tarefa da extensão não encontrada.' });
  }
  const result = typeof req.body?.result === 'string' ? req.body.result : '';
  const error = typeof req.body?.error === 'string' ? req.body.error.slice(0, 300) : '';
  if (result.length > 7000) {
    return res.status(413).json({ error: 'Resposta da extensão excede o limite permitido.' });
  }
  extensionTask = null;
  clearTimeout(task.timeout);
  if (error) task.reject(new Error(error));
  else task.resolve(result);
  res.json({ ok: true });
});

app.get("/api/health", (_req, res) => {
  const extensionOnline = Boolean(extensionPresence && Date.now() - extensionPresence.lastSeenAt <= EXTENSION_HEARTBEAT_TIMEOUT_MS);
  res.json({
    ok: true,
    service: "GRID SOUL",
    brain: BRIDGE_MODE === 'extension'
      ? 'ChatGPT via extensão do Chrome'
      : 'ChatGPT via Playwright/CDP no Chrome',
    bridge: BRIDGE_MODE,
    port: PORT,
    browserReady: Boolean(cdpBrowser && cdpBrowser.isConnected()),
    extension: BRIDGE_MODE === 'extension' ? {
      connected: extensionOnline,
      id: extensionPresence?.id || null,
      version: extensionPresence?.version || null,
      lastSeen: extensionPresence?.lastSeen || null
    } : null,
    busy
  });
});

app.post("/api/command", async (req, res) => {
  const message = req.body?.message;
  const currentPopulation = Number(req.body?.population);

  if (typeof message !== "string" || !message.trim() || message.length > 1200) {
    return res.status(400).json({ error: "Informe um comando de até 1200 caracteres." });
  }
  if (busy) {
    return res.status(429).json({ error: "O GRID SOUL já está aguardando outra resposta do ChatGPT." });
  }

  busy = true;
  try {
    const prompt = [
      "Você é o planejador visual do GRID SOUL CYBER OCEAN, um renderer de malhas 3D trianguladas.",
      "Responda SOMENTE com um objeto JSON válido, sem markdown ou texto externo.",
      "Campos: reply, shape, population (orçamento histórico de complexidade, 1000–500000), meshSettings, energy, scale, rotationX, rotationY, rotationZ, moveX, moveY, moveZ, color, parts, paletteMode e focusedAtomicNumber.",
      "shape permitido: shark, heart, skull, sphere, torus, spiral, wave, terrain, cloud, planet, building, bridge, mechanical, face ou custom. Use shark para tubarão, heart para coração, skull para crânio, building para prédio e bridge para ponte.",
      "meshSettings: detail inteiro de 12 a 64 (densidade real da triangulação), color hexadecimal #RRGGBB, intensity de 0.1 a 2.5 e surfaceVisible booleano. Sugira detail maior só se a forma necessitar; o renderer reportará as contagens reais de vértices/triângulos.",
      "Todas as criações são superfícies conectadas de malha triangular indexada, com wireframe visível e superfície sombreada opcional. NÃO planeje cubos, voxels, partículas por vértice, atlas de cubos, grids de células independentes ou malha falsa composta por pontos.",
      "Para shape=face, desenhe uma face procedimental estilizada como superfície triangular conectada; não afirme reproduzir fielmente uma foto ou anatomia validada. geometry.representation=connected_triangle_surface e mesh.connectivity=shared_triangle_indices. lighting e render são declarativos; não afirme bloom ou recursos inexistentes.",
      "Perfil facial opcional: geometry.type=human_face, density de 0.1 a 1, face symmetry/eyeDetail/noseDetail/mouthDetail/surfaceDisplacement, materials base/primary/secondary/accent/highlight, metallic e roughness. Não inclua voxel, cube_atlas, cellShape, grid ou partículas orbitais.",
      "population permanece apenas como campo histórico de orçamento do pedido; não é número de cubos, vértices ou triângulos. Use meshSettings.detail para controlar a densidade real.",
      "energy entre 0 e 1 controla a velocidade de animação; scale entre 0.5 e 8; rotações entre -6.28 e 6.28; movimento entre -10 e 10; color hexadecimal #RRGGBB.",
      "parts deve ser [] exceto para shape custom. Para custom, no máximo 24 partes. Tipos disponíveis: sphere, ellipsoid, torus, cylinder, cone ou box como primitiva volumétrica submetida à mesma extração de uma única superfície triangular; não retorne componentes em voxel/cubos.",
      "Posições entre -4 e 4; dimensões entre 0.05 e 3; rotações entre -6.28 e 6.28.",
      "paletteMode pode ser single, rainbow, plasma, fire, green ou cyan. O catálogo periódico é metadado independente; focusedAtomicNumber deve ser null salvo seleção explícita.",
      `Orçamento visual histórico atual: ${Number.isInteger(currentPopulation) && currentPopulation >= 1000 && currentPopulation <= 500000 ? currentPopulation : 42000}.`,
      "Não produza código executável nem comandos de sistema.",
      "Pedido do usuário: " + message.trim()
    ].join("\n");

    const raw = await requestChatGPT(prompt);
    const plan = sanitizePlan(extractJSON(raw));
    const normalizedMessage = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const densityMatch = normalizedMessage.match(/\b(?:densidade|resolucao)(?:\s+da\s+malha)?\s*(?:de|em|=|:)?\s*(\d{1,2})\b/i);
    const explicitBudget = /\b(?:populacao|orcamento(?:\s+visual)?|complexidade)\b.{0,28}\b(?:\d{3,}|\d+(?:[.,]\d+)?\s*(?:mil|k))\b/i.test(normalizedMessage);
    if (densityMatch) {
      plan.meshSettings = { ...(plan.meshSettings || {}), detail: Math.max(12, Math.min(64, Number(densityMatch[1]))) };
    } else if (explicitBudget) {
      if (plan.geometry && typeof plan.geometry === 'object') plan.geometry.population = plan.population;
    } else if (Number.isInteger(currentPopulation) && currentPopulation >= 1000 && currentPopulation <= 500000) {
      plan.population = currentPopulation;
      if (plan.geometry && typeof plan.geometry === 'object') plan.geometry.population = currentPopulation;
    }
    try {
      rememberSuccessfulCommand(plan);
    } catch (memoryError) {
      console.error("GRID SOUL memory write:", String(memoryError.message || memoryError).slice(0, 200));
    }
    res.json(plan);
  } catch (err) {
    console.error(BRIDGE_MODE === 'extension' ? 'ChatGPT extension bridge:' : 'ChatGPT CDP bridge:', String(err.message || err).slice(0, 500));
    res.status(502).json({
      error: String(err.message || "Não foi possível obter um plano válido do ChatGPT.").slice(0, 300)
    });
  } finally {
    busy = false;
  }
});

const ENGINEERING_SESSION_COOKIE = 'grid_soul_engineering_session';
const ENGINEERING_CONSENT_TTL_MS = 2 * 60 * 1000;
const engineeringConsentTokens = new Map();

function getEngineeringSession(req, res) {
  const existing = (req.get('cookie') || '').split(';')
    .map(part => part.trim().split('='))
    .find(([name]) => name === ENGINEERING_SESSION_COOKIE)?.[1];
  if (typeof existing === 'string' && /^[A-Za-z0-9_-]{40,60}$/.test(existing)) return existing;
  const session = randomBytes(32).toString('base64url');
  res.append('Set-Cookie', `${ENGINEERING_SESSION_COOKIE}=${session}; Path=/api/engineering; HttpOnly; SameSite=Strict; Max-Age=900`);
  return session;
}

function engineeringRequestGate(req, res, next) {
  const host = req.get('host') || '';
  const origin = req.get('origin');
  const fetchSite = req.get('sec-fetch-site');
  const allowedHosts = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
  if (!allowedHosts.has(host) || (origin && origin !== `http://${host}`) || (fetchSite && fetchSite !== 'same-origin')) {
    return res.status(403).json({ error: 'Engenharia disponível somente pela interface local do GRID SOUL.' });
  }
  req.engineeringSession = getEngineeringSession(req, res);
  res.set('Cache-Control', 'no-store');
  next();
}

function isExplicitEngineeringBrowserRequest(req) {
  const host = req.get('host') || '';
  return req.get('origin') === `http://${host}` && req.get('sec-fetch-site') === 'same-origin';
}

function validateEngineeringInput(body) {
  const description = body?.description;
  if (typeof description !== 'string' || !description.trim() || description.length > 1200) {
    throw new Error('Descreva o projeto em até 1.200 caracteres.');
  }
  const intendedUse = body?.intendedUse ?? 'prototype';
  if (!['prototype', 'decorative', 'food-contact'].includes(intendedUse)) {
    throw new Error('Finalidade de uso inválida.');
  }
  const parameters = body?.parameters ?? {};
  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
    throw new Error('Os parâmetros dimensionais devem ser um objeto JSON.');
  }
  return { description, intendedUse, parameters };
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function engineeringPayloadDigest(input) {
  return createHash('sha256').update(canonicalJson(input)).digest('hex');
}

app.get('/api/engineering/materials', engineeringRequestGate, (_req, res) => {
  res.json({ verifiedOn: MATERIAL_CATALOG_VERIFIED_ON, materials: GRID_SOUL_MATERIALS });
});

app.post('/api/engineering/consent', engineeringRequestGate, (req, res) => {
  if (!req.is('application/json')) return res.status(415).json({ error: 'O consentimento requer JSON da interface local.' });
  if (!isExplicitEngineeringBrowserRequest(req)) {
    return res.status(403).json({ error: 'Confirme o envio pela interface local do GRID SOUL.' });
  }
  let input;
  try { input = validateEngineeringInput(req.body); }
  catch (error) { return res.status(400).json({ error: String(error.message || 'Dados de projeto inválidos.').slice(0, 300) }); }

  const now = Date.now();
  for (const [token, record] of engineeringConsentTokens) {
    if (record.expiresAt <= now) engineeringConsentTokens.delete(token);
  }
  if (engineeringConsentTokens.size >= 256) return res.status(429).json({ error: 'Há muitas confirmações aguardando; tente novamente em instantes.' });
  const consentToken = randomBytes(32).toString('base64url');
  const expiresAt = now + ENGINEERING_CONSENT_TTL_MS;
  engineeringConsentTokens.set(consentToken, {
    session: req.engineeringSession,
    payloadDigest: engineeringPayloadDigest(input),
    expiresAt
  });
  return res.status(201).json({ consentToken, expiresAt: new Date(expiresAt).toISOString() });
});

app.post('/api/engineering/analyze', engineeringRequestGate, async (req, res) => {
  if (!req.is('application/json')) return res.status(415).json({ error: 'A análise requer JSON enviado pela interface local.' });
  let input;
  try { input = validateEngineeringInput(req.body); }
  catch (error) { return res.status(400).json({ error: String(error.message || 'Dados de projeto inválidos.').slice(0, 300) }); }
  const { description, intendedUse, parameters } = input;
  const useAI = req.body?.useAI === true;

  if (!useAI) {
    try { return res.json({ ok: true, result: analyzeForkLocally(description, parameters, intendedUse) }); }
    catch (error) { return res.status(400).json({ error: String(error.message || 'Parâmetros inválidos.').slice(0, 300) }); }
  }
  if (!isExplicitEngineeringBrowserRequest(req)) {
    return res.status(403).json({ error: 'A análise externa exige uma confirmação iniciada pela interface local.' });
  }
  if (busy) return res.status(429).json({ error: 'A ponte de IA já está processando outra solicitação.' });

  const consentToken = req.body?.consentToken;
  const consent = typeof consentToken === 'string' ? engineeringConsentTokens.get(consentToken) : null;
  if (typeof consentToken === 'string') engineeringConsentTokens.delete(consentToken);
  if (!consent || consent.expiresAt <= Date.now() || consent.session !== req.engineeringSession
      || consent.payloadDigest !== engineeringPayloadDigest(input)) {
    return res.status(403).json({ error: 'A confirmação está ausente, expirada ou não corresponde à descrição/parâmetros. Confirme novamente na interface.' });
  }

  busy = true;
  try {
    const prompt = buildEngineeringPrompt(description, parameters, intendedUse);
    const raw = await requestChatGPT(prompt);
    const proposal = sanitizeEngineeringProposal(extractJSON(raw), { description, currentParameters: parameters, intendedUse });
    return res.json({ ok: true, result: proposal });
  } catch (error) {
    console.error('GRID SOUL engineering assistant:', String(error.message || error).slice(0, 300));
    return res.status(502).json({ error: String(error.message || 'Não foi possível obter uma proposta técnica.').slice(0, 300) });
  } finally {
    busy = false;
  }
});

app.use('/vendor/three', express.static(path.join(ROOT, 'node_modules', 'three'), {
  immutable: true, maxAge: '1y', fallthrough: false
}));
app.use(express.static(path.join(ROOT, 'public')));

app.listen(PORT, '127.0.0.1', () => {
  console.log(`GRID SOUL: http://127.0.0.1:${PORT}`);
  console.log(BRIDGE_MODE === 'extension'
    ? 'Cérebro: ChatGPT via extensão carregada no navegador.'
    : 'Cérebro: ChatGPT via Playwright/CDP em 127.0.0.1:9222.');
});
