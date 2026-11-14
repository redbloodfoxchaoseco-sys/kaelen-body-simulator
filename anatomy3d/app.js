/* Kaelen · Anatomía 3D — herramienta anatómica digital
   Combina el retrato de Kaelen con el simulador corporal (datos reales ALBA):
   19 segmentos, capas (piel escamada · músculo · marco interno), sistemas
   (térmico · circulatorio · actuadores · estructural · centros simbólicos).
   Playground — no certificación. */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ---------- Datos ALBA ----------
const KA = {
  height: 3.6, mass: 2010, narrativeMass: 2050, legacyActuatorMass: 2090,
  muscleMass: 991.5, muscleVolume: 935.38, organMass: 200,
  bloodVolume: 155, waterVolume: 1254, actuators: 128,
  forceParam: 2506800, heatGen: 6390, heatDiss: 6358, netThermal: 32,
  zgArea: 8, tailInertia: 30, thermalCapacity: 6.7e6, tempLimit: 37.6,
  conductanceBaseline: 1000
};

const SEGMENTS = [
  ["head", 303, 40, 26, 37, 27, 0.02],
  ["neck", 304, 77, 38, 30, 35, 0.01],
  ["thorax", 307, 130, 99, 62, 61, 0.22],
  ["abdomen", 309, 203, 56, 56, 43, 0.14],
  ["pelvis", 310, 249, 61, 34, 43, 0.12],
  ["left_shoulder", 164, 86, 58, 51, 49, 0.05],
  ["right_shoulder", 453, 83, 64, 53, 52, 0.05],
  ["left_upper_arm", 112, 152, 53, 58, 46, 0.06],
  ["right_upper_arm", 511, 150, 53, 61, 47, 0.06],
  ["left_forearm", 84, 231, 47, 70, 42, 0.04],
  ["right_forearm", 544, 230, 49, 74, 44, 0.04],
  ["left_hand", 93, 308, 59, 64, 30, 0.01],
  ["right_hand", 511, 310, 74, 65, 33, 0.01],
  ["left_thigh", 257, 280, 47, 63, 40, 0.09],
  ["right_thigh", 358, 280, 47, 65, 41, 0.09],
  ["left_shin", 247, 345, 34, 40, 29, 0.03],
  ["right_shin", 371, 347, 35, 42, 30, 0.03],
  ["left_foot", 236, 389, 49, 19, 35, 0.01],
  ["right_foot", 380, 391, 46, 18, 35, 0.01]
];

const CENTERS = [
  ["crown", "Corona · Percepción", 303, 22, "#e7b581", "orientación y conciencia"],
  ["third_eye", "Mirada interna", 303, 34, "#9fd8ef", "atención y visión interior"],
  ["throat", "Voz · Expresión", 304, 66, "#7fd1c0", "comunicación y límite"],
  ["heart_core", "Corazón · Núcleo", 306, 130, "#e78a7a", "centro relacional y emocional"],
  ["solar_center", "Centro solar · Impulso", 308, 190, "#f0c674", "activación y voluntad"],
  ["root", "Raíz · Anclaje", 310, 258, "#8a6f5a", "estabilidad y presencia"],
  ["spine", "Columna · Eje central", 306, 155, "#b0bec5", "continuidad estructural"],
  ["aura_boundary", "Límite de campo", 306, 130, "#7fd1c0", "distinción yo/entorno"]
];

const FACTS = [
  ["Altura", "3.6 m"], ["Masa de diseño", "2010 kg"],
  ["Masa narrativa / legado", "2050 / 2090 kg"], ["Músculo", "991.5 kg · 935.38 L"],
  ["Órganos", "200 kg"], ["Volumen sanguíneo", "155 L"],
  ["Volumen de agua", "1254 L"], ["Actuadores", "128"],
  ["Parámetro de fuerza", "2 506 800 N"], ["Generación de calor", "6 390 W"],
  ["Disipación de calor", "6 358 W"], ["Residual térmico", "+32 W"],
  ["Área ZG", "8 m²"], ["Inercia de cola", "30 kg·m²"],
  ["Capacidad térmica", "6.7 MJ/K"], ["Límite de núcleo", "37.6 °C"]
];

const ACTIVITY = {
  rest: { gen: 1200, label: "Reposo" }, walk: { gen: 3200, label: "Marcha" },
  combat: { gen: 6390, label: "Combate (base ALBA)" }, overload: { gen: 12800, label: "Sobrecarga" }
};
const CASES = {
  baseline: { gen: 6390, k: 1000, e: 0, amb: 25, label: "Caso base" },
  evap: { gen: 6390, k: 1000, e: 6500, amb: 25, label: "Solo evaporación" },
  enhanced: { gen: 6390, k: 2500, e: 6500, amb: 25, label: "Mejorado" }
};

const G_ENV = 160, G_EVP = 209;

const CHAIN = [
  ["Músculo", 0.10], ["Tejido conectivo / piel escamada", 0.15], ["Contactos de escama", 0.15],
  ["Anclajes de placa", 0.20], ["Marco interno / huesos", 0.25], ["Torso / extremidades", 0.15], ["Suelo", 1]
];

// ---------- Física (idéntica al Simulador Corporal 1.0) ----------
const state = { gen: 6390, k: 1000, e: 0, amb: 25, ext: 0, view: "anatomy" };
const temps = { core: 34, muscle: 34.5, skin: 31 };
const history = [];
let simTime = 0;

function equilibrium() {
  const { gen, k, e, amb } = state;
  const core = amb + gen / G_ENV + gen / k - e / G_EVP;
  const muscle = core + (gen * 0.55) / k;
  const skin = Math.max(amb - 2, amb + (gen - e) / G_ENV);
  return { core, muscle, skin };
}
function verdict(core) {
  if (core <= KA.tempLimit) return { cls: "ok", text: "● dentro de límite" };
  if (core <= 40) return { cls: "warn2", text: "● marginal" };
  return { cls: "hot", text: "● FALLA (>37.6 °C)" };
}
function step(dt) {
  const eq = equilibrium();
  const tau = 900;
  for (const key of ["core", "muscle", "skin"])
    temps[key] += (eq[key] - temps[key]) * (dt / tau);
  simTime += dt;
}
function segTemp(seg, eq) {
  const w = seg[6];
  const torso = ["thorax", "abdomen", "pelvis", "neck", "head"].includes(seg[0]);
  if (torso) return eq.core - (seg[0] === "head" ? 2.2 : seg[0] === "neck" ? 0.8 : 0);
  return eq.core - 3.4 + w * 22;
}
function segStress(seg, load) {
  if (!load) return 0;
  const cap = KA.forceParam * (0.04 + seg[6] * 2.2);
  return Math.min(1.6, (load * 1000) / cap);
}
function tempColor(t) {
  const stops = [
    [24, [58, 96, 200]], [31, [64, 160, 190]], [37.6, [240, 178, 74]], [42, [255, 108, 92]], [50, [255, 60, 90]]
  ];
  let c = stops[stops.length - 1][1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t <= stops[i + 1][0]) {
      const [t0, c0] = stops[i], [t1, c1] = stops[i + 1];
      const f = Math.max(0, Math.min(1, (t - t0) / (t1 - t0)));
      c = c0.map((v, j) => Math.round(v + f * (c1[j] - v)));
      break;
    }
  }
  return new THREE.Color(c[0] / 255, c[1] / 255, c[2] / 255);
}

// ---------- Escena Three.js ----------
const stage = document.getElementById("stage");
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.info.autoReset = false;
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e16);
scene.fog = new THREE.FogExp2(0x0a0e16, 0.028);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(4.4, 2.3, 6.4);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1.85, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 1.6;
controls.maxDistance = 18;
controls.maxPolarAngle = Math.PI * 0.55;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.55;
controls.addEventListener('start', () => { controls.autoRotate = false; });

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// Luces: clave cálida + contraluz cian + luz de suelo (anillos de energía)
scene.add(new THREE.HemisphereLight(0x22365a, 0x0a0e16, 0.55));
const key = new THREE.DirectionalLight(0xffd9a0, 1.15); key.position.set(4, 6, 5); scene.add(key);
const rim = new THREE.PointLight(0x4fd8e8, 22, 30); rim.position.set(-5, 3.4, -4.5); scene.add(rim);
const groundGlow = new THREE.PointLight(0x4fd8e8, 14, 9); groundGlow.position.set(0, 0.25, 0.4); scene.add(groundGlow);

// ---------- Utilidades de conversión (cm → m, centrado en X=314) ----------
const CX = 314, GY = 391;
const P = (x, y, z = 0) => new THREE.Vector3((x - CX) / 100, (GY - y) / 100, z / 100);
const segCenter = (seg) => P(seg[1], seg[2]);

// ---------- Suelo: anillos de energía (del retrato) ----------
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(5.2, 64),
  new THREE.MeshStandardMaterial({ color: 0x0b1322, roughness: 0.85, metalness: 0.2 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const ringMat = () => new THREE.MeshBasicMaterial({ color: 0x4fd8e8, transparent: true, opacity: 0.5, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
const energyRings = [];
[1.35, 2.35, 3.4].forEach((r, i) => {
  const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.018 + i * 0.008, 96), ringMat());
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.012 + i * 0.004;
  scene.add(ring);
  energyRings.push(ring);
});
// red geométrica radial (constelación del retrato)
{
  const pts = [];
  const N = 24;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, a2 = ((i + 7) % N) / N * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * 4.6, 0.02, Math.sin(a) * 4.6));
    pts.push(new THREE.Vector3(Math.cos(a2) * 4.6, 0.02, Math.sin(a2) * 4.6));
    pts.push(new THREE.Vector3(Math.cos(a) * 1.35, 0.02, Math.sin(a) * 1.35));
    pts.push(new THREE.Vector3(Math.cos(a) * 4.6, 0.02, Math.sin(a) * 4.6));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const net = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x2a6a7a, transparent: true, opacity: 0.3 }));
  scene.add(net);
}

// ---------- Cuerpo: 19 segmentos × 3 capas ----------
const bodyGroup = new THREE.Group();
scene.add(bodyGroup);

const sphereGeo = new THREE.SphereGeometry(1, 28, 18);
const muscleMat = new THREE.MeshStandardMaterial({ color: 0x8a2634, roughness: 0.62, metalness: 0.08, envMapIntensity: 0.35 });
const skeletonMat = new THREE.MeshStandardMaterial({ color: 0x9aa8ba, roughness: 0.35, metalness: 0.65, envMapIntensity: 0.7 });
const SKIN_BRONZE = new THREE.Color(0xb8863b);

const segMeshes = []; // [mesh piel, seg] para raycast y mapa térmico
const skinMats = new Map(); // nombre → material piel

for (const seg of SEGMENTS) {
  const [name, , , rx, ry, d] = seg;
  const c = segCenter(seg);
  const group = new THREE.Group();
  group.position.copy(c);

  const skinMat = new THREE.MeshStandardMaterial({ color: SKIN_BRONZE.clone(), roughness: 0.3, metalness: 0.72, envMapIntensity: 0.85, transparent: true });
  skinMats.set(name, skinMat);

  let skinMesh;
  if (name === "head") {
    skinMesh = buildFoxHead(skinMat);
  } else {
    skinMesh = new THREE.Mesh(sphereGeo, skinMat);
    skinMesh.scale.set(rx / 100, ry / 100, d / 100);
  }
  skinMesh.userData.seg = seg;
  group.add(skinMesh);
  segMeshes.push(skinMesh);

  const muscle = new THREE.Mesh(sphereGeo, muscleMat);
  muscle.scale.set(rx / 100 * 0.8, ry / 100 * 0.94, d / 100 * 0.78);
  group.add(muscle);

  const bone = new THREE.Mesh(sphereGeo, skeletonMat);
  bone.scale.set(rx / 100 * 0.28, ry / 100 * 0.96, d / 100 * 0.24);
  group.add(bone);

  bodyGroup.add(group);
}

function buildFoxHead(skinMat) {
  const head = new THREE.Group();
  const furMat = new THREE.MeshStandardMaterial({ color: 0xd97840, roughness: 0.85, metalness: 0 });
  const creamMat = new THREE.MeshStandardMaterial({ color: 0xf0e8dc, roughness: 0.85, metalness: 0 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2320, roughness: 0.6, metalness: 0 });

  const skull = new THREE.Mesh(sphereGeo, furMat); skull.scale.setScalar(0.155); head.add(skull);
  const muzzle = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.2, 20), creamMat);
  muzzle.rotation.x = Math.PI / 2; muzzle.position.set(0, -0.03, 0.17); head.add(muzzle);
  const nose = new THREE.Mesh(sphereGeo, darkMat); nose.scale.setScalar(0.028); nose.position.set(0, -0.03, 0.27); head.add(nose);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 4), furMat);
    ear.position.set(s * 0.09, 0.17, 0.02); ear.rotation.z = s * 0.22; head.add(ear);
    const eye = new THREE.Mesh(sphereGeo, darkMat); eye.scale.setScalar(0.016); eye.position.set(s * 0.065, 0.03, 0.135); head.add(eye);
  }
  // placas doradas del cuello (anillo de escamas)
  const neckRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 10, 24), skinMat);
  neckRing.rotation.x = Math.PI / 2; neckRing.position.y = -0.13; head.add(neckRing);
  head.userData.isHead = true;
  return head;
}

// ---------- Cola (inercia 30 kg·m²) ----------
const tailGroup = new THREE.Group();
{
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.12, 1.42, -0.3),
    new THREE.Vector3(0.42, 1.15, -0.55),
    new THREE.Vector3(0.25, 1.95, -0.78),
    new THREE.Vector3(-0.32, 2.55, -0.66)
  ]);
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xa87830, roughness: 0.32, metalness: 0.7, envMapIntensity: 0.8 });
  const tipMat = new THREE.MeshStandardMaterial({ color: 0x5c2430, roughness: 0.4, metalness: 0.4 });
  const n = 15;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const m = new THREE.Mesh(sphereGeo, t > 0.82 ? tipMat : tailMat);
    m.position.copy(curve.getPoint(t));
    m.scale.setScalar(0.23 * (1 - t) + 0.055);
    tailGroup.add(m);
  }
}
bodyGroup.add(tailGroup);

// ---------- Sistema circulatorio (155 L) ----------
const circGroup = new THREE.Group();
{
  const heart = new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({ color: 0x8a1f2a, emissive: 0xc03040, emissiveIntensity: 1.2, roughness: 0.4 }));
  heart.scale.setScalar(0.085);
  heart.position.set(0.04, 2.62, 0.05);
  circGroup.add(heart);
  circGroup.userData.heart = heart;

  const vesselMat = new THREE.MeshStandardMaterial({ color: 0x6a1a24, emissive: 0xa13040, emissiveIntensity: 0.7, roughness: 0.5 });
  const heartPos = heart.position.clone();
  for (const seg of SEGMENTS) {
    const target = segCenter(seg);
    const mid = heartPos.clone().lerp(target, 0.5);
    mid.z += 0.14; mid.x += (target.x - heartPos.x) * 0.25;
    const curve = new THREE.CatmullRomCurve3([heartPos, mid, target]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.012, 5), vesselMat);
    circGroup.add(tube);
  }
}
scene.add(circGroup);

// ---------- Actuadores (128) ----------
const actGroup = new THREE.Group();
{
  const total = SEGMENTS.reduce((s, seg) => s + seg[6], 0);
  const counts = SEGMENTS.map(seg => Math.max(1, Math.round(128 * seg[6] / total)));
  let drift = 128 - counts.reduce((a, b) => a + b, 0);
  const maxI = counts.indexOf(Math.max(...counts));
  counts[maxI] += drift;

  const actMat = new THREE.MeshStandardMaterial({ color: 0xc9963c, emissive: 0xc9963c, emissiveIntensity: 1.6, roughness: 0.3, metalness: 0.6 });
  const inst = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.02), actMat, 128);
  const m4 = new THREE.Matrix4();
  let i = 0;
  SEGMENTS.forEach((seg, si) => {
    const c = segCenter(seg), [name, , , rx, ry, d] = seg;
    for (let k = 0; k < counts[si] && i < 128; k++, i++) {
      const v = new THREE.Vector3().randomDirection();
      v.x *= rx / 100 * 0.72; v.y *= ry / 100 * 0.8; v.z *= d / 100 * 0.7;
      m4.setPosition(c.x + v.x, c.y + v.y, c.z + v.z);
      inst.setMatrixAt(i, m4);
    }
  });
  inst.instanceMatrix.needsUpdate = true;
  actGroup.add(inst);
  actGroup.userData.mat = actMat;
}
scene.add(actGroup);

// ---------- Centros simbólicos (8) ----------
const centersGroup = new THREE.Group();
const centerOrbs = [];
function makeHaloSprite(color) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, color + 'ff'); grad.addColorStop(0.35, color + '66'); grad.addColorStop(1, color + '00');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  sp.scale.setScalar(0.42);
  return sp;
}
for (const [id, label, x, y, color, fn] of CENTERS) {
  const pos = P(x, y, 34);
  const col = new THREE.Color(color);
  const orb = new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 2.2, roughness: 0.3 }));
  orb.scale.setScalar(0.032);
  orb.position.copy(pos);
  const halo = makeHaloSprite(color);
  halo.position.copy(pos);
  centersGroup.add(orb); centersGroup.add(halo);
  centerOrbs.push({ id, label, fn, color, orb, halo });
}
scene.add(centersGroup);

// etiquetas de centros (sprites de texto)
const labelsGroup = new THREE.Group();
await document.fonts.ready;
for (const o of centerOrbs) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.font = '600 44px Satoshi, sans-serif';
  g.fillStyle = o.color;
  g.shadowColor = 'rgba(0,0,0,0.9)'; g.shadowBlur = 8;
  g.textBaseline = 'middle';
  g.fillText(o.label, 10, 64);
  const tex = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(1.3, 0.325, 1);
  sp.position.copy(o.orb.position).add(new THREE.Vector3(0.62, 0.05, 0.2));
  labelsGroup.add(sp);
}
scene.add(labelsGroup);

// ---------- Partículas de calor ----------
const heatGroup = new THREE.Group();
const heatCount = 260;
const heatGeo = new THREE.BufferGeometry();
const heatPos = new Float32Array(heatCount * 3);
const heatLife = new Float32Array(heatCount);
heatGeo.setAttribute('position', new THREE.BufferAttribute(heatPos, 3));
const heatMat = new THREE.PointsMaterial({ color: 0xff9d5c, size: 0.03, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
const heatPoints = new THREE.Points(heatGeo, heatMat);
heatGroup.add(heatPoints);
const hotSegs = () => ["thorax", "abdomen", "pelvis", "left_thigh", "right_thigh", "left_shoulder", "right_shoulder"];
function spawnHeat(i) {
  const segs = hotSegs();
  const seg = SEGMENTS.find(s => s[0] === segs[Math.floor(Math.random() * segs.length)]);
  const c = segCenter(seg);
  heatPos[i * 3] = c.x + (Math.random() - 0.5) * seg[3] / 60;
  heatPos[i * 3 + 1] = c.y + (Math.random() - 0.5) * 0.3;
  heatPos[i * 3 + 2] = c.z + (Math.random() - 0.5) * seg[5] / 50;
  heatLife[i] = 1;
}

// ---------- Postprocesado: bloom ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.5, 0.78);
composer.addPass(bloom);

// ---------- UI: capas y sistemas ----------
const layers = { skin: true, muscle: true, skeleton: true };
const systems = { thermal: false, circulatory: false, actuators: false, centers: false, labels: false };

function applyLayers() {
  for (const seg of SEGMENTS) {
    const g = bodyGroup.children.find(c => c.position.equals(segCenter(seg)));
    if (!g) continue;
    g.children.forEach(m => {
      if (m.userData.isHead) { m.visible = layers.skin; return; }
      const isSkin = skinMats.get(seg[0]) && m.material === skinMats.get(seg[0]);
      if (isSkin) m.visible = layers.skin;
      else if (m.material === muscleMat) m.visible = layers.muscle;
      else if (m.material === skeletonMat) m.visible = layers.skeleton;
    });
  }
  tailGroup.visible = layers.skin;
  const op = +document.getElementById("skinOpacity").value / 100;
  skinMats.forEach(m => {
    m.opacity = layers.skin ? op : 0;
    m.transparent = op < 1;
    m.depthWrite = op >= 0.6;
  });
}
function applySystems() {
  circGroup.visible = systems.circulatory;
  actGroup.visible = systems.actuators;
  centersGroup.visible = systems.centers;
  labelsGroup.visible = systems.centers && systems.labels;
  heatGroup.visible = systems.thermal;
}

// colores por vista
function paintBody() {
  const eq = equilibrium();
  for (const seg of SEGMENTS) {
    const m = skinMats.get(seg[0]);
    if (state.view === "thermal" || systems.thermal) {
      m.color.copy(tempColor(segTemp(seg, eq)));
      m.metalness = 0.25; m.roughness = 0.5;
    } else if (state.view === "structural") {
      const s = segStress(seg, state.ext);
      m.color.set(s <= 0 ? 0x233250 : s < 0.7 ? 0x2f5d8a : s < 1 ? 0xc9963f : 0xd05060);
      m.metalness = 0.45; m.roughness = 0.4;
    } else {
      m.color.copy(SKIN_BRONZE);
      m.metalness = 0.72; m.roughness = 0.3;
    }
  }
}

// ---------- Inspector (raycast) ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tip = document.getElementById("tipBox");
const inspector = document.getElementById("inspector");

function inspect(ev, seg) {
  const eq = equilibrium();
  const t = segTemp(seg, eq);
  const s = segStress(seg, state.ext);
  const massKg = seg[6] * KA.muscleMass;
  const over = t > KA.tempLimit;
  tip.style.display = "block";
  const r = canvas.getBoundingClientRect();
  tip.style.left = Math.min(ev.clientX - r.left + 16, r.width - 240) + "px";
  tip.style.top = Math.max(4, ev.clientY - r.top - 10) + "px";
  tip.innerHTML = `<b>${seg[0].replace(/_/g, " ")}</b><br>
    m° músculo ≈ ${massKg.toFixed(0)} kg<br>
    T segmento ≈ ${t.toFixed(1)} °C ${over ? '<span class="warn">⚠ sobre límite</span>' : ""}<br>
    ${state.view === "structural" ? `estrés ≈ ${(s * 100).toFixed(0)} % capacidad` : ""}`;
  inspector.innerHTML = `
    <div class="insp-name">${seg[0].replace(/_/g, " ")}</div>
    <div class="insp-grid">
      <div class="insp-item"><span class="k">Músculo</span><span class="v">${massKg.toFixed(0)} kg</span></div>
      <div class="insp-item"><span class="k">Temperatura</span><span class="v ${over ? 'warn' : ''}">${t.toFixed(1)} °C</span></div>
      <div class="insp-item"><span class="k">Estrés</span><span class="v">${(s * 100).toFixed(0)} %</span></div>
      <div class="insp-item"><span class="k">Volumen</span><span class="v">${(seg[3] * seg[4] * seg[5] / 1000).toFixed(0)} L</span></div>
    </div>`;
}
canvas.addEventListener("pointermove", (ev) => {
  const r = canvas.getBoundingClientRect();
  pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(segMeshes.filter(m => m.visible), false);
  if (hits.length) { inspect(ev, hits[0].object.userData.seg); if (window.assistantReady) assistantOnSegment(hits[0].object.userData.seg); }
  else tip.style.display = "none";
});
canvas.addEventListener("pointerleave", () => { tip.style.display = "none"; });

// clic en centros simbólicos → explicación profunda
canvas.addEventListener("pointerdown", (ev) => {
  if (!centersGroup.visible) return;
  const r = canvas.getBoundingClientRect();
  pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(centerOrbs.map(o => o.orb), false);
  if (hits.length && window.assistantReady) {
    const orb = centerOrbs.find(o => o.orb === hits[0].object);
    if (orb) assistantOnCenter(orb);
  }
});

// ---------- Controles de simulación ----------
const fmt = (n) => n.toLocaleString("es");
function updateOutputs() {
  document.getElementById("kOut").textContent = fmt(state.k) + " W/K";
  document.getElementById("eOut").textContent = fmt(state.e) + " W";
  document.getElementById("ambOut").textContent = state.amb + " °C";
  document.getElementById("extOut").textContent = fmt(state.ext) + " kN";
}
function updateHeader() {
  const v = verdict(temps.core);
  document.getElementById("mGen").textContent = fmt(state.gen) + " W";
  const coreEl = document.getElementById("mCore");
  coreEl.textContent = temps.core.toFixed(1) + " °C";
  coreEl.className = "m-value " + v.cls;
  document.getElementById("mLoad").textContent = (state.ext / 25).toFixed(0) + " %";
  const ve = document.getElementById("mVerdict");
  ve.textContent = v.text; ve.className = "m-value " + v.cls;
}
function syncSliders() {
  document.getElementById("kSlider").value = state.k;
  document.getElementById("eSlider").value = state.e;
  document.getElementById("ambSlider").value = state.amb;
  document.getElementById("extSlider").value = state.ext;
  updateOutputs();
}
function resetSim() {
  simTime = 0; history.length = 0;
  temps.core = 34; temps.muscle = 34.5; temps.skin = Math.max(state.amb - 2, 29);
}
function setCase(name) {
  const c = CASES[name];
  Object.assign(state, { gen: c.gen, k: c.k, e: c.e, amb: c.amb });
  syncSliders(); resetSim();
  document.querySelectorAll("[data-case]").forEach(b => b.classList.toggle("active", b.dataset.case === name));
  document.querySelectorAll("[data-act]").forEach(b => b.classList.remove("active"));
  if (window.assistantReady) assistantOnCase(name);
}
function setActivity(name) {
  state.gen = ACTIVITY[name].gen;
  syncSliders();
  document.querySelectorAll("[data-act]").forEach(b => b.classList.toggle("active", b.dataset.act === name));
  document.querySelectorAll("[data-case]").forEach(b => b.classList.remove("active"));
  if (window.assistantReady) assistantOnActivity(name);
}

// cadena de carga (redistribución por deformación)
function updateLoadPath() {
  const box = document.getElementById("loadPathBox");
  const chainEl = document.getElementById("loadChain");
  if (state.view !== "structural") { box.hidden = true; return; }
  box.hidden = false;
  const loadN = state.ext * 1000;
  const deform = Math.min(1, loadN / (KA.forceParam * 0.6));
  chainEl.innerHTML = "";
  CHAIN.forEach(([name, share], i) => {
    if (i >= CHAIN.length - 1) return;
    const effShare = i === 3 ? share + deform * 0.10 : i === 1 ? share - deform * 0.06 : share;
    const carried = loadN * effShare;
    const cap = KA.forceParam * effShare * 3.2;
    const node = document.createElement("div");
    node.className = "chain-node" + (carried > cap ? " fail" : "");
    node.innerHTML = `<span class="pct">${(carried / 1000).toFixed(0)} kN</span>${name}`;
    chainEl.appendChild(node);
    if (i < CHAIN.length - 2) {
      const arrow = document.createElement("span");
      arrow.className = "chain-arrow"; arrow.textContent = "→";
      chainEl.appendChild(arrow);
    }
  });
}

// gráfica térmica
const chart = document.getElementById("thermalChart");
const cctx = chart.getContext("2d");
function drawChart() {
  const W = chart.width, H = chart.height, padL = 40, padR = 10, padT = 12, padB = 24;
  cctx.clearRect(0, 0, W, H);
  const tMin = 20, tMax = Math.max(50, Math.ceil(Math.max(...history.flatMap(h => [h.core, h.muscle, h.skin]), 41) / 10) * 10);
  const tStart = history.length ? history[0].t : 0;
  const tMaxX = Math.max(10, (simTime - tStart) / 60);
  const X = (t) => padL + ((t - tStart) / 60 / tMaxX) * (W - padL - padR);
  const Y = (v) => padT + (1 - (v - tMin) / (tMax - tMin)) * (H - padT - padB);
  cctx.strokeStyle = "#1c2740"; cctx.fillStyle = "#8b96ad"; cctx.font = "10px system-ui"; cctx.lineWidth = 1;
  for (let v = Math.ceil(tMin / 10) * 10; v <= tMax; v += 10) {
    cctx.beginPath(); cctx.moveTo(padL, Y(v)); cctx.lineTo(W - padR, Y(v)); cctx.stroke();
    cctx.fillText(v + " °C", 4, Y(v) + 3);
  }
  cctx.textAlign = "left";
  const stepMin = Math.max(5, Math.round(tMaxX / 4 / 5) * 5);
  for (let m = 0; m <= tMaxX + 0.001; m += stepMin) {
    const lx = Math.min(X(tStart + m * 60) - 10, W - padR - 30);
    cctx.fillText(m + " min", lx, H - 6);
  }
  cctx.textAlign = "start";
  cctx.strokeStyle = "#ff5c7a"; cctx.setLineDash([5, 4]);
  cctx.beginPath(); cctx.moveTo(padL, Y(KA.tempLimit)); cctx.lineTo(W - padR, Y(KA.tempLimit)); cctx.stroke();
  cctx.setLineDash([]);
  cctx.fillStyle = "#ff5c7a"; cctx.fillText("límite 37.6", W - padR - 66, Y(KA.tempLimit) - 4);
  for (const [key, color] of [["core", "#56c8ff"], ["muscle", "#ff9d5c"], ["skin", "#7fe3a0"]]) {
    if (history.length < 2) continue;
    cctx.strokeStyle = color; cctx.lineWidth = 1.6;
    cctx.beginPath();
    history.forEach((h, i) => { const x = X(h.t), y = Y(h[key]); i ? cctx.lineTo(x, y) : cctx.moveTo(x, y); });
    cctx.stroke();
  }
}

// ---------- Vistas ----------
const HINTS = {
  anatomy: "Anatomía por capas — desactiva la piel para ver músculo y marco interno",
  thermal: "Mapa térmico en vivo — pasa el cursor por los segmentos para su estado",
  structural: "Ajusta la carga externa — la redistribución depende de la deformación",
  centers: "Centros simbólicos de Kaelen — identidad, percepción y coherencia"
};
function setView(name) {
  state.view = name;
  document.querySelectorAll(".tab").forEach(t => {
    const on = t.dataset.view === name;
    t.classList.toggle("active", on);
    t.setAttribute("aria-selected", on);
  });
  document.getElementById("vizHint").textContent = HINTS[name];
  systems.thermal = name === "thermal";
  systems.circulatory = name === "centers" ? systems.circulatory : systems.circulatory;
  systems.centers = name === "centers";
  if (name === "centers") systems.labels = true;
  document.getElementById("sysThermal").checked = systems.thermal;
  document.getElementById("sysCenters").checked = systems.centers;
  document.getElementById("sysLabels").checked = systems.labels;
  document.querySelectorAll(".panel-block").forEach(b => {
    if (b.contains(document.getElementById("loadPathBox")))
      b.classList.toggle("open", name === "structural");
  });
  applySystems(); applyLayers(); paintBody(); updateLoadPath();
  if (window.assistantReady) assistantOnView(name);
}

// ---------- Eventos UI ----------
document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => setView(t.dataset.view)));
document.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => setActivity(b.dataset.act)));
document.querySelectorAll("[data-case]").forEach(b => b.addEventListener("click", () => setCase(b.dataset.case)));
document.getElementById("resetBtn").addEventListener("click", () => { resetSim(); });

document.getElementById("layerSkin").addEventListener("change", e => { layers.skin = e.target.checked; applyLayers(); if (window.assistantReady) assistantOnLayer("skin", layers.skin); });
document.getElementById("layerMuscle").addEventListener("change", e => { layers.muscle = e.target.checked; applyLayers(); if (window.assistantReady) assistantOnLayer("muscle", layers.muscle); });
document.getElementById("layerSkeleton").addEventListener("change", e => { layers.skeleton = e.target.checked; applyLayers(); });
document.getElementById("skinOpacity").addEventListener("input", applyLayers);
document.getElementById("sysThermal").addEventListener("change", e => { systems.thermal = e.target.checked; applySystems(); paintBody(); if (window.assistantReady) assistantOnSystem("thermal", systems.thermal); });
document.getElementById("sysCirculatory").addEventListener("change", e => { systems.circulatory = e.target.checked; applySystems(); if (window.assistantReady) assistantOnSystem("circulatory", systems.circulatory); });
document.getElementById("sysActuators").addEventListener("change", e => { systems.actuators = e.target.checked; applySystems(); if (window.assistantReady) assistantOnSystem("actuators", systems.actuators); });
document.getElementById("sysCenters").addEventListener("change", e => { systems.centers = e.target.checked; applySystems(); if (window.assistantReady) assistantOnSystem("centers", systems.centers); });
document.getElementById("sysLabels").addEventListener("change", e => { systems.labels = e.target.checked; applySystems(); });
document.getElementById("kSlider").addEventListener("input", e => { state.k = +e.target.value; updateOutputs(); document.querySelectorAll("[data-case]").forEach(b => b.classList.remove("active")); });
document.getElementById("eSlider").addEventListener("input", e => { state.e = +e.target.value; updateOutputs(); document.querySelectorAll("[data-case]").forEach(b => b.classList.remove("active")); });
document.getElementById("ambSlider").addEventListener("input", e => { state.amb = +e.target.value; updateOutputs(); });
document.getElementById("extSlider").addEventListener("input", e => { state.ext = +e.target.value; updateOutputs(); paintBody(); updateLoadPath(); });

// acordeones y paneles móviles
document.querySelectorAll(".panel-title").forEach(h =>
  h.addEventListener("click", () => h.parentElement.classList.toggle("open")));
document.getElementById("leftToggle").addEventListener("click", () => {
  document.getElementById("leftPanel").classList.toggle("open-mobile");
  document.getElementById("rightPanel").classList.remove("open-mobile");
});
document.getElementById("rightToggle").addEventListener("click", () => {
  document.getElementById("rightPanel").classList.toggle("open-mobile");
  document.getElementById("leftPanel").classList.remove("open-mobile");
});

// tabla de datos
const factsTable = document.getElementById("factsTable");
FACTS.forEach(([k, v]) => {
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${k}</td><td>${v}</td>`;
  factsTable.appendChild(tr);
});

// ---------- Naturaleza → Poder (asimilación del diseño de personaje) ----------
const ABILITIES = [
  ["P", "Pasiva · Equilibrio Térmico", "El calor de cada habilidad sube de 0 a 100. A 100: venteo forzado — silencio de 3 s. El límite de 37.6 °C hecho regla de juego.", "assets/icon-passive.png", `La pasiva es el <b>corazón térmico de ALBA</b>: el mismo cuerpo que en el simulador falla a ~71 °C sin gestión, aquí obliga a Kaelen a detenerse. Sin CC duro, kiteable, ventanas predecibles — fuerte pero justo.`],
  ["Q", "Lanza Térmica", "Proyecta hacia fuera el calor que el cuerpo no puede retener: línea de daño térmico. Sobre 60 de calor también ralentiza.", "assets/icon-q.png", `La <b>Voz</b> hecha arma: lo que amenaza por dentro se proyecta hacia fuera. Números LoL: 60/95/130/165/200 (+40% AP).`],
  ["W", "Placas de Escama", "Escudo que crece 40% estando quieto y se reduce al moverse. La cadena de carga estructural convertida en defensa.", "assets/icon-w.png", `La <b>Raíz</b>: anclaje estructural real — el mismo principio de la vista Estructural del simulador (2.5 MN de parámetro de fuerza). Anti-roaming natural: moverse cuesta.`],
  ["E", "Eco Topológico", "Deja un eco de memoria en el origen; tras 1 s pulsa en área. Puede regresar al eco una vez.", "assets/icon-e.png", `La <b>Mirada interna</b>: el cuerpo recuerda la topología del espacio. No es teleportación — es memoria con fronteras.`],
  ["R", "Guardián de Coherencia", "Zona (radio 550, 5 s): aliados reciben menos daño mientras Kaelen permanezca dentro. Proteger exige quedarse.", "assets/icon-r.png", `El <b>Núcleo</b>: proteger coherencia tiene costo de presencia. Si sale de la zona, se disipa. El Pacto hecho ultimate: no proteger desde fuera.`, ]
];
const abilitiesEl = document.getElementById("abilities");
ABILITIES.forEach(([key, name, desc, icon, deep]) => {
  const div = document.createElement("div");
  div.className = "ability";
  div.innerHTML = `<img src="${icon}" alt="${name}" width="40" height="40"><div><div class="ab-name">${key} · ${name}</div><div class="ab-desc">${desc}</div></div>`;
  div.addEventListener("click", () => A.say("ab-" + key, `<b>${name}</b><br>${deep}`));
  abilitiesEl.appendChild(div);
});

// glosario de conceptos ALBA
const GLOSSARY = [
  ["Equilibrio térmico", "6390 W de generación contra 6358 W de disipación: residual de +32 W. El límite de diseño es 37.6 °C en núcleo, no más que meros minutos."],
  ["Cadena de carga", "Músculo → piel escamada → contactos de escama → anclajes de placa → marco interno → suelo. La redistribución depende de la deformación: a mayor carga, los anclajes toman más (2 506 800 N de parámetro)."],
  ["Memoria topológica", "El cuerpo graba la forma del espacio recorrido. No predice: recuerda. De ahí el Eco Topológico y los ecos holográficos de KA-EL3N en Cyberpunk."],
  ["Coherencia", "Integridad del ser y de quienes custodia. Toda la R del personaje existe para protegerla — y exige presencia, no distancia."],
  ["El Pacto", "No extraer sin devolver · no imponer una forma · no esclavizar · recordar · proteger coherencia · dejar ir · no convertirse en dios · aceptar muerte de la fuente · auditar al auditor. La constitución de Kaelen."]
];
const glossaryEl = document.getElementById("glossary");
GLOSSARY.forEach(([term, def]) => {
  const dt = document.createElement("dt"); dt.textContent = term;
  const dd = document.createElement("dd"); dd.textContent = def;
  glossaryEl.appendChild(dt); glossaryEl.appendChild(dd);
});

// ---------- Redimensionado ----------
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
new ResizeObserver(resize).observe(stage);

// ---------- Depuración (FPS / draw calls) ----------
const dbg = document.createElement("div");
dbg.style.cssText = 'position:absolute;top:8px;right:8px;z-index:5;background:rgba(0,0,0,.72);color:#7fe3a0;font:11px/1.5 monospace;padding:5px 9px;pointer-events:none;white-space:pre;border-radius:6px;';
stage.appendChild(dbg);
let frames = 0, lastT = performance.now(), lastFrame = performance.now(), ftMax = 0;
function updateDebug() {
  const now = performance.now();
  const ft = now - lastFrame; lastFrame = now; ftMax = Math.max(ftMax, ft);
  frames++;
  if (now - lastT >= 1000) {
    const fps = frames * 1000 / (now - lastT);
    const info = renderer.info;
    dbg.textContent = `FPS:${fps.toFixed(0)} Frame:${ft.toFixed(1)}ms (max ${ftMax.toFixed(1)}ms)\nDraw:${info.render.calls} Tri:${info.render.triangles} Geo:${info.memory.geometries} Tex:${info.memory.textures}`;
    frames = 0; ftMax = 0; lastT = now;
  }
}

// ---------- Bucle ----------
setActivity("combat");
setCase("baseline");
setView("anatomy");
resize();
const clock = new THREE.Clock();
let heatIdx = 0;

function update(dt) {
  step(30);
  for (let i = 0; i < 3; i++) history.push({ t: simTime, ...temps });
  if (history.length > 600) history.splice(0, history.length - 600);
  updateHeader();
  paintBody();
  drawChart();
  if (window.assistantReady) assistantWatchVerdict();

  const t = clock.elapsedTime;
  // pulso circulatorio
  if (circGroup.visible) {
    const pulse = 0.55 + 0.45 * Math.max(0, Math.sin(t * (2 + state.gen / 3000)));
    circGroup.traverse(o => { if (o.material?.emissiveIntensity !== undefined) o.material.emissiveIntensity = pulse * 1.2; });
  }
  // pulso de actuadores según generación
  if (actGroup.visible)
    actGroup.userData.mat.emissiveIntensity = 1 + Math.max(0, Math.sin(t * state.gen / 1400)) * 1.4;
  // centros: halo pulsante
  if (centersGroup.visible)
    centerOrbs.forEach((o, i) => {
      const s = 0.36 + 0.08 * Math.sin(t * 2 + i * 0.8);
      o.halo.scale.setScalar(s);
    });
  // anillos de energía
  energyRings.forEach((r, i) => { r.material.opacity = 0.3 + 0.22 * Math.sin(t * 1.4 + i * 1.1); });
  groundGlow.intensity = 10 + 5 * Math.sin(t * 1.4);
  // partículas de calor
  if (heatGroup.visible && temps.core > 33.5) {
    for (let i = 0; i < heatCount; i++) {
      if (heatLife[i] <= 0 && Math.random() < 0.05) spawnHeat(i);
      if (heatLife[i] > 0) {
        heatLife[i] -= dt * 0.35;
        heatPos[i * 3 + 1] += dt * 0.55;
      }
    }
    heatGeo.attributes.position.needsUpdate = true;
    heatMat.opacity = Math.min(0.85, Math.max(0.1, (temps.core - 34) / 4));
  }
  // cola: balanceo suave (inercia propia)
  tailGroup.rotation.y = Math.sin(t * 0.7) * 0.05;
}

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.1);
  controls.update();
  update(dt);
  renderer.info.reset();
  composer.render();
  updateDebug();
}
frame();

// ---------- Asistente ALBA ----------
const A = {
  panel: document.getElementById("assistantPanel"),
  fab: document.getElementById("assistantFab"),
  log: document.getElementById("assistantLog"),
  actionsEl: document.getElementById("assistantActions"),
  said: new Set(),
  lastSeg: null,
  lastVerdict: "ok",
  open: false,
  say(id, html, actions) {
    if (this.said.has(id)) return;
    this.said.add(id);
    const div = document.createElement("div");
    div.className = "msg";
    div.innerHTML = html + `<div class="msg-timestamp">${new Date().toLocaleTimeString("es")}</div>`;
    this.log.appendChild(div);
    this.log.scrollTop = this.log.scrollHeight;
    while (this.log.children.length > 14) this.log.firstChild.remove();
    this.renderActions(actions || []);
    if (this.open) this.flash();
  },
  renderActions(actions) {
    this.actionsEl.innerHTML = "";
    actions.forEach(([label, fn]) => {
      const b = document.createElement("button");
      b.className = "chip";
      b.textContent = label;
      b.addEventListener("click", fn);
      this.actionsEl.appendChild(b);
    });
  },
  flash() {
    this.fab.style.boxShadow = "0 8px 28px rgba(0,0,0,0.5), 0 0 26px rgba(79,216,232,0.45)";
    setTimeout(() => this.fab.style.boxShadow = "", 900);
  },
  toggle(force) {
    this.open = force !== undefined ? force : !this.open;
    this.panel.hidden = !this.open;
    this.fab.style.display = this.open ? "none" : "flex";
    this.fab.setAttribute("aria-expanded", this.open);
    if (this.open) this.log.scrollTop = this.log.scrollHeight;
  }
};
A.fab.addEventListener("click", () => A.toggle());
document.getElementById("assistantClose").addEventListener("click", () => A.toggle(false));

const VIEW_EXPLAIN = {
  anatomy: `Estás en <b>anatomía por capas</b>: piel escamada → músculo (<span class="em">991.5 kg</span>) → marco interno. Kaelen mide <b>3.6 m</b> y pesa <b>2010 kg</b>. Prueba a bajar la opacidad de la piel o desactivarla.`,
  thermal: `<b>Mapa térmico</b> en vivo: modelo de 3 regiones (núcleo · músculo · piel) calibrado a los tests ALBA. El límite de diseño es <b>37.6 °C</b> en núcleo — el color ámbar/rojo marca los segmentos que lo superan.`,
  structural: `<b>Vista estructural</b>: la cadena de carga va músculo → piel escamada → contactos → anclajes → marco interno → suelo, con parámetro de fuerza de <span class="em">2 506 800 N</span>. Sube la carga externa y observa la redistribución.`,
  centers: `Los <b>8 centros simbólicos</b> (corona, mirada interna, voz, núcleo, centro solar, raíz, columna, límite de campo) son la identidad de Kaelen: percepción, coherencia y anclaje. Cada uno gobierna un aspecto del ser.`
};
const CASE_EXPLAIN = {
  baseline: `<b>Caso base</b> (K=1000 W/K, sin evaporación): documentado como <span class="warn">FALLA</span> — pico de ~71 °C. El músculo de 991.5 kg genera 6390 W que la piel sola no puede evacuar.`,
  evap: `<b>Solo evaporación</b> (E=6500 W): también <span class="warn">falla</span> (~40 °C). El agua de 1254 L ayuda, pero sin transporte interno mejorado no basta.`,
  enhanced: `<b>Caso mejorado</b> (K=2500 W/K + E=6500 W): <b>PASA</b> — ~37 °C, dentro del límite de 37.6 °C. Esta es la configuración viable del diseño ALBA.`
};
const ACT_EXPLAIN = {
  rest: `En <b>reposo</b> genera 1200 W — muy por debajo de la disipación de 6358 W. Sin estrés térmico.`,
  walk: `En <b>marcha</b> genera 3200 W. El cuerpo gestiona bien esta carga.`,
  combat: `<b>Combate</b> es la base ALBA: 6390 W de generación contra 6358 W de disipación — residual de solo <span class="em">+32 W</span>. El equilibrio es fino.`,
  overload: `<b>Sobrecarga</b>: 12 800 W — el doble de la disipación. Sin el caso mejorado, el núcleo supera el límite en minutos.`
};
const SYS_EXPLAIN = {
  circulatory: `<b>Sistema circulatorio</b>: 155 L de sangre — el pulso late más rápido cuanto mayor es la generación de calor. Es la red de distribución térmica y de coherencia.`,
  actuators: `<b>Actuadores</b>: 128 nodos distribuidos por masa muscular — torácica y abdomen concentran la mayoría. Su brillo sigue el ritmo de la generación.`,
  centers: `<b>Centros simbólicos</b> activados. Cada orbe pulsa con su color: la corona (percepción) arriba, la raíz (anclaje) abajo.`,
  thermal: `Mapa térmico activado — los colores siguen la escala 24 °C (azul) → 37.6 °C (ámbar) → 50 °C (rojo).`
};

function assistantOnView(name) {
  A.say("view-" + name, VIEW_EXPLAIN[name], [
    name === "anatomy" ? ["Ver el mapa térmico", () => setView("thermal")] : ["Volver a anatomía", () => setView("anatomy")],
    ["Abrir centros simbólicos", () => setView("centers")]
  ]);
}
function assistantOnCase(name) { if (CASE_EXPLAIN[name]) A.say("case-" + name, CASE_EXPLAIN[name]); }
function assistantOnActivity(name) { if (ACT_EXPLAIN[name]) A.say("act-" + name, ACT_EXPLAIN[name]); }
function assistantOnSystem(key, on) {
  if (on && SYS_EXPLAIN[key]) A.say("sys-" + key, SYS_EXPLAIN[key]);
}
function assistantWatchVerdict() {
  const v = verdict(temps.core);
  if (v.cls === A.lastVerdict) return;
  A.lastVerdict = v.cls;
  if (v.cls === "hot")
    A.say("verdict-hot", `El núcleo superó <span class="warn">37.6 °C</span> — el propio diseño de Kaelen le obliga a detenerse y ventear (el silencio de 3 s del Guardián Térmico). La solución documentada: transporte mejorado + evaporación.`, [["Aplicar caso mejorado", () => setCase("enhanced")]]);
  else if (v.cls === "ok" && temps.core < 38)
    A.say("verdict-ok", `Núcleo de <b>${temps.core.toFixed(1)} °C</b> — dentro del límite. Equilibrio térmico estable.`);
}
function assistantOnSegment(seg) {
  if (seg[0] === A.lastSeg) return;
  A.lastSeg = seg[0];
  const massKg = seg[6] * KA.muscleMass;
  const eq = equilibrium();
  const t = segTemp(seg, eq);
  const big = seg[6] >= 0.2;
  A.say("seg-" + seg[0],
    `Segmento <b>${seg[0].replace(/_/g, " ")}</b>: ${massKg.toFixed(0)} kg de músculo, ~${t.toFixed(1)} °C ahora mismo.${big ? " Es uno de los segmentos con más masa muscular — núcleo térmico del cuerpo." : ""}${t > KA.tempLimit ? ' <span class="warn">⚠ sobre el límite de 37.6 °C.</span>' : ""}`);
}
function assistantOnLayer(key, on) {
  if (key === "skin" && !on)
    A.say("layer-noskin", `Piel desactivada — ahora ves el <b>músculo</b> (991.5 kg, 935.38 L) y el <b>marco interno</b>. Los actuadores viven dentro del músculo: actívalos en Sistemas.`);
  if (key === "muscle" && !on)
    A.say("layer-nomuscle", `Músculo oculto — queda el <b>marco interno</b>: la cadena estructural que lleva la carga al suelo (2.5 MN de parámetro de fuerza).`);
}

// asimilación profunda: cada centro conectado a su función y al poder que inspira
const CENTER_DEEP = {
  crown: `La <b>Corona</b> gobierna percepción y conciencia. De ella nace la <b>pasiva Equilibrio Térmico</b>: Kaelen siente su propio calor (0–100) y a 100 se ve forzado a ventear — silenciado 3 s, igual que el límite físico de 37.6 °C. Sin conciencia del propio estado, no hay guardián.`,
  third_eye: `La <b>Mirada interna</b> es atención y visión interior. Se materializa como <b>Eco Topológico</b>: Kaelen graba la topología del espacio y deja un eco de su posición. Es memoria del campo, no predicción — recuerda lo que fue.`,
  throat: `La <b>Voz</b> expresa y pone límite. Su poder es la <b>Lanza Térmica</b>: proyecta hacia fuera el calor que el cuerpo no puede retener. Lo que amenaza por dentro se convierte en herramienta.`,
  heart_core: `El <b>Núcleo</b> (corazón relacional) es el centro emocional. De él surge la <b>R Guardián de Coherencia</b>: una zona que reduce el daño a los aliados mientras Kaelen permanece dentro — proteger exige quedarse, el costo del amor.`,
  solar_center: `El <b>Centro solar</b> es impulso y voluntad: 6390 W de activación. Cuando la voluntad excede lo sostenible (sobrecarga), el mismo centro fuerza el venteo — la voluntad se autolimita.`,
  root: `La <b>Raíz</b> es estabilidad y presencia. Su poder son las <b>Placas de Escama</b>: el escudo crece 40% mientras Kaelen está quieto (anclaje estructural real de la cadena de carga) y se reduce al moverse. La quietud es fuerza.`,
  spine: `La <b>Columna</b> es el eje central — continuidad estructural del músculo al suelo (2 506 800 N). Sin ella no hay transmisión: es la columna vertebral de la cadena de carga.`,
  aura_boundary: `El <b>Límite de campo</b> distingue yo de entorno. Es la razón por la que el kit no es OP: todo poder tiene frontera, costo y ventana de castigo. El límite no es debilidad — es identidad.`
};
function assistantOnCenter(orb) {
  A.say("center-" + orb.id,
    `<b>${orb.label}</b> — <span style="color:${orb.color}">${orb.fn}</span>.<br>${CENTER_DEEP[orb.id] || ""}`,
    [["Activar vista de centros", () => setView("centers")]]
  );
}

// mensaje de bienvenida
A.say("welcome",
  `Bienvenido a la <b>anatomía digital de Kaelen</b>. Todo lo que ves son datos reales del proyecto ALBA: 19 segmentos, 3 capas corporales, 128 actuadores y 8 centros simbólicos. Explora con las vistas de arriba — o toca cualquier parte del cuerpo y te explicaré qué es y por qué importa.`, [
  ["Empezar por lo térmico", () => setView("thermal")],
  ["Ver los centros", () => setView("centers")]
]);

window.assistantReady = true;

window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i++) update(1 / 60);
  composer.render();
};
window.render_game_to_text = () => JSON.stringify({
  view: state.view,
  layers, systems,
  state: { gen: state.gen, k: state.k, e: state.e, amb: state.amb, ext: state.ext },
  temps: { core: +temps.core.toFixed(2), muscle: +temps.muscle.toFixed(2), skin: +temps.skin.toFixed(2) },
  verdict: verdict(temps.core).text,
  simTimeMin: +(simTime / 60).toFixed(1),
  camera: { dist: +camera.position.distanceTo(controls.target).toFixed(2) },
  segments: SEGMENTS.length
});
