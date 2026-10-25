import { TransformControls } from 'three/addons/controls/TransformControls.js';

const MAX_OBJECTS = 100;
const MAX_PROJECT_BYTES = 1024 * 1024;
const GEOMETRIES = new Set(['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane', 'icosahedron']);
const LIGHTS = new Set(['point-light']);
const MAIN_SHAPES = new Set(['shark', 'heart', 'skull', 'sphere', 'torus', 'spiral', 'wave', 'terrain', 'cloud', 'face', 'planet', 'building', 'bridge', 'mechanical', 'custom']);
const CUSTOM_PARTS = new Set(['sphere', 'ellipsoid', 'torus', 'cylinder', 'cone', 'box']);
const clamp = (n, min, max, fallback) => Number.isFinite(Number(n)) ? Math.max(min, Math.min(max, Number(n))) : fallback;

function makeGeometry(THREE, kind) {
  switch (kind) {
    case 'box': return new THREE.BoxGeometry(1, 1, 1);
    case 'sphere': return new THREE.SphereGeometry(0.65, 32, 20);
    case 'cylinder': return new THREE.CylinderGeometry(0.55, 0.55, 1.2, 32);
    case 'cone': return new THREE.ConeGeometry(0.65, 1.3, 32);
    case 'torus': return new THREE.TorusGeometry(0.55, 0.18, 12, 40);
    case 'plane': return new THREE.PlaneGeometry(1.4, 1.4, 12, 12);
    case 'icosahedron': return new THREE.IcosahedronGeometry(0.7, 1);
    default: throw new Error('Geometria não permitida no editor.');
  }
}

function disposeObject(object) {
  object.traverse(child => {
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) child.material.forEach(material => material.dispose());
    else child.material?.dispose?.();
  });
}

export function validateSceneProject(input) {
  if (!input || typeof input !== 'object' || input.version !== 1 || !Array.isArray(input.objects)) {
    throw new Error('Arquivo de projeto inválido ou versão não suportada.');
  }
  if (input.objects.length > MAX_OBJECTS) throw new Error(`O limite é ${MAX_OBJECTS} objetos editáveis.`);
  const vector = (value, min, max, fallback) => [0, 1, 2].map(i => clamp(value?.[i], min, max, fallback));
  let mainModel;
  if (input.mainModel !== undefined) {
    const model = input.mainModel;
    if (!model || !MAIN_SHAPES.has(model.shape)) throw new Error('Modelo principal não permitido no projeto.');
    mainModel = {
      shape: model.shape,
      detail: Math.round(clamp(model.detail, 12, 64, 32)),
      color: /^#[0-9a-fA-F]{6}$/.test(model.color) ? model.color : '#19dff6',
      scale: clamp(model.scale, 0.5, 8, 2.5),
      position: vector(model.position, -10, 10, 0),
      rotation: vector(model.rotation, -Math.PI * 20, Math.PI * 20, 0),
      intensity: clamp(model.intensity, 0.1, 2.5, 1),
      surfaceVisible: model.surfaceVisible !== false,
      wireframeVisible: model.wireframeVisible !== false,
      parts: model.shape === 'custom' && Array.isArray(model.parts) ? model.parts.slice(0, 24).map(part => {
        if (!part || !CUSTOM_PARTS.has(part.kind)) throw new Error('Parte customizada não permitida.');
        return { kind: part.kind, x: clamp(part.x, -4, 4, 0), y: clamp(part.y, -4, 4, 0), z: clamp(part.z, -4, 4, 0),
          sx: clamp(part.sx, 0.05, 3, 0.5), sy: clamp(part.sy, 0.05, 3, 0.5), sz: clamp(part.sz, 0.05, 3, 0.5),
          rx: clamp(part.rx, -Math.PI * 2, Math.PI * 2, 0), ry: clamp(part.ry, -Math.PI * 2, Math.PI * 2, 0), rz: clamp(part.rz, -Math.PI * 2, Math.PI * 2, 0) };
      }) : []
    };
  }
  return {
    version: 1,
    objects: input.objects.map((item, index) => {
      if (!item || typeof item !== 'object') throw new Error(`Objeto ${index + 1} inválido.`);
      const type = LIGHTS.has(item.type) ? 'point-light' : GEOMETRIES.has(item.geometry) ? 'mesh' : '';
      if (!type) throw new Error(`Tipo ou geometria não permitida no objeto ${index + 1}.`);
      const name = typeof item.name === 'string' ? item.name.slice(0, 80) : `${type}-${index + 1}`;
      return {
        type,
        geometry: type === 'mesh' ? item.geometry : undefined,
        name,
        position: vector(item.position, -100, 100, 0),
        rotation: vector(item.rotation, -Math.PI * 20, Math.PI * 20, 0),
        scale: vector(item.scale, 0.01, 100, 1),
        color: /^#[0-9a-fA-F]{6}$/.test(item.color) ? item.color : '#20dfff',
        intensity: clamp(item.intensity, 0, 100, 2),
        metalness: clamp(item.metalness, 0, 1, 0.35),
        roughness: clamp(item.roughness, 0, 1, 0.38),
        visible: item.visible !== false
      };
    }),
    mainModel,
    camera: input.camera && typeof input.camera === 'object' ? {
      position: vector(input.camera.position, -1000, 1000, 0),
      target: vector(input.camera.target, -1000, 1000, 0)
    } : undefined
  };
}

export function createSceneEditor({ THREE, scene, camera, renderer, orbitControls, onAI, getMainModel, onLoadMain }) {
  const panel = document.querySelector('#sceneEditorPanel');
  const root = new THREE.Group();
  root.name = 'EDITOR_OBJECTS';
  scene.add(root);
  const gizmo = new TransformControls(camera, renderer.domElement);
  scene.add(gizmo.getHelper());
  const tree = panel.querySelector('#editorTree');
  const inspector = panel.querySelector('#editorInspector');
  const status = panel.querySelector('#editorStatus');
  const undoButton = panel.querySelector('#editorUndo');
  const redoButton = panel.querySelector('#editorRedo');
  const nameInput = panel.querySelector('#editorName');
  const colorInput = panel.querySelector('#editorColor');
  const visibleInput = panel.querySelector('#editorVisible');
  const transformInputs = [...panel.querySelectorAll('[data-editor-transform]')];
  const fileInput = panel.querySelector('#editorFile');
  let selected = null;
  let history = ['{"version":1,"objects":[]}'];
  let historyIndex = 0;
  let restoring = false;
  let wasGizmoDrag = false;

  const setStatus = text => { status.textContent = text; };
  const snapshot = () => JSON.stringify({
    version: 1,
    objects: root.children.map(object => ({
      type: object.isPointLight ? 'point-light' : 'mesh',
      geometry: object.userData.editorGeometry,
      name: object.name,
      position: object.position.toArray(), rotation: object.rotation.toArray().slice(0, 3),
      scale: object.scale.toArray(), color: `#${object.isPointLight ? object.color.getHexString() : object.material.color.getHexString()}`,
      intensity: object.isPointLight ? object.intensity : 2,
      metalness: object.material?.metalness ?? 0,
      roughness: object.material?.roughness ?? 1,
      visible: object.visible
    }))
  });
  function record() {
    if (restoring) return;
    const value = snapshot();
    if (history[historyIndex] === value) return;
    history = history.slice(0, historyIndex + 1);
    history.push(value);
    if (history.length > 80) history.shift();
    historyIndex = history.length - 1;
    updateHistoryButtons();
  }
  function updateHistoryButtons() {
    undoButton.disabled = historyIndex <= 0;
    redoButton.disabled = historyIndex >= history.length - 1;
  }
  function createFromData(data) {
    let object;
    if (data.type === 'point-light') object = new THREE.PointLight(data.color, data.intensity, 0, 2);
    else {
      object = new THREE.Mesh(makeGeometry(THREE, data.geometry), new THREE.MeshStandardMaterial({
        color: data.color, metalness: data.metalness, roughness: data.roughness
      }));
      object.userData.editorGeometry = data.geometry;
    }
    object.name = data.name;
    object.position.fromArray(data.position);
    object.rotation.set(...data.rotation);
    object.scale.fromArray(data.scale);
    object.visible = data.visible;
    object.userData.editorEditable = true;
    return object;
  }
  function loadSnapshot(value) {
    const safe = validateSceneProject(JSON.parse(value));
    restoring = true;
    gizmo.detach(); selected = null;
    for (const child of [...root.children]) { root.remove(child); disposeObject(child); }
    for (const data of safe.objects) root.add(createFromData(data));
    renderTree(); updateInspector(); restoring = false;
  }
  function renderTree() {
    tree.replaceChildren();
    const primary = document.createElement('div');
    primary.className = 'editor-tree-static';
    primary.textContent = '▸ Malha principal · CYBER OCEAN';
    tree.append(primary);
    for (const object of root.children) {
      const item = document.createElement('button');
      item.type = 'button'; item.className = 'editor-tree-item';
      item.textContent = `${object.isPointLight ? '◉' : '◇'} ${object.name}`;
      item.setAttribute('aria-pressed', String(object === selected));
      item.addEventListener('click', () => select(object));
      tree.append(item);
    }
    if (!root.children.length) {
      const empty = document.createElement('small'); empty.textContent = 'Adicione objetos para montar a cena.'; tree.append(empty);
    }
  }
  function updateInspector() {
    const enabled = Boolean(selected);
    transformInputs.forEach(input => { input.disabled = !enabled; });
    nameInput.disabled = colorInput.disabled = visibleInput.disabled = !enabled;
    if (!enabled) { nameInput.value = ''; inspector.querySelector('#editorSelection').textContent = 'Nenhum objeto selecionado'; return; }
    inspector.querySelector('#editorSelection').textContent = selected.isPointLight ? 'Luz pontual' : `Malha · ${selected.userData.editorGeometry}`;
    nameInput.value = selected.name;
    colorInput.value = `#${selected.isPointLight ? selected.color.getHexString() : selected.material.color.getHexString()}`;
    visibleInput.checked = selected.visible;
    transformInputs.forEach(input => {
      const [part, axis] = input.dataset.editorTransform.split('-');
      const value = part === 'rotation' ? selected.rotation[axis] * 180 / Math.PI : selected[part][axis];
      input.value = Number(value.toFixed(3));
    });
    renderTree();
  }
  function select(object) {
    selected = object || null;
    if (selected) gizmo.attach(selected); else gizmo.detach();
    updateInspector();
  }
  function addObject(kind) {
    if (root.children.length >= MAX_OBJECTS) return setStatus(`Limite de ${MAX_OBJECTS} objetos atingido.`);
    const isLight = kind === 'point-light';
    const data = { type: kind, geometry: kind, name: `${isLight ? 'Luz' : kind} ${root.children.length + 1}`,
      position: [((root.children.length % 5) - 2) * 0.8, 0.3, -((root.children.length % 3) * 0.6)],
      rotation: [0, 0, 0], scale: [1, 1, 1], color: isLight ? '#38dcff' : '#20dfff', intensity: 2,
      metalness: .35, roughness: .38, visible: true };
    const object = createFromData(data);
    root.add(object); select(object); renderTree(); record(); setStatus(`${object.name} adicionado à cena.`);
  }
  function removeSelected() {
    if (!selected) return;
    const removed = selected; gizmo.detach(); selected = null; root.remove(removed); disposeObject(removed);
    renderTree(); updateInspector(); record(); setStatus('Objeto removido.');
  }
  function duplicateSelected() {
    if (!selected || selected.isPointLight) return setStatus('Selecione uma malha para duplicar.');
    const data = validateSceneProject({ version: 1, objects: JSON.parse(snapshot()).objects }).objects.find(item => item.name === selected.name);
    if (!data || root.children.length >= MAX_OBJECTS) return;
    data.name = `${selected.name} cópia`; data.position[0] += .5;
    const duplicate = createFromData(data); root.add(duplicate); select(duplicate); record(); setStatus('Objeto duplicado.');
  }
  function setTransform(mode) {
    gizmo.setMode(mode);
    panel.querySelectorAll('[data-editor-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.editorMode === mode)));
    setStatus(`Ferramenta ativa: ${mode === 'translate' ? 'mover' : mode === 'rotate' ? 'rotacionar' : 'escalar'}.`);
  }
  panel.querySelectorAll('[data-editor-add]').forEach(button => button.addEventListener('click', () => addObject(button.dataset.editorAdd)));
  panel.querySelectorAll('[data-editor-mode]').forEach(button => button.addEventListener('click', () => setTransform(button.dataset.editorMode)));
  panel.querySelector('#editorDelete').addEventListener('click', removeSelected);
  panel.querySelector('#editorDuplicate').addEventListener('click', duplicateSelected);
  undoButton.addEventListener('click', () => { if (historyIndex > 0) { historyIndex--; loadSnapshot(history[historyIndex]); updateHistoryButtons(); setStatus('Desfazer concluído.'); } });
  redoButton.addEventListener('click', () => { if (historyIndex < history.length - 1) { historyIndex++; loadSnapshot(history[historyIndex]); updateHistoryButtons(); setStatus('Refazer concluído.'); } });
  panel.querySelector('#editorSave').addEventListener('click', () => {
    const project = validateSceneProject(JSON.parse(snapshot()));
    project.camera = { position: camera.position.toArray(), target: orbitControls.target.toArray() };
    project.mainModel = getMainModel?.();
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = 'grid-soul-scene.json'; link.click(); URL.revokeObjectURL(url);
    setStatus('Projeto JSON exportado.');
  });
  panel.querySelector('#editorLoad').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0]; fileInput.value = '';
    if (!file) return;
    if (file.size > MAX_PROJECT_BYTES) return setStatus('Arquivo acima do limite de 1 MB.');
    try {
      const safe = validateSceneProject(JSON.parse(await file.text()));
      loadSnapshot(JSON.stringify(safe));
      if (safe.mainModel) await onLoadMain?.(safe.mainModel);
      if (safe.camera) { camera.position.fromArray(safe.camera.position); orbitControls.target.fromArray(safe.camera.target); orbitControls.update(); }
      history = [snapshot()]; historyIndex = 0; updateHistoryButtons(); setStatus(`${safe.objects.length} objetos carregados.`);
    } catch (error) { setStatus(`Não foi possível abrir o projeto: ${error.message}`); }
  });
  panel.querySelector('#editorAI').addEventListener('click', () => {
    const prompt = panel.querySelector('#editorAiPrompt').value.trim();
    if (!prompt) return setStatus('Descreva o modelo que quer pedir à IA.');
    onAI(prompt); setStatus('Pedido encaminhado à ponte local do ChatGPT. A resposta altera a malha principal; objetos adicionados no editor permanecem.');
  });
  nameInput.addEventListener('change', () => { if (selected) { selected.name = nameInput.value.trim().slice(0, 80) || 'Objeto'; renderTree(); record(); } });
  colorInput.addEventListener('input', () => { if (!selected) return; if (selected.isPointLight) selected.color.set(colorInput.value); else selected.material.color.set(colorInput.value); record(); });
  visibleInput.addEventListener('change', () => { if (selected) { selected.visible = visibleInput.checked; record(); } });
  transformInputs.forEach(input => input.addEventListener('change', () => {
    if (!selected) return;
    const [part, axis] = input.dataset.editorTransform.split('-');
    let value = clamp(input.value, part === 'scale' ? .01 : -100, part === 'scale' ? 100 : 100, 0);
    if (part === 'rotation') value *= Math.PI / 180;
    selected[part][axis] = value; updateInspector(); record();
  }));
  gizmo.addEventListener('mouseDown', () => { wasGizmoDrag = true; });
  gizmo.addEventListener('dragging-changed', event => { orbitControls.enabled = !event.value; });
  gizmo.addEventListener('mouseUp', () => { updateInspector(); record(); });
  gizmo.addEventListener('objectChange', updateInspector);
  renderer.domElement.addEventListener('pointerup', event => {
    if (gizmo.dragging || wasGizmoDrag || event.button !== 0) { wasGizmoDrag = false; return; }
    const rect = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    const raycaster = new THREE.Raycaster(); raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(root.children, true);
    select(hits[0]?.object?.parent?.userData.editorEditable ? hits[0].object.parent : hits[0]?.object?.userData.editorEditable ? hits[0].object : null);
  });
  window.addEventListener('keydown', event => {
    if (panel.hidden || event.target.matches('input,textarea,select')) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); (event.shiftKey ? redoButton : undoButton).click(); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); redoButton.click(); }
    if (event.key === 'Delete' || event.key === 'Backspace') removeSelected();
  });
  updateHistoryButtons(); renderTree(); updateInspector();
  return { refresh: renderTree, select, root };
}
