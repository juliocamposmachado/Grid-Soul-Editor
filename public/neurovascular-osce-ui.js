import {
  NEUROVASCULAR_OSCE_SOURCES,
  NEUROVASCULAR_OSCE_STATIONS,
  calculateOsceScore,
  normalizeRubricOverrides
} from '/neurovascular-osce.js';

const panel = document.querySelector('#oscePanel');
const toggle = document.querySelector('#osceToggle');
const closeButton = document.querySelector('#osceClose');
const forgePanel = document.querySelector('#forgePanel');
const forgeToggle = document.querySelector('#forgeToggle');
const automationPanel = document.querySelector('#automationPanel');
const automationToggle = document.querySelector('#automationToggle');
const nav = document.querySelector('#osceStationNav');
const content = document.querySelector('#osceStationContent');
const progress = document.querySelector('#osceProgress');
const progressText = document.querySelector('#osceProgressText');
const announcement = document.querySelector('#osceAnnouncement');
const teacherToggle = document.querySelector('#osceTeacherToggle');

const STORAGE_KEY = 'gridsoul.neurovascular.osce-rubrics.v1';
const defaultOverrides = Object.fromEntries(
  NEUROVASCULAR_OSCE_STATIONS.map(station => [station.id, station.rubric])
);
let rubricOverrides = loadRubricOverrides();
let teacherMode = false;
let activeStationId = NEUROVASCULAR_OSCE_STATIONS[0].id;
let timerInterval = null;
let secondsRemaining = null;
let returnFocusElement = null;
let inertSnapshot = [];
let attempts = Object.fromEntries(NEUROVASCULAR_OSCE_STATIONS.map(station => [station.id, {
  started: false,
  submitted: false,
  answer: '',
  ratings: {},
  score: null,
  secondsRemaining: null
}]));

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function loadRubricOverrides() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return { ...defaultOverrides, ...normalizeRubricOverrides(saved) };
  } catch {
    return defaultOverrides;
  }
}

function activeStation() {
  return NEUROVASCULAR_OSCE_STATIONS.find(station => station.id === activeStationId);
}

function activeRubric() {
  return rubricOverrides[activeStationId] || activeStation().rubric;
}

function currentAttempt() {
  return attempts[activeStationId];
}

function stopTimer() {
  if (timerInterval !== null) window.clearInterval(timerInterval);
  timerInterval = null;
}

function pauseCurrentTimer() {
  if (timerInterval !== null && secondsRemaining !== null) {
    currentAttempt().secondsRemaining = secondsRemaining;
  }
  stopTimer();
}

function setBackgroundInert(active) {
  if (active) {
    const targets = [document.querySelector('header'), document.querySelector('main')].filter(Boolean);
    inertSnapshot = targets.map(element => ({ element, inert: element.inert }));
    for (const { element } of inertSnapshot) element.inert = true;
    return;
  }
  for (const { element, inert } of inertSnapshot) element.inert = inert;
  inertSnapshot = [];
}

function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function updateTimerLabel() {
  const label = document.querySelector('#osceTimerDisplay');
  if (label) label.textContent = formatTime(secondsRemaining);
}

function countCompleted() {
  return NEUROVASCULAR_OSCE_STATIONS.filter(station => attempts[station.id].score !== null).length;
}

function updateProgress() {
  const completed = countCompleted();
  const total = NEUROVASCULAR_OSCE_STATIONS.length;
  progress.value = completed;
  progress.max = total;
  progressText.textContent = `${completed} de ${total} autoavaliações concluídas`;
}

function renderSources(station) {
  const sources = NEUROVASCULAR_OSCE_SOURCES.filter(source => station.sourceIds.includes(source.id));
  return `<section class="osce-sources" aria-label="Fontes de estudo"><h4>FONTES E LEITURA</h4><ul>${sources.map(source => `
    <li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)}</a><span>${escapeHtml(source.note)}</span></li>`).join('')}
  </ul></section>`;
}

function renderRubric(station, attempt) {
  const criteria = activeRubric();
  return `<section class="osce-rubric" aria-labelledby="osceRubricHeading">
    <h4 id="osceRubricHeading">RUBRICA · VISÍVEL ANTES DA ESTAÇÃO</h4>
    <p class="osce-muted">Após responder, autoavalie cada critério: 0 = não demonstrado; 1 = parcial; 2 = demonstrado. É feedback formativo, não nota de competência clínica.</p>
    <div class="osce-rubric-list">${criteria.map((criterion, index) => {
      const selected = attempt.ratings[criterion.id];
      return `<fieldset class="osce-criterion"><legend>${index + 1}. ${escapeHtml(criterion.label)}</legend>
        <p>${escapeHtml(criterion.detail)}</p>
        <div class="osce-rating" role="radiogroup" aria-label="Autoavaliação: ${escapeHtml(criterion.label)}">
          ${[[0, 'Não demonstrado'], [1, 'Parcial'], [2, 'Demonstrado']].map(([value, label]) => `
            <label><input type="radio" name="rating-${escapeHtml(criterion.id)}" value="${value}" data-rating="${escapeHtml(criterion.id)}" ${selected === value ? 'checked' : ''} ${attempt.submitted ? '' : 'disabled'}><span>${value} · ${label}</span></label>`).join('')}
        </div>
      </fieldset>`;
    }).join('')}</div>
    <div id="osceScoreSummary">${renderScoreSummary(attempt.score)}</div>
  </section>`;
}

function renderScoreSummary(score) {
  if (!score) return '';
  return `<div class="osce-score" role="status"><strong>Autoavaliação: ${score.earned}/${score.maximum} pontos (${score.percent}%)</strong><span>Use os critérios como guia para revisar e tentar novamente, não como classificação clínica.</span></div>`;
}

function renderTeacherEditor(station) {
  if (!teacherMode) return '';
  const criteria = activeRubric();
  return `<details class="osce-teacher" open><summary>EDIÇÃO LOCAL DA RUBRICA · ${escapeHtml(station.title)}</summary>
    <p class="osce-muted">A edição fica apenas neste navegador e não tem autenticação. Não use em dispositivo compartilhado para conteúdo confidencial. Revise alterações com docentes antes de uso oficial.</p>
    <div id="osceTeacherEditor">${criteria.map(criterion => `<fieldset class="osce-edit-item">
      <label>Critério<input type="text" maxlength="140" data-rubric-label="${escapeHtml(criterion.id)}" value="${escapeHtml(criterion.label)}"></label>
      <label>Descrição<textarea rows="2" maxlength="240" data-rubric-detail="${escapeHtml(criterion.id)}">${escapeHtml(criterion.detail)}</textarea></label>
    </fieldset>`).join('')}</div>
    <div class="osce-actions"><button type="button" data-action="save-rubric">Salvar cópia local</button><button type="button" class="osce-secondary" data-action="reset-rubric">Restaurar rubrica original</button></div>
  </details>`;
}

function renderStationDiagram(station) {
  if (station.id !== 'autoregulation') return '';
  return `<figure class="osce-chart" aria-labelledby="osceChartCaption">
    <svg viewBox="0 0 520 230" role="img" aria-label="Curva didática: o fluxo cerebral relativo permanece aproximadamente estável numa região intermediária de pressão de perfusão e pode variar fora dela. Sem escala ou limiares numéricos.">
      <path class="osce-chart-axis" d="M64 24V184H492" />
      <path class="osce-chart-guide" d="M64 88H492" />
      <path class="osce-chart-curve" d="M76 150 C112 137 139 103 183 91 C231 79 324 78 366 85 C414 93 444 121 480 145" />
      <text x="20" y="42" transform="rotate(-90 20 42)">Fluxo cerebral relativo</text>
      <text x="222" y="216">Pressão de perfusão · qualitativa</text>
      <text x="206" y="68">Regulação relativa</text>
    </svg>
    <figcaption id="osceChartCaption">Esquema conceitual sem unidades, valores ou faixa de referência. Não representa medidas, alvo ou limite clínico de uma pessoa.</figcaption>
  </figure>`;
}

function renderStation() {
  const station = activeStation();
  const attempt = currentAttempt();
  const remaining = secondsRemaining ?? attempt.secondsRemaining ?? Number(document.querySelector('#osceDuration')?.value || 5) * 60;
  const sources = renderSources(station);
  const rubric = renderRubric(station, attempt);
  const editor = renderTeacherEditor(station);
  const attemptControl = attempt.submitted
    ? `<div class="osce-answer"><h4>SUA RESPOSTA · SOMENTE NESTA SESSÃO</h4><p>${escapeHtml(attempt.answer)}</p></div>
       <section class="osce-model" aria-labelledby="osceModelHeading"><h4 id="osceModelHeading">FEEDBACK · PONTOS-CHAVE PARA REVISÃO</h4><p>${escapeHtml(station.modelAnswer)}</p></section>`
    : attempt.started
      ? `<div class="osce-timer" role="timer" aria-live="off"><span>Tempo da estação</span><strong id="osceTimerDisplay">${formatTime(remaining)}</strong></div>
         <label class="osce-label" for="osceAnswer">Sua resposta</label><textarea id="osceAnswer" rows="6" maxlength="3000" placeholder="Escreva sua explicação. Ela não será enviada à IA nem salva em arquivo.">${escapeHtml(attempt.answer)}</textarea>
         ${timerInterval === null && remaining > 0 ? '<button type="button" class="osce-secondary" data-action="resume-timer">Retomar cronômetro</button>' : ''}
         <div class="osce-actions"><button type="button" data-action="finish-station">Finalizar resposta e ver modelo</button><button type="button" class="osce-secondary" data-action="clear-answer">Limpar resposta</button></div>
         <p class="osce-muted">Ao finalizar, a resposta permanece apenas em memória no navegador até recarregar ou fechar a página; trocar de estação não apaga esta tentativa da sessão atual.</p>`
      : `<label class="osce-label" for="osceDuration">Tempo sugerido</label><select id="osceDuration"><option value="3">3 minutos</option><option value="5" selected>5 minutos</option><option value="8">8 minutos</option></select>
         <button class="osce-start" type="button" data-action="start-station">Iniciar estação</button>`;

  content.innerHTML = `<article class="osce-station-card">
    <span class="osce-kicker">ESTAÇÃO ${escapeHtml(station.number)} · ${escapeHtml(station.durationLabel)}</span>
    <h3>${escapeHtml(station.title)}</h3>
    <div class="osce-objective"><strong>OBJETIVO</strong><p>${escapeHtml(station.objective)}</p></div>
    <div class="osce-case"><strong>CENÁRIO FICTÍCIO</strong><p>${escapeHtml(station.scenario)}</p></div>
    ${renderStationDiagram(station)}
    <div class="osce-task"><strong>SUA TAREFA</strong><p>${escapeHtml(station.task)}</p></div>
    ${rubric}${attemptControl}${sources}${editor}
  </article>`;
  updateProgress();
}

function renderNavigation() {
  nav.innerHTML = NEUROVASCULAR_OSCE_STATIONS.map(station => {
    const active = station.id === activeStationId;
    const complete = attempts[station.id].score !== null;
    return `<button type="button" class="osce-nav-button${active ? ' is-active' : ''}" data-station="${escapeHtml(station.id)}" aria-pressed="${active}">
      <span>${escapeHtml(station.number)}</span><strong>${escapeHtml(station.title)}</strong><small>${complete ? 'Autoavaliação registrada nesta sessão' : 'Ainda não avaliada'}</small>
    </button>`;
  }).join('');
  updateProgress();
}

function render() {
  renderNavigation();
  renderStation();
  teacherToggle.setAttribute('aria-pressed', String(teacherMode));
  teacherToggle.textContent = teacherMode ? 'Sair do modo docente local' : 'Editar rubricas · modo docente local';
}

function openPanel() {
  returnFocusElement = document.activeElement;
  document.dispatchEvent(new CustomEvent('gridsoul:panel-open', { detail: { owner: 'osce' } }));
  if (forgePanel) forgePanel.hidden = true;
  if (forgeToggle) forgeToggle.setAttribute('aria-expanded', 'false');
  if (automationPanel) automationPanel.hidden = true;
  if (automationToggle) automationToggle.setAttribute('aria-expanded', 'false');
  panel.hidden = false;
  toggle.setAttribute('aria-expanded', 'true');
  setBackgroundInert(true);
  render();
  document.querySelector('#osceStationNav button')?.focus();
}

function closePanel({ restoreFocus = true } = {}) {
  pauseCurrentTimer();
  panel.hidden = true;
  toggle.setAttribute('aria-expanded', 'false');
  setBackgroundInert(false);
  const target = returnFocusElement;
  returnFocusElement = null;
  if (restoreFocus && target instanceof HTMLElement && document.contains(target)) target.focus();
}

function announce(message) {
  announcement.textContent = message;
}

function startStation() {
  const attempt = currentAttempt();
  if (attempt.submitted) return;
  attempt.started = true;
  const duration = Number(document.querySelector('#osceDuration')?.value || 5);
  if (!Number.isFinite(attempt.secondsRemaining) || attempt.secondsRemaining <= 0) attempt.secondsRemaining = duration * 60;
  secondsRemaining = attempt.secondsRemaining;
  if (timerInterval === null) {
    timerInterval = window.setInterval(() => {
      secondsRemaining = Math.max(0, secondsRemaining - 1);
      attempt.secondsRemaining = secondsRemaining;
      updateTimerLabel();
      if (secondsRemaining === 0) {
        stopTimer();
        announce('Tempo da estação encerrado. Você ainda pode finalizar ou revisar sua resposta.');
      }
    }, 1000);
  }
  render();
  document.querySelector('#osceAnswer')?.focus();
  announce(`Estação ${activeStation().number} iniciada. O cronômetro é apenas uma referência de treino.`);
}

function finishStation() {
  const answer = document.querySelector('#osceAnswer')?.value.trim() || '';
  if (!answer) {
    announce('Escreva sua resposta antes de finalizar a estação.');
    document.querySelector('#osceAnswer')?.focus();
    return;
  }
  stopTimer();
  const attempt = currentAttempt();
  attempt.answer = answer;
  attempt.submitted = true;
  attempt.secondsRemaining = 0;
  secondsRemaining = null;
  render();
  document.querySelector('.osce-rubric')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  announce('Resposta finalizada. Compare com os pontos-chave e faça a autoavaliação da rubrica.');
}

function updateRating(criterionId, value) {
  const attempt = currentAttempt();
  attempt.ratings[criterionId] = Number(value);
  attempt.score = calculateOsceScore(activeRubric(), attempt.ratings);
  const scoreSummary = document.querySelector('#osceScoreSummary');
  if (scoreSummary) scoreSummary.innerHTML = renderScoreSummary(attempt.score);
  updateProgress();
  const activeNavStatus = nav.querySelector('[aria-pressed="true"] small');
  if (activeNavStatus && attempt.score) activeNavStatus.textContent = 'Autoavaliação registrada nesta sessão';
  const score = attempt.score;
  if (score) announce(`Autoavaliação registrada: ${score.earned} de ${score.maximum} pontos. É feedback formativo.`);
}

function saveRubric() {
  const station = activeStation();
  const edited = activeRubric().map(criterion => {
    const label = document.querySelector(`[data-rubric-label="${CSS.escape(criterion.id)}"]`)?.value;
    const detail = document.querySelector(`[data-rubric-detail="${CSS.escape(criterion.id)}"]`)?.value;
    return { id: criterion.id, label, detail };
  });
  const candidate = normalizeRubricOverrides({ [station.id]: edited }, [station]);
  if (!candidate[station.id]) {
    announce('Rubrica inválida; a versão anterior foi mantida.');
    return;
  }
  const next = { ...rubricOverrides, [station.id]: candidate[station.id] };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    rubricOverrides = next;
    attempts[station.id].ratings = {};
    attempts[station.id].score = null;
    render();
    announce('Cópia local da rubrica salva neste navegador. O conteúdo não foi enviado.');
  } catch {
    announce('Não foi possível salvar neste navegador; a rubrica anterior permanece ativa.');
  }
}

function resetRubric() {
  const station = activeStation();
  const next = { ...rubricOverrides, [station.id]: station.rubric };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    rubricOverrides = next;
    attempts[station.id].ratings = {};
    attempts[station.id].score = null;
    render();
    announce('Rubrica original restaurada para esta estação.');
  } catch {
    announce('Não foi possível atualizar o armazenamento local do navegador.');
  }
}

nav.addEventListener('click', event => {
  const button = event.target.closest('[data-station]');
  if (!button) return;
  pauseCurrentTimer();
  activeStationId = button.dataset.station;
  secondsRemaining = attempts[activeStationId].secondsRemaining;
  render();
  document.querySelector('#osceStationNav button[aria-pressed="true"]')?.focus();
});

content.addEventListener('input', event => {
  if (event.target.id === 'osceAnswer') currentAttempt().answer = event.target.value;
});

content.addEventListener('change', event => {
  const ratingId = event.target.dataset.rating;
  if (ratingId) updateRating(ratingId, event.target.value);
});

content.addEventListener('click', event => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'start-station') startStation();
  else if (action === 'resume-timer') startStation();
  else if (action === 'finish-station') finishStation();
  else if (action === 'clear-answer') {
    currentAttempt().answer = '';
    render();
    document.querySelector('#osceAnswer')?.focus();
    announce('Resposta apagada desta sessão.');
  } else if (action === 'save-rubric') saveRubric();
  else if (action === 'reset-rubric') resetRubric();
});

toggle.addEventListener('click', () => panel.hidden ? openPanel() : closePanel());
closeButton.addEventListener('click', closePanel);
document.addEventListener('gridsoul:panel-open', event => {
  if (event.detail?.owner !== 'osce' && !panel.hidden) closePanel({ restoreFocus: false });
});
teacherToggle.addEventListener('click', () => {
  teacherMode = !teacherMode;
  render();
  announce(teacherMode ? 'Modo de edição local ativado. As rubricas podem ser revistas no navegador.' : 'Modo de edição local encerrado.');
});

document.addEventListener('keydown', event => {
  if (panel.hidden) return;
  if (event.key === 'Escape') {
    closePanel();
    return;
  }
  if (event.key !== 'Tab') return;
  const focusable = [...panel.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),summary,[tabindex]:not([tabindex="-1"])')]
    .filter(element => !element.closest('[hidden]') && element.getClientRects().length > 0);
  if (!focusable.length) {
    event.preventDefault();
    panel.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
    event.preventDefault();
    first.focus();
  }
});

updateProgress();
