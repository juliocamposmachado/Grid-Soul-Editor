const MIN_PARTICLES = 1_000;
const MAX_PARTICLES = 500_000;
const MIN_SCALE = 0.5;
const MAX_SCALE = 8;

const FORM_PRESETS = Object.freeze({
  shark: Object.freeze({ population: 82_000, energy: 0.18, scale: 2.35 }),
  heart: Object.freeze({ population: 70_000, energy: 0.14, scale: 2.1 }),
  skull: Object.freeze({ population: 78_000, energy: 0.12, scale: 2.25 }),
  building: Object.freeze({ population: 52_000, energy: 0.12, scale: 2.2 }),
  bridge: Object.freeze({ population: 46_000, energy: 0.14, scale: 2.15 }),
  mechanical: Object.freeze({ population: 66_000, energy: 0.16, scale: 2.0 }),
  planet: Object.freeze({ population: 42_000, energy: 0.12, scale: 1.95 }),
  sphere: Object.freeze({ population: 42_000, energy: 0.14, scale: 1.9 }),
  torus: Object.freeze({ population: 30_000, energy: 0.15, scale: 1.8 }),
  spiral: Object.freeze({ population: 24_000, energy: 0.2, scale: 1.65 }),
  wave: Object.freeze({ population: 32_000, energy: 0.14, scale: 1.85 }),
  terrain: Object.freeze({ population: 34_000, energy: 0.16, scale: 1.8 }),
  cloud: Object.freeze({ population: 18_000, energy: 0.18, scale: 1.8 }),
  face: Object.freeze({ population: 54_000, energy: 0.12, scale: 2.25 }),
  custom: Object.freeze({ population: 30_000, energy: 0.16, scale: 1.8 })
});

const DEVICE_FACTORS = Object.freeze({ low: 0.5, balanced: 0.78, high: 1 });
const DEVICE_LABELS = Object.freeze({ low: 'baixo', balanced: 'equilibrado', high: 'alto' });

function clamp(value, minimum, maximum, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback;
}

function normalizePrompt(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseLocalizedNumber(value) {
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function detectDeviceTier({ deviceMemory, hardwareConcurrency } = {}) {
  const memory = Number(deviceMemory);
  const cores = Number(hardwareConcurrency);
  if ((Number.isFinite(memory) && memory > 0 && memory <= 2)
    || (Number.isFinite(cores) && cores > 0 && cores <= 2)) return 'low';
  if ((Number.isFinite(memory) && memory >= 8)
    || (Number.isFinite(cores) && cores >= 12)) return 'high';
  return 'balanced';
}

export function readExplicitVisualOverrides(prompt) {
  const normalized = normalizePrompt(prompt);
  const overrides = { population: null, meshDetail: null, energy: null, scale: null };

  const densityMatch = normalized.match(/\b(?:densidade|resolucao)(?:\s+da\s+malha)?\s*(?:de|em|=|:)?\s*(\d{1,2})\b/);
  if (densityMatch) {
    const detail = Number(densityMatch[1]);
    if (detail >= 12 && detail <= 64) overrides.meshDetail = detail;
  }

  const countWithThousands = normalized.match(/\b(\d+(?:[.,]\d+)?|\d{1,3}(?:[.,\s]\d{3})+)\s*(mil|k)\s*(?:triangulos|vertices|malha|micro\s*cubos|microcubos|particulas|cubos)\b/);
  const countWithParticles = normalized.match(/\b(\d{1,3}(?:[.,\s]\d{3})+|\d+)\s*(?:triangulos|vertices|malha|micro\s*cubos|microcubos|particulas|cubos)\b/);
  const labeledCount = normalized.match(/\b(?:orcamento(?:\s+de\s+malha)?|populacao|quantidade)\s*(?:de|=|:)?\s*(\d+(?:[.,]\d+)?|\d{1,3}(?:[.,\s]\d{3})+)\s*(mil|k)?\b/);
  const populationMatch = countWithThousands || countWithParticles || labeledCount;
  if (populationMatch) {
    const quantityText = populationMatch[1].trim();
    const unit = countWithThousands || populationMatch === labeledCount ? populationMatch[2]?.trim() : null;
    const quantity = unit ? parseLocalizedNumber(quantityText) : Number(quantityText.replace(/[.,\s]/g, ''));
    const population = Math.round(quantity * (unit ? 1_000 : 1));
    if (Number.isSafeInteger(population) && population > 0) overrides.population = population;
  }

  const energyMatch = normalized.match(/\benergia(?:\s+coletiva)?\s*(?:de|em|=|:)?\s*(\d+(?:[.,]\d+)?)(\s*%)?/);
  if (energyMatch) {
    let energy = parseLocalizedNumber(energyMatch[1]);
    if (energyMatch[2]?.includes('%')) energy /= 100;
    if (Number.isFinite(energy) && energy >= 0 && energy <= 1) overrides.energy = energy;
    else if (Number.isFinite(energy) && energy > 1 && energy <= 100 && energyMatch[2]?.includes('%')) overrides.energy = energy / 100;
  }

  const scaleMatch = normalized.match(/\b(?:escala(?:\s+visual)?|tamanho\s+visual)\s*(?:de|em|=|:)?\s*(\d+(?:[.,]\d+)?)/);
  if (scaleMatch) {
    const scale = parseLocalizedNumber(scaleMatch[1]);
    if (Number.isFinite(scale) && scale > 0) overrides.scale = scale;
  }

  return overrides;
}

export function calibrateVisual({
  shape = 'cloud',
  prompt = '',
  population = 2_000,
  energy = 0.6,
  scale = 2,
  automatic = true,
  deviceMemory,
  hardwareConcurrency,
  maxParticles = MAX_PARTICLES
} = {}) {
  const selectedShape = Object.hasOwn(FORM_PRESETS, shape) ? shape : 'cloud';
  const preset = FORM_PRESETS[selectedShape];
  const safeMaximum = Math.round(clamp(maxParticles, MIN_PARTICLES, MAX_PARTICLES, MAX_PARTICLES));
  const deviceTier = detectDeviceTier({ deviceMemory, hardwareConcurrency });

  if (!automatic) {
    return {
      shape: selectedShape,
      automatic: false,
      deviceTier,
      population: Math.round(clamp(population, MIN_PARTICLES, safeMaximum, preset.population)),
      energy: clamp(energy, 0, 1, preset.energy),
      scale: clamp(scale, MIN_SCALE, MAX_SCALE, preset.scale),
      overrides: { population: null, energy: null, scale: null },
      summary: 'Modo manual: os valores dos controles foram preservados.'
    };
  }

  const overrides = readExplicitVisualOverrides(prompt);
  const normalized = normalizePrompt(prompt);
  const deviceFactor = DEVICE_FACTORS[deviceTier];
  const calibratedPopulation = Math.round((preset.population * deviceFactor) / 1_000) * 1_000;
  const asksForEnergyBehavior = /\benergia\b|\bmovimento\b|\bdinam\w*\b|\bvibr\w*\b|\bcalm\w*\b|\bestat\w*\b/.test(normalized);
  const asksForSizeIntent = /\b(grande|gigante|menor|pequen\w*|aument\w*|ampli\w*|reduz\w*|dimin\w*|zoom)\b/.test(normalized);

  const clampedPopulation = clamp(
    overrides.population ?? calibratedPopulation,
    MIN_PARTICLES,
    safeMaximum,
    calibratedPopulation
  );
  const finalPopulation = overrides.population !== null
    ? Math.round(clampedPopulation)
    : Math.round(clampedPopulation / 1_000) * 1_000;
  const finalEnergy = overrides.energy !== null
    ? clamp(overrides.energy, 0, 1, preset.energy)
    : asksForEnergyBehavior ? clamp(energy, 0, 1, preset.energy) : preset.energy;
  const finalScale = overrides.scale !== null
    ? clamp(overrides.scale, MIN_SCALE, MAX_SCALE, preset.scale)
    : asksForSizeIntent ? clamp(scale, MIN_SCALE, MAX_SCALE, preset.scale) : preset.scale;

  const sources = [
    overrides.population !== null ? 'orçamento visual explícito' : `complexidade sugerida para ${selectedShape}`,
    overrides.energy !== null ? 'energia solicitada' : asksForEnergyBehavior ? 'energia interpretada do pedido' : 'energia reduzida para estabilizar a forma',
    overrides.scale !== null ? 'escala solicitada' : asksForSizeIntent ? 'escala interpretada do pedido' : 'escala de enquadramento para a forma'
  ];

  return {
    shape: selectedShape,
    automatic: true,
    deviceTier,
    population: finalPopulation,
    energy: finalEnergy,
    scale: finalScale,
    overrides,
    summary: `Auto (${DEVICE_LABELS[deviceTier]}): orçamento visual ${finalPopulation.toLocaleString('pt-BR')}, animação ${finalEnergy.toFixed(2)}, escala ${finalScale.toFixed(2)}×; ${sources.join(' · ')}. O HUD mede os triângulos reais; esta estimativa não é benchmark de FPS.`
  };
}

export function computeFrameDistance(size, { verticalFovDegrees = 50, aspect = 1, padding = 1.2 } = {}) {
  const width = Math.max(0, Number(size?.x) || 0);
  const height = Math.max(0, Number(size?.y) || 0);
  const depth = Math.max(0, Number(size?.z) || 0);
  const radius = Math.max(0.15, Math.sqrt(width ** 2 + height ** 2 + depth ** 2) / 2);
  const verticalFov = clamp(verticalFovDegrees, 10, 120, 50) * Math.PI / 180;
  const safeAspect = clamp(aspect, 0.2, 5, 1);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * safeAspect);
  const safePadding = clamp(padding, 1, 2.5, 1.2);
  const verticalFit = height / (2 * Math.tan(verticalFov / 2)) + depth / 2;
  const horizontalFit = width / (2 * Math.tan(horizontalFov / 2)) + depth / 2;
  const distance = clamp(Math.max(verticalFit, horizontalFit) * safePadding, 0.7, 120, 10);
  return { radius, distance };
}

export const GRID_SOUL_VISUAL_PRESETS = FORM_PRESETS;
