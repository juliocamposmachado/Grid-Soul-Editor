import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { gridSoulColorForAtomicNumber, gridSoulElementByAtomicNumber } from '/components/chemistry.js';
import { calibrateVisual, computeFrameDistance, readExplicitVisualOverrides } from '/components/visual_autocalibration.js';
import { buildWireframeObject, createOceanEnvironment, disposeWireframeObject } from '/components/wireframe_scene.js';
import { createSceneEditor } from '/components/scene_editor.js';

const stage=document.querySelector('#stage');
const state=document.querySelector('#state');
const reply=document.querySelector('#reply');
const send=document.querySelector('#send');
const openShowcaseButton=document.querySelector('#openShowcase');
const populationInput=document.querySelector('#population');
const energyInput=document.querySelector('#energy');
const scaleInput=document.querySelector('#visualScale');
const visualAutoInput=document.querySelector('#visualAuto');
const visualCalibrationStatus=document.querySelector('#visualCalibrationStatus');
const popout=document.querySelector('#popout');
const energyout=document.querySelector('#energyout');
const scaleout=document.querySelector('#visualScaleOut');
const paletteSelect=document.querySelector('#paletteMode');
const focusNotice=document.querySelector('#focusNotice');
const elementCatalog=document.querySelector('#elementCatalog');
const meshColorInput=document.querySelector('#meshColor');
const meshIntensityInput=document.querySelector('#meshIntensity');
const meshSurfaceToggle=document.querySelector('#meshSurfaceToggle');
const meshWireframeToggle=document.querySelector('#meshWireframeToggle');
const meshPauseButton=document.querySelector('#meshPause');
const meshResetButton=document.querySelector('#meshResetCamera');
const meshPosX=document.querySelector('#meshPosX');
const meshPosY=document.querySelector('#meshPosY');
const meshPosZ=document.querySelector('#meshPosZ');
const hudShape=document.querySelector('#hudShape');
const hudTriangles=document.querySelector('#hudTriangles');
const hudVertices=document.querySelector('#hudVertices');
const hudComponents=document.querySelector('#hudComponents');
const meshIntensityOut=document.querySelector('#meshIntensityOut');
const meshPosXOut=document.querySelector('#meshPosXOut');
const meshPosYOut=document.querySelector('#meshPosYOut');
const meshPosZOut=document.querySelector('#meshPosZOut');
const hudDepth=document.querySelector('#hudDepth');
const hudRotation=document.querySelector('#hudRotation');
const hudSession=document.querySelector('#hudSession');
const hudFps=document.querySelector('#hudFps');
const hudStatus=document.querySelector('#hudStatus');
const hudClockStarted=performance.now();
let memorySaveTimer=null;
let autoCalibration=visualAutoInput.checked;
try{
 if(localStorage.getItem('gridSoulVisualAuto')==='false')autoCalibration=false;
}catch{}
visualAutoInput.checked=autoCalibration;

function setAutoCalibration(enabled,message=''){
 autoCalibration=Boolean(enabled);
 visualAutoInput.checked=autoCalibration;
 try{localStorage.setItem('gridSoulVisualAuto',String(autoCalibration));}catch{}
 visualCalibrationStatus.textContent=message|| (autoCalibration
   ?'Auto ligado · novos pedidos sugerem densidade, animação, escala e enquadramento.'
   :'Manual ativo · os controles preservam densidade, escala e posicionamento.');
}

function markManualOverride(controlName){
 setAutoCalibration(false,`Manual ativo · ${controlName} foi definido por você; marque Auto e recalcule para restaurar as sugestões.`);
}

function detailFromBudget(budget){
 const value=Math.max(1_000,Math.min(500_000,Number(budget)||36_000));
 const ratio=(Math.sqrt(value)-Math.sqrt(1_000))/(Math.sqrt(500_000)-Math.sqrt(1_000));
 return Math.round(12+Math.max(0,Math.min(1,ratio))*52);
}
function budgetFromDetail(detail){
 const ratio=(Math.max(12,Math.min(64,Number(detail)||36))-12)/52;
 return Math.round(1_000+ratio*ratio*(500_000-1_000));
}
function syncVisualControlValues(){
 const detail=detailFromBudget(active);
 popout.value=`${detail}/64`;
 populationInput.value=String(detail);
 energyInput.value=String(energy);
 energyout.value=energy.toFixed(2);
 scaleInput.value=String(scale);
 scaleout.value=`${scale.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2})}×`;
 if(meshColorInput)meshColorInput.value='#'+color.getHexString();
 if(meshIntensityInput)meshIntensityInput.value=String(meshIntensity);
 if(meshIntensityOut)meshIntensityOut.value=meshIntensity.toFixed(2);
 if(meshPosXOut)meshPosXOut.value=move.x.toFixed(2);
 if(meshPosYOut)meshPosYOut.value=move.y.toFixed(2);
 if(meshPosZOut)meshPosZOut.value=move.z.toFixed(2);
 if(meshSurfaceToggle)meshSurfaceToggle.checked=surfaceVisible;
 if(meshWireframeToggle)meshWireframeToggle.checked=wireframeVisible;
 if(meshPosX)meshPosX.value=String(move.x);
 if(meshPosY)meshPosY.value=String(move.y);
 if(meshPosZ)meshPosZ.value=String(move.z);
}

const scene=new THREE.Scene();
scene.background=new THREE.Color('#020a18');
scene.fog=new THREE.FogExp2('#020a18',.010);
const camera=new THREE.PerspectiveCamera(48,1,.1,320);
camera.position.set(0,2.8,11.5);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.12;
stage.prepend(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;
controls.enablePan=true;
controls.screenSpacePanning=true;
controls.minDistance=2.4;
controls.maxDistance=100;
controls.target.set(0,0,0);
const ambientLight=new THREE.AmbientLight(0x5f9fb9,.8);
scene.add(ambientLight);
const light=new THREE.PointLight(0x00cfff,65,90);
light.position.set(4,8,7);
scene.add(light);
const light2=new THREE.PointLight(0x195bff,44,100);
light2.position.set(-8,-2,-8);
scene.add(light2);
const MAX_MESH_BUDGET=500_000;
let active=36_000;
let shape='shark';
let customParts=[];
let energy=.28;
let scale=2.5;
let move=new THREE.Vector3();
let rotation=new THREE.Euler();
let color=new THREE.Color('#19dff6');
let paletteMode='cyan';
let faceProfile=null;
let meshIntensity=1;
let surfaceVisible=true;
let wireframeVisible=true;
let animationPaused=false;
let fittedDistance=0;
let meshPresentation=null;
let swarm=new THREE.Group();
swarm.name='GRID_SOUL_MESH_ROOT';
scene.add(swarm);
const ocean=createOceanEnvironment(THREE,{particleCount:220});
scene.add(ocean.group);
let focusedAtomicNumber=null;
let phase=0;
let gsPeriodicMode=false;
let gsPeriodicLabels=null;
let gsPeriodicElements=[];
let gsPeriodicCameraTween=null;
let lastFrameTime=performance.now();
let fpsFrameCount=0;
let lastFpsTime=performance.now();
let displayedFps=0;
let currentObjectSpeed=0;
let lastHudTime=0;
let currentMetrics={vertices:0,triangles:0,connectedComponents:0,bounds:null};
function formatDuration(milliseconds){
 const seconds=Math.floor(milliseconds/1000);
 return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
}
function updateHud(force=false){
 const now=performance.now();
 if(!force&&now-lastHudTime<450)return;
 lastHudTime=now;
 const worldBounds=new THREE.Box3().setFromObject(swarm);
 const depth=worldBounds.isEmpty()?0:worldBounds.getSize(new THREE.Vector3()).z;
 if(hudShape)hudShape.textContent=shape.toUpperCase();
 if(hudTriangles)hudTriangles.textContent=currentMetrics.triangles.toLocaleString('pt-BR');
 if(hudVertices)hudVertices.textContent=currentMetrics.vertices.toLocaleString('pt-BR');
 if(hudComponents)hudComponents.textContent=String(currentMetrics.connectedComponents);
 if(hudDepth)hudDepth.textContent=`${depth.toFixed(2)} u`;
 if(hudRotation)hudRotation.textContent=`${currentObjectSpeed.toFixed(2)} rad/s`;
 if(hudSession)hudSession.textContent=formatDuration(now-hudClockStarted);
 if(hudFps)hudFps.textContent=displayedFps?`${displayedFps} FPS`: '— FPS';
 if(hudStatus)hudStatus.textContent=animationPaused?'PAUSED · malha congelada':'SYSTEM READY · WebGL';
}

// GRID_SOUL_PERIODIC_TABLE_V1

function gsPeriodicPosition(e) {
  return {
    x: (e.group - 9.5) * 0.72,
    y: (4.5 - e.period) * 0.72,
    z: 0
  };
}

function gsBuildPeriodicLabels() {
  if (gsPeriodicLabels) {
    gsPeriodicLabels.visible = true;
    return;
  }
  gsPeriodicLabels = new THREE.Group();
  gsPeriodicLabels.name = 'GRID_SOUL_PERIODIC_TABLE_LABELS';
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  for (const e of gsPeriodicElements) {
    const p = gsPeriodicPosition(e);
    ctx.clearRect(0, 0, 256, 160);
    ctx.fillStyle = '#061522';
    ctx.fillRect(8, 8, 240, 144);
    const elementColor=gridSoulColorForAtomicNumber(e.z);
    ctx.strokeStyle = elementColor;
    ctx.lineWidth = 7;
    ctx.strokeRect(8, 8, 240, 144);
    ctx.fillStyle = elementColor;
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(String(e.z), 20, 36);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText(e.s, 128, 100);
    ctx.fillStyle = '#8eefff';
    ctx.font = '18px sans-serif';
    ctx.fillText(e.n, 128, 132);

    const texture = new THREE.CanvasTexture(canvas.cloneNode
      ? (() => {
          const c = document.createElement('canvas');
          c.width = canvas.width;
          c.height = canvas.height;
          c.getContext('2d').drawImage(canvas, 0, 0);
          return c;
        })()
      : canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({
      map: texture, transparent: true, depthTest: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(p.x, p.y, 0.12);
    sprite.scale.set(0.64, 0.40, 1);
    sprite.userData.element = e;
    gsPeriodicLabels.add(sprite);
  }
  scene.add(gsPeriodicLabels);
}

function gsBuildHtmlCatalog(elements){
 const grid=elementCatalog;
 grid.replaceChildren();
 for(const element of elements){
   const button=document.createElement('button');
   button.type='button';
   button.className='element-chip';
   button.style.gridColumn=String(element.group);
   button.style.gridRow=String(element.period);
   button.style.setProperty('--element-color',gridSoulColorForAtomicNumber(element.z));
   button.dataset.atomicNumber=String(element.z);
   button.title=`${element.n} · Z=${element.z} · massa de referência ${element.a}`;
   button.setAttribute('role','gridcell');
   button.innerHTML=`<strong>${element.s}</strong><span>${element.z}</span>`;
   button.addEventListener('click',()=>gsFocusElement(element.z));
   grid.append(button);
 }
 updateFocusNotice();
}

function updateFocusNotice(){
 if(!focusNotice)return;
 if(!focusedAtomicNumber){
   focusNotice.textContent='O catálogo periódico é informativo; vértices da malha não recebem IDs químicos.';
 }else{
   const element=gridSoulElementByAtomicNumber(focusedAtomicNumber);
   focusNotice.textContent=`Elemento selecionado no catálogo: ${element.name} (${element.symbol}, Z=${element.z}) · metadado independente da malha.`;
 }
 elementCatalog?.querySelectorAll('.element-chip').forEach(button=>{
   button.setAttribute('aria-pressed',String(Number(button.dataset.atomicNumber)===focusedAtomicNumber));
 });
}
function gsFocusElement(atomicNumber){
 const element=gsPeriodicElements.find(item=>item.z===atomicNumber);
 if(!element)return;
 focusedAtomicNumber=element.z;
 gsElement=element;
 updateFocusNotice();
 updateSwarmColors();
 state.textContent=`Elemento em destaque: ${element.s} · ${element.n} · Z=${element.z}`;
 persistCurrentState();
}

function gsLoadPeriodicCatalog() {
  import('/components/periodic_table.js').then(module => {
    gsPeriodicElements = module.GRID_SOUL_ELEMENTS.map(e => ({
      s: e.symbol, n: e.name, z: e.z, a: e.mass,
      period: e.period, group: e.group
    }));
    if (gsElements.length !== 118) {
      gsElements.splice(0, gsElements.length, ...gsPeriodicElements);
    }
    gsElement = gsPeriodicElements.find(e => e.s === 'C') || gsElements[0];
    gsBuildHtmlCatalog(gsPeriodicElements);
    console.info('GRID SOUL: catálogo periódico carregado:', gsPeriodicElements.length);
  }).catch(error => {
    console.error('GRID SOUL: catálogo periódico não carregado', error);
  });
}
gsLoadPeriodicCatalog();

function buildTargets(){
 const detail=detailFromBudget(active);
 const next=buildWireframeObject(THREE,shape,{
   detail,parts:customParts,color:'#'+color.getHexString(),intensity:meshIntensity,
   surfaceVisible,wireframeVisible,verticesVisible:true
 });
 if(meshPresentation){
   scene.remove(meshPresentation.group);
   disposeWireframeObject(meshPresentation);
 }
 meshPresentation=next;
 currentMetrics=next.metrics;
 swarm=next.group;
 swarm.name='GRID_SOUL_MESH_ROOT';
 swarm.position.copy(move);
 swarm.rotation.copy(rotation);
 swarm.scale.setScalar(scale);
 swarm.visible=!gsPeriodicMode;
 scene.add(swarm);
 if(gsPeriodicMode&&gsPeriodicLabels)gsPeriodicLabels.visible=true;
 populationInput.value=String(detail);
 popout.value=`${detail}/64`;
 updateFocusNotice();
 updateHud(true);
 state.textContent=`Malha ${shape} · ${currentMetrics.vertices.toLocaleString('pt-BR')} vértices · ${currentMetrics.triangles.toLocaleString('pt-BR')} triângulos`;
}
function frameSwarmToView(){
 const bounds=new THREE.Box3().setFromObject(swarm);
 if(bounds.isEmpty())return;
 const size=bounds.getSize(new THREE.Vector3());
 const center=bounds.getCenter(new THREE.Vector3());
 const framing=computeFrameDistance(size,{verticalFovDegrees:camera.fov,aspect:camera.aspect||1,padding:1.35});
 const direction=new THREE.Vector3(.13,.08,1).normalize();
 fittedDistance=framing.distance;
 controls.target.copy(center);
 camera.position.copy(center).addScaledVector(direction,framing.distance);
 controls.minDistance=Math.max(.7,framing.radius*.28);
 controls.maxDistance=Math.min(240,Math.max(80,framing.distance*8));
 controls.update();
 updateHud(true);
}
function resetCamera(){
 if(shape==='shark')rotation.set(0,0,0);
 frameSwarmToView();
}
function persistCurrentState(){
 const plan={
   reply:reply.textContent||'Estado visual restaurado.',
   shape,population:active,energy,scale,detail:detailFromBudget(active),
   rotationX:rotation.x,rotationY:rotation.y,rotationZ:rotation.z,
   moveX:move.x,moveY:move.y,moveZ:move.z,
   color:'#'+color.getHexString(),parts:customParts,
   meshSettings:{detail:detailFromBudget(active),color:'#'+color.getHexString(),intensity:meshIntensity,surfaceVisible,wireframeVisible},
   paletteMode,focusedAtomicNumber,faceProfile,
   representation:'connected-triangle-mesh-v1'
 };
 if(memorySaveTimer)clearTimeout(memorySaveTimer);
 memorySaveTimer=setTimeout(()=>{
   fetch('/api/memory/state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan})}).catch(()=>{});
 },250);
}
function applyFaceProfileAppearance(){
 scene.background.set('#020a18');
 if(!scene.fog)scene.fog=new THREE.FogExp2('#020a18',.010);
 scene.fog.color.set('#020a18');
 updateSwarmColors();
}
function promptShape(command,fallback='shark'){
 const text=String(command||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(/\b(tubarao|shark)\b/.test(text))return 'shark';
 if(/\b(coracao|heart)\b/.test(text))return 'heart';
 if(/\b(cranio|skull)\b/.test(text))return 'skull';
 if(/\b(ponte|bridge)\b/.test(text))return 'bridge';
 if(/\b(edificio|predio|arranha-ceu|building|skyscraper)\b/.test(text))return 'building';
 if(/\b(engrenagem|mecanica|mecanismo|gear|mechanical)\b/.test(text))return 'mechanical';
 if(/\b(planeta|planet)\b/.test(text))return 'planet';
 if(/\b(rosto|face|humanoide|facial)\b/.test(text))return 'face';
 if(/\b(terreno|montanha|terrain)\b/.test(text))return 'terrain';
 if(/\b(onda|wave)\b/.test(text))return 'wave';
 if(/\b(espiral|spiral)\b/.test(text))return 'spiral';
 if(/\b(toro|torus)\b/.test(text))return 'torus';
 if(/\b(esfera|sphere)\b/.test(text))return 'sphere';
 return fallback;
}
async function applyPlan(p){
 customParts=Array.isArray(p.parts)?p.parts:[];
 const requestedCommand=document.querySelector('#command').value;
 shape=promptShape(requestedCommand,p.shape||'shark');
 const explicitOverrides=readExplicitVisualOverrides(requestedCommand);
 const requestedPopulation=autoCalibration?p.population:(explicitOverrides.population??active);
 const requestedEnergy=autoCalibration?p.energy:(explicitOverrides.energy??energy);
 const requestedScale=autoCalibration?p.scale:(explicitOverrides.scale??scale);
 const calibrated=calibrateVisual({
   shape,prompt:requestedCommand,population:requestedPopulation,energy:requestedEnergy,scale:requestedScale,
   automatic:autoCalibration,
   deviceMemory:navigator.deviceMemory,hardwareConcurrency:navigator.hardwareConcurrency,
   maxParticles:MAX_MESH_BUDGET
 });
 faceProfile=shape==='face'&&p.faceProfile&&typeof p.faceProfile==='object'?p.faceProfile:null;
 const explicitDensity=explicitOverrides.meshDetail;
 const plannedDensity=Number(p.meshSettings?.detail);
 active=Number.isInteger(explicitDensity)?budgetFromDetail(explicitDensity):Number.isInteger(plannedDensity)?budgetFromDetail(plannedDensity):calibrated.population;
 meshIntensity=Number(p.meshSettings?.intensity)||1;
 surfaceVisible=p.meshSettings?.surfaceVisible!==false;
 wireframeVisible=p.meshSettings?.wireframeVisible!==false;
 energy=calibrated.energy;
 scale=calibrated.scale;
 move.set(Number(p.moveX)||0,Number(p.moveY)||0,Number(p.moveZ)||0);
 rotation.set(Number(p.rotationX)||0,Number(p.rotationY)||0,Number(p.rotationZ)||0);
 color.set(/^#[0-9a-f]{6}$/i.test(p.meshSettings?.color||p.color||'')?(p.meshSettings?.color||p.color):'#19DFF6');
 const detectedPalette=detectPalette(requestedCommand);
 paletteMode=detectedPalette||(['single','rainbow','plasma','fire','green','cyan'].includes(p.paletteMode)?p.paletteMode:'cyan');
 if(paletteMode==='cyan')color.set('#19DFF6');
 else if(paletteMode==='plasma')color.set('#A55BFF');
 else if(paletteMode==='fire')color.set('#FF7A36');
 else if(paletteMode==='green')color.set('#42FFB1');
 if(meshColorInput)meshColorInput.value='#'+color.getHexString();
 gsPeriodicMode=false;
 gsIsResting=false;
 if(gsPeriodicLabels)gsPeriodicLabels.visible=false;
 gsAtom.visible=false;
 swarm.visible=true;
 focusedAtomicNumber=Number.isInteger(p.focusedAtomicNumber)&&p.focusedAtomicNumber>=1&&p.focusedAtomicNumber<=118?p.focusedAtomicNumber:null;
 paletteSelect.value=paletteMode;
 paletteSelect.disabled=false;
 applyFaceProfileAppearance();
 buildTargets();
 syncVisualControlValues();
 frameSwarmToView();
 const notices=[];
 if(shape==='face')notices.push('Rosto procedimental estilizado em malha 3D; não é reconstrução anatômica validada nem reprodução fiel do atlas frontal.');
 reply.textContent=[p.reply||'Criação local concluída.',...notices,calibrated.summary].filter(Boolean).join('\n');
 visualCalibrationStatus.textContent=calibrated.summary;
 state.textContent=`Malha ${shape} enquadrada · ${currentMetrics.triangles.toLocaleString('pt-BR')} triângulos conectados`;
 gsWake();
 persistCurrentState();
}
function openShowcase(updateAddress=false){
 if(updateAddress){const url=new URL(location.href);url.searchParams.set('demo','1');history.replaceState(null,'',url);}
 if(memorySaveTimer)clearTimeout(memorySaveTimer);memorySaveTimer=null;
 customParts=[];faceProfile=null;focusedAtomicNumber=null;
 shape='shark';active=budgetFromDetail(32);energy=.28;scale=2.5;move.set(0,0,0);rotation.set(0,0,0);color.set('#19DFF6');paletteMode='cyan';meshIntensity=1;surfaceVisible=true;wireframeVisible=true;
 syncVisualControlValues();paletteSelect.value='cyan';paletteSelect.disabled=false;
 document.querySelector('#command').value='';send.disabled=false;
 gsPeriodicMode=false;gsIsResting=false;if(gsIdleTimer!==null)clearTimeout(gsIdleTimer);gsIdleTimer=null;
 if(gsPeriodicLabels)gsPeriodicLabels.visible=false;gsAtom.visible=false;swarm.visible=true;
 buildTargets();frameSwarmToView();updateFocusNotice();
 reply.textContent=`CYBER OCEAN · tubarão demonstrativo em malha triangulada conectada.\n${currentMetrics.vertices.toLocaleString('pt-BR')} vértices · ${currentMetrics.triangles.toLocaleString('pt-BR')} triângulos.`;
 visualCalibrationStatus.textContent='Demonstração local: modelo procedural estilizado; não é uma digitalização anatômica.';
 state.textContent=`CYBER OCEAN · shark · ${currentMetrics.triangles.toLocaleString('pt-BR')} faces triangulares`;
 gsWake();
}
function detectPalette(command){
 const s=String(command||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

 if(/\b(arco.?iris|rainbow|multicolor|multicor|varias cores|muitas cores|todas as cores)\b/.test(s)) return 'rainbow';
 if(/\b(plasma|roxo|violeta|magenta|purple)\b/.test(s)) return 'plasma';
 if(/\b(fogo|chamas|incendio|laranja|vermelho|fire)\b/.test(s)) return 'fire';
 if(/\b(verde|neon green|verde neon)\b/.test(s)) return 'green';
 if(/\b(ciano|azul|azul eletrico|cyan|azul neon)\b/.test(s)) return 'cyan';
 if(/\b(identidade quimica|cores quimicas|paleta quimica)\b/.test(s)) return 'chemical';
 if(/\b(cor unica|uma unica cor|monocromatico|monocromatica|voltar a cor original|cor original)\b/.test(s)) return 'single';

 return null;
}


function updateSwarmColors(){
 if(meshPresentation)meshPresentation.setStyle({color:'#'+color.getHexString(),intensity:meshIntensity,surfaceVisible,wireframeVisible,verticesVisible:true});
 updateHud(true);
}
function presets(form){
 shape=promptShape(form,form);
 if(shape!=='face')faceProfile=null;
 paletteSelect.disabled=false;
 if(paletteMode==='chemical'||paletteMode==='face')paletteMode='cyan';
 paletteSelect.value=paletteMode;
 buildTargets();persistCurrentState();
}
openShowcaseButton.addEventListener('click',()=>openShowcase(true));

const localVisualExamples={
 shark:{title:'Tubarão',prompt:'Crie um tubarão tridimensional com corpo alongado, nadadeiras e cauda em malha wireframe ciano.',shape:'shark',color:'#19DFF6',paletteMode:'cyan'},
 heart:{title:'Coração',prompt:'Crie um coração estilizado tridimensional em malha wireframe ciano.',shape:'heart',color:'#FF547E',paletteMode:'plasma'},
 skull:{title:'Crânio',prompt:'Crie um crânio estilizado tridimensional com cavidades oculares em malha wireframe azul.',shape:'skull',color:'#91EFFF',paletteMode:'cyan'},
 sphere:{title:'Esfera',prompt:'Crie uma esfera triangulada com superfície densa e wireframe ciano.',shape:'sphere',color:'#35EAFF',paletteMode:'single'},
 wave:{title:'Onda',prompt:'Crie uma superfície oceânica em forma de onda triangulada azul.',shape:'wave',color:'#168CFF',paletteMode:'cyan'},
 face:{title:'Rosto (malha)',prompt:'Crie um rosto humanoide frontal estilizado como superfície triangulada ciano, sem cubos.',shape:'face',color:'#00E5FF',paletteMode:'cyan'}
};
async function applyVisualExample(name){
 const example=localVisualExamples[name];
 if(!example)return;
 document.querySelector('#command').value=example.prompt;
 await applyPlan({
   reply:`Exemplo local “${example.title}” aplicado sem consulta ao ChatGPT.`,
   shape:example.shape,population:budgetFromDetail(40),meshSettings:{detail:40,color:example.color,intensity:1,surfaceVisible:true},energy:.28,scale:2.2,
   rotationX:0,rotationY:0,rotationZ:0,moveX:0,moveY:0,moveZ:0,
   color:example.color,parts:[],paletteMode:example.paletteMode,focusedAtomicNumber:null
 });
}

document.querySelectorAll('[data-visual-example]').forEach(button=>{
 button.addEventListener('click',()=>applyVisualExample(button.dataset.visualExample).catch(error=>{
   reply.textContent=`Não foi possível gerar o exemplo local: ${error.message}`;
   state.textContent='Exemplo local não concluído';
 }));
});

visualAutoInput.addEventListener('change',async()=>{
 setAutoCalibration(visualAutoInput.checked);
 if(autoCalibration){
   try{await applyPlan({reply:'Parâmetros recalibrados para a forma atual.',shape,population:active,energy,scale,rotationX:rotation.x,rotationY:rotation.y,rotationZ:rotation.z,moveX:move.x,moveY:move.y,moveZ:move.z,color:'#'+color.getHexString(),parts:customParts,paletteMode,focusedAtomicNumber,faceProfile});}
   catch(error){visualCalibrationStatus.textContent=`Falha ao recalibrar: ${error.message}`;}
 }
});

document.querySelector('#visualRecalibrate').addEventListener('click',async()=>{
 setAutoCalibration(true);
 try{await applyPlan({reply:'Parâmetros recalibrados a pedido.',shape,population:active,energy,scale,rotationX:rotation.x,rotationY:rotation.y,rotationZ:rotation.z,moveX:move.x,moveY:move.y,moveZ:move.z,color:'#'+color.getHexString(),parts:customParts,paletteMode,focusedAtomicNumber,faceProfile});}
 catch(error){visualCalibrationStatus.textContent=`Falha ao recalibrar: ${error.message}`;}
});

populationInput.addEventListener('input',()=>{
 markManualOverride('densidade da malha');
 active=budgetFromDetail(Number(populationInput.value));
 popout.value=`${populationInput.value}/64`;
 buildTargets();persistCurrentState();
});
populationInput.addEventListener('change',frameSwarmToView);
energyInput.addEventListener('input',()=>{
 markManualOverride('velocidade de animação');energy=Number(energyInput.value);energyout.value=energy.toFixed(2);persistCurrentState();
});
scaleInput.addEventListener('input',()=>{
 markManualOverride('escala visual');scale=Number(scaleInput.value);scaleout.value=`${scale.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2})}×`;
 swarm.scale.setScalar(scale);updateHud(true);persistCurrentState();
});
scaleInput.addEventListener('change',frameSwarmToView);
paletteSelect.addEventListener('change',()=>{
 paletteMode=paletteSelect.value;
 const paletteColors={single:'#E8FBFF',rainbow:'#52E8FF',plasma:'#A55BFF',fire:'#FF7A36',green:'#42FFB1',cyan:'#19DFF6',chemical:'#19DFF6'};
 color.set(paletteColors[paletteMode]||'#19DFF6');
 if(meshColorInput)meshColorInput.value='#'+color.getHexString();
 updateSwarmColors();persistCurrentState();
});
document.querySelector('#clearElementFocus').addEventListener('click',()=>{focusedAtomicNumber=null;updateFocusNotice();persistCurrentState();});
meshIntensityInput?.addEventListener('input',()=>{
 meshIntensity=Number(meshIntensityInput.value);if(meshIntensityOut)meshIntensityOut.value=meshIntensity.toFixed(2);updateSwarmColors();ocean.setIntensity(meshIntensity);persistCurrentState();
});
meshColorInput?.addEventListener('input',()=>{
 color.set(meshColorInput.value);updateSwarmColors();persistCurrentState();
});
meshSurfaceToggle?.addEventListener('change',()=>{
 surfaceVisible=meshSurfaceToggle.checked;updateSwarmColors();persistCurrentState();
});
meshWireframeToggle?.addEventListener('change',()=>{
 wireframeVisible=meshWireframeToggle.checked;updateSwarmColors();persistCurrentState();
});
meshPauseButton?.addEventListener('click',()=>{
 animationPaused=!animationPaused;
 meshPauseButton.setAttribute('aria-pressed',String(animationPaused));
 meshPauseButton.textContent=animationPaused?'Retomar animação':'Pausar animação';updateHud(true);
});
meshResetButton?.addEventListener('click',resetCamera);
function updateMeshPosition(){
 move.set(Number(meshPosX?.value)||0,Number(meshPosY?.value)||0,Number(meshPosZ?.value)||0);
 swarm.position.copy(move);if(meshPosXOut)meshPosXOut.value=move.x.toFixed(2);if(meshPosYOut)meshPosYOut.value=move.y.toFixed(2);if(meshPosZOut)meshPosZOut.value=move.z.toFixed(2);updateHud(true);persistCurrentState();
}
[meshPosX,meshPosY,meshPosZ].forEach(input=>input?.addEventListener('input',updateMeshPosition));
send.addEventListener('click',async()=>{
 const gsPrompt=document.querySelector('#command').value;
 gsChooseElement(gsPrompt);
 gsWake();
 const message=document.querySelector('#command').value.trim();
 if(!message||send.disabled)return;
 send.disabled=true;
 state.textContent='ChatGPT está planejando a transformação...';
 try{
   const response=await fetch('/api/command',{
     method:'POST',
     headers:{'Content-Type':'application/json'},
     body:JSON.stringify({message,population:active})
   });
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Erro na API');
   await applyPlan(data);
 }catch(e){
   reply.textContent='Erro: '+e.message;
   state.textContent='Aguardando correção';
 }finally{
   send.disabled=false;
 }
});

document.querySelector('#command').addEventListener('keydown',e=>{
 if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send.click();}
});

function resize(){
 const w=stage.clientWidth,h=stage.clientHeight;
 if(!w||!h)return;
 const oldFit=fittedDistance;
 const viewDirection=camera.position.clone().sub(controls.target);
 const zoomRatio=oldFit>0?viewDirection.length()/oldFit:1;
 if(viewDirection.lengthSq()>0)viewDirection.normalize();
 camera.aspect=w/h;
 camera.updateProjectionMatrix();
 renderer.setSize(w,h,false);
 if(oldFit>0){
   const bounds=new THREE.Box3().setFromObject(swarm);
   if(!bounds.isEmpty()){
     const size=bounds.getSize(new THREE.Vector3());
     const framing=computeFrameDistance(size,{verticalFovDegrees:camera.fov,aspect:camera.aspect||1,padding:1.35});
     fittedDistance=framing.distance;
     const preserveZoom=Math.max(.8,Math.min(3,zoomRatio));
     camera.position.copy(controls.target).addScaledVector(viewDirection,fittedDistance*preserveZoom);
     controls.minDistance=Math.max(.7,framing.radius*.28);
     controls.maxDistance=Math.min(240,Math.max(80,fittedDistance*8));
     controls.update();
   }
 }
}
new ResizeObserver(resize).observe(stage);
resize();
buildTargets();
const sceneEditor=createSceneEditor({
 THREE,scene,camera,renderer,orbitControls:controls,
 onAI(prompt){document.querySelector('#command').value=prompt;send.click();},
 getMainModel(){return {shape,detail:detailFromBudget(active),color:'#'+color.getHexString(),scale,position:swarm.position.toArray(),rotation:rotation.toArray().slice(0,3),intensity:meshIntensity,surfaceVisible,wireframeVisible,parts:customParts};},
 async onLoadMain(model){
  document.querySelector('#command').value=model.shape;
  await applyPlan({reply:'Modelo principal restaurado do projeto.',shape:model.shape,population:budgetFromDetail(model.detail),energy,scale:model.scale,rotationX:model.rotation[0],rotationY:model.rotation[1],rotationZ:model.rotation[2],moveX:model.position[0],moveY:model.position[1],moveZ:model.position[2],color:model.color,parts:model.parts||[],meshSettings:{detail:model.detail,color:model.color,intensity:model.intensity,surfaceVisible:model.surfaceVisible,wireframeVisible:model.wireframeVisible}});
 }
});
const editorPanel=document.querySelector('#sceneEditorPanel');
document.querySelector('#editorOpen').addEventListener('click',()=>{editorPanel.hidden=false;});
document.querySelector('#editorClose').addEventListener('click',()=>{editorPanel.hidden=true;});


// GRID_SOUL_ATOMIC_REST_V2
// Repouso real: esconde o enxame anterior e mostra um único átomo central.
// Modelo de Bohr didático, não uma visualização literal de orbitais quânticos.
const gsAtom = new THREE.Group();
gsAtom.name = 'GRID_SOUL_ATOMIC_REST_V2';
gsAtom.visible = false;
scene.add(gsAtom);

const gsElements = [
 {s:'H',n:'Hidrogênio',z:1,a:1},
 {s:'He',n:'Hélio',z:2,a:4},
 {s:'Li',n:'Lítio',z:3,a:7},
 {s:'Be',n:'Berílio',z:4,a:9},
 {s:'B',n:'Boro',z:5,a:11},
 {s:'C',n:'Carbono',z:6,a:12},
 {s:'N',n:'Nitrogênio',z:7,a:14},
 {s:'O',n:'Oxigênio',z:8,a:16},
 {s:'F',n:'Flúor',z:9,a:19},
 {s:'Ne',n:'Neônio',z:10,a:20},
 {s:'Na',n:'Sódio',z:11,a:23},
 {s:'Mg',n:'Magnésio',z:12,a:24},
 {s:'Al',n:'Alumínio',z:13,a:27},
 {s:'Si',n:'Silício',z:14,a:28},
 {s:'P',n:'Fósforo',z:15,a:31},
 {s:'S',n:'Enxofre',z:16,a:32},
 {s:'Cl',n:'Cloro',z:17,a:35},
 {s:'Ar',n:'Argônio',z:18,a:40},
 {s:'K',n:'Potássio',z:19,a:39},
 {s:'Ca',n:'Cálcio',z:20,a:40},
 {s:'Fe',n:'Ferro',z:26,a:56},
 {s:'Cu',n:'Cobre',z:29,a:64},
 {s:'Zn',n:'Zinco',z:30,a:64},
 {s:'Ag',n:'Prata',z:47,a:108},
 {s:'Au',n:'Ouro',z:79,a:197},
 {s:'Hg',n:'Mercúrio',z:80,a:201},
 {s:'Pb',n:'Chumbo',z:82,a:207},
 {s:'U',n:'Urânio',z:92,a:238}
];
let gsElement = gsElements.find(e=>e.s==='C');
let gsIdleTimer = null;
let gsIsResting = false;
let gsLastTouch = performance.now();

function gsDisposeAtom() {
 while (gsAtom.children.length) {
  const o = gsAtom.children[0];
  gsAtom.remove(o);
  o.traverse?.(x => {
   if (x.isSprite && x.material && x.material.map) x.material.map.dispose();
   if (x.isSprite && x.material) x.material.dispose();
  });
 }
}
const gsAtomShellGeometry = new THREE.IcosahedronGeometry(.72,1);
const gsAtomShellMaterial = new THREE.MeshBasicMaterial({
 color:0x26eaff, wireframe:true, transparent:true, opacity:.8
});
const gsNucleusGeometry = new THREE.SphereGeometry(.055,8,6);
const gsElectronGeometry = new THREE.SphereGeometry(.065,10,8);
const gsProtonMaterial = new THREE.MeshBasicMaterial({color:0xff7855});
const gsNeutronMaterial = new THREE.MeshBasicMaterial({color:0xe3f6ff});
const gsElectronMaterial = new THREE.MeshBasicMaterial({color:0x37f5ff});
const gsOrbitMaterial = new THREE.LineBasicMaterial({
 color:0x1dbfff,transparent:true,opacity:.55
});
let gsElectrons = [];

function gsLabelTexture(element) {
 const c=document.createElement('canvas');
 c.width=256;c.height=160;
 const x=c.getContext('2d');
 x.textAlign='center';x.textBaseline='middle';
 x.shadowColor='#22eaff';x.shadowBlur=22;
 x.fillStyle='#c7ffff';x.font='bold 76px sans-serif';
 x.fillText(element.s,128,62);
 x.shadowBlur=0;x.fillStyle='#65dfff';
 x.font='bold 26px sans-serif';
 x.fillText('Z = '+element.z,128,125);
 const t=new THREE.CanvasTexture(c);
 t.colorSpace=THREE.SRGBColorSpace;
 return t;
}

function gsElectronShells(z) {
 // Distribuição didática por camadas para os elementos comuns catalogados.
 const known={
 1:[1],2:[2],3:[2,1],4:[2,2],5:[2,3],6:[2,4],7:[2,5],8:[2,6],
 9:[2,7],10:[2,8],11:[2,8,1],12:[2,8,2],13:[2,8,3],14:[2,8,4],
 15:[2,8,5],16:[2,8,6],17:[2,8,7],18:[2,8,8],19:[2,8,8,1],
 20:[2,8,8,2],26:[2,8,14,2],29:[2,8,18,1],30:[2,8,18,2],
 47:[2,8,18,18,1],79:[2,8,18,32,18,1],80:[2,8,18,32,18,2],
 82:[2,8,18,32,18,4],92:[2,8,18,32,21,9,2]
 };
 if(known[z]) return known[z];
 const shells=[];
 let left=z;
 const capacities=[2,8,18,32,32,18,8];
 for(const cap of capacities) {
   if(left<=0) break;
   const amount=Math.min(left,cap);
   shells.push(amount);left-=amount;
 }
 return shells;
}

function gsBuildAtom(element) {
 gsDisposeAtom();
 gsElectrons=[];
 gsElement=element;

 const elementColors={Au:0xffd54a,Cu:0xb87333,Ag:0xcbd5e1,Fe:0xff7043,C:0x37f5ff};
 const accent=elementColors[element.s] ?? 0x26eaff;
 gsAtomShellMaterial.color.setHex(accent);
 gsOrbitMaterial.color.setHex(accent);

 const atomShell=new THREE.Mesh(gsAtomShellGeometry,gsAtomShellMaterial);
 gsAtom.add(atomShell);

 const label=new THREE.Sprite(new THREE.SpriteMaterial({
   map:gsLabelTexture(element),transparent:true,depthTest:false
 }));
 label.scale.set(1.15,.72,1);
 label.position.set(0,0,.53);
 gsAtom.add(label);

 // Número de nêutrons estimado pelo isótopo de referência informado.
 const neutronCount=Math.max(0,element.a-element.z);
 const nucleons=element.z+neutronCount;

 for(let i=0;i<nucleons;i++) {
   const isProton=i<element.z;
   const mesh=new THREE.Mesh(
     gsNucleusGeometry,
     isProton?gsProtonMaterial:gsNeutronMaterial
   );
   const angle=i*2.399963229728653;
   const radius=Math.sqrt(i+1)*.022;
   mesh.position.set(
     Math.cos(angle)*radius,
     Math.sin(angle)*radius,
     ((i%3)-1)*.025
   );
   gsAtom.add(mesh);
 }

 const shells=gsElectronShells(element.z);
 shells.forEach((count,si)=>{
   const radius=1.05+si*.48;
   const tilt=.38+si*.47;
   const points=[];
   for(let j=0;j<96;j++) {
     const a=j/96*Math.PI*2;
     const p=new THREE.Vector3(
       Math.cos(a)*radius,Math.sin(a)*radius*.72,0
     );
     p.applyEuler(new THREE.Euler(tilt,tilt*.37,tilt*.61));
     points.push(p);
   }
   const orbit=new THREE.LineLoop(
     new THREE.BufferGeometry().setFromPoints(points),gsOrbitMaterial
   );
   gsAtom.add(orbit);

   for(let e=0;e<count;e++) {
     const electron=new THREE.Mesh(gsElectronGeometry,gsElectronMaterial);
     gsAtom.add(electron);
     gsElectrons.push({
       mesh:electron,radius,tilt,
       angle:Math.PI*2*e/count+si*.29,
       speed:(si%2?-1:1)*(.7+si*.12)
     });
   }
 });

 state.textContent='Repouso atômico · '+element.n+
   ' · '+element.z+' prótons · '+neutronCount+
   ' nêutrons · '+element.z+' elétrons';
}

function gsEnterRest() {
 if(gsIsResting) return;
 gsIsResting=true;
 gsPeriodicMode=true;
 swarm.visible=true;
 gsAtom.visible=false;
 gsBuildPeriodicLabels();
 buildTargets();
 state.textContent='Repouso periódico · 118 elementos · enxame coletivo';
}

function gsWake() {
 gsLastTouch=performance.now();
 if(gsIdleTimer!==null) clearTimeout(gsIdleTimer);
 gsIdleTimer=null;
 if(gsIsResting) {
   gsIsResting=false;
   gsPeriodicMode=false;
   gsAtom.visible=false;
   if(gsPeriodicLabels) gsPeriodicLabels.visible=false;
   swarm.visible=true;
   buildTargets();
   state.textContent='Enxame ativo';
 }
 if(shape==='face')return;
 if(new URLSearchParams(location.search).get('demo')!=='1'){
   gsIdleTimer=setTimeout(gsEnterRest,12000);
 }
}

function gsChooseElement(command) {
 const raw=String(command||'');
 const q=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const availableElements=gsPeriodicElements.length===118
   ? gsPeriodicElements.map(e=>({s:e.s,n:e.n,z:e.z,a:e.a}))
   : gsElements;
 const atomicNumberMatch=q.match(/\b(?:z\s*=?\s*)(\d{1,3})\b/);
 let found=atomicNumberMatch?availableElements.find(e=>e.z===Number(atomicNumberMatch[1])):null;
 if(!found){
   found=availableElements.find(e=>{
     const name=e.n.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
     return new RegExp(`\\b${name}\\b`).test(q);
   });
 }
 if(!found){
   const symbols=raw.match(/\b[A-Z][a-z]?\b/g)||[];
   found=availableElements.find(e=>symbols.includes(e.s));
 }
 if(found){
   gsElement=found;
   gsFocusElement(found.z);
 }
}

document.addEventListener('pointerdown',gsWake,{passive:true});
document.addEventListener('keydown',gsWake);
document.addEventListener('input',gsWake,{passive:true});

gsWake();
// FIM GRID_SOUL_ATOMIC_REST_V2

function animate(){
 requestAnimationFrame(animate);
 const now=performance.now();
 const elapsedSeconds=Math.max(0,(now-lastFrameTime)/1000);
 const delta=Math.min(.06,elapsedSeconds);
 lastFrameTime=now;
 fpsFrameCount++;
 if(now-lastFpsTime>=1000){displayedFps=Math.round(fpsFrameCount*1000/(now-lastFpsTime));fpsFrameCount=0;lastFpsTime=now;}
 if(!animationPaused){
   phase+=delta*energy*.65;
   ocean.update(delta,false);
   if(swarm.visible){
     const previousModelRotation=swarm.rotation.y;
     swarm.rotation.set(rotation.x,rotation.y+phase*.12,rotation.z);
     currentObjectSpeed=elapsedSeconds>0?Math.abs(swarm.rotation.y-previousModelRotation)/elapsedSeconds:0;
   }else currentObjectSpeed=0;
   if(gsIsResting){
     gsAtom.rotation.y+=delta*.12;
     for(const electron of gsElectrons){
       electron.angle+=delta*electron.speed;
       const point=new THREE.Vector3(Math.cos(electron.angle)*electron.radius,Math.sin(electron.angle)*electron.radius*.72,Math.sin(electron.angle*1.7)*electron.radius*.22);
       point.applyEuler(new THREE.Euler(electron.tilt,electron.tilt*.37,electron.tilt*.61));
       electron.mesh.position.copy(point);
     }
   }
 }else currentObjectSpeed=0;
 controls.update();
 renderer.render(scene,camera);
 updateHud();
}
animate();
state.textContent='Renderer de malha operacional · recuperando memória persistente...';
(async function restoreMemory(){
 if(new URLSearchParams(location.search).get('demo')==='1'){
   openShowcase();
   return;
 }
 try{
   const response=await fetch('/api/memory');
   if(!response.ok)throw new Error('Memória indisponível');
   const saved=await response.json();
   if(saved.lastPlan && typeof saved.lastPlan==='object'){
     document.querySelector('#command').value=saved.lastCommand||'';
     await applyPlan(saved.lastPlan);
     state.textContent=`Memória recuperada · malha: ${shape} · ${currentMetrics.triangles.toLocaleString('pt-BR')} triângulos`;
   }else{
     openShowcase(true);
   }
 }catch(error){
   openShowcase(true);
 }
})();

// GRID_SOUL_PERIODIC_CLICK_V1
const gsPeriodicRaycaster = new THREE.Raycaster();
const gsPeriodicPointer = new THREE.Vector2();

renderer.domElement.addEventListener('pointerdown', function(event) {
  if (!gsIsResting || !gsPeriodicMode || !gsPeriodicLabels) return;

  const rect = renderer.domElement.getBoundingClientRect();
  gsPeriodicPointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  gsPeriodicPointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  gsPeriodicRaycaster.setFromCamera(gsPeriodicPointer, camera);

  const hits = gsPeriodicRaycaster.intersectObjects(
    gsPeriodicLabels.children, false
  );
  if (!hits.length) return;

  event.preventDefault();
  event.stopPropagation();

  const element = hits[0].object.userData.element;
  if (!element) return;

  gsElement = gsElements.find(e => e.z === element.z) || element;
  gsFocusElement(element.z);
  gsBuildAtom(gsElement);

  const p = gsPeriodicPosition(element);
  gsAtom.visible = true;
  gsAtom.position.set(p.x, p.y, 0.35);
  gsAtom.scale.setScalar(0.65);

  controls.target.set(p.x, p.y, 0);
  camera.position.set(p.x, p.y + 0.6, 5.5);
  controls.update();

  state.textContent =
    `Elemento selecionado: ${element.s} · ${element.n} · Z=${element.z}`;
}, { capture: true });
