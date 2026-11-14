/* Kaelen · Simulador Corporal — núcleo de simulación
   Datos fuente: ALBA (alba-kaelen-core, segment-envelopes, preservación de conversación).
   Modelo: 3 regiones (músculo · núcleo · piel), parámetros ALBA. Playground — no certificación. */

"use strict";

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
  ["abdomen", 309, 203, 56, 43, 42, 0.14],
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
  ["Altura", "3.6 m"],
  ["Masa de diseño", "2010 kg"],
  ["Masa narrativa / legado", "2050 / 2090 kg"],
  ["Músculo", "991.5 kg · 935.38 L"],
  ["Órganos", "200 kg"],
  ["Volumen sanguíneo", "155 L"],
  ["Volumen de agua", "1254 L"],
  ["Actuadores", "128"],
  ["Parámetro de fuerza", "2 506 800 N"],
  ["Generación de calor", "6 390 W"],
  ["Disipación de calor", "6 358 W"],
  ["Residual térmico", "+32 W"],
  ["Área ZG", "8 m²"],
  ["Inercia de cola", "30 kg·m²"],
  ["Capacidad térmica", "6.7 MJ/K"],
  ["Límite de núcleo", "37.6 °C"]
];

const ACTIVITY = {
  rest: { gen: 1200, label: "Reposo" },
  walk: { gen: 3200, label: "Marcha" },
  combat: { gen: 6390, label: "Combate (base ALBA)" },
  overload: { gen: 12800, label: "Sobrecarga" }
};

const CASES = {
  baseline: { gen: 6390, k: 1000, e: 0, amb: 25, label: "Caso base" },
  evap: { gen: 6390, k: 1000, e: 6500, amb: 25, label: "Solo evaporación" },
  enhanced: { gen: 6390, k: 2500, e: 6500, amb: 25, label: "Mejorado" }
};

// Modelo calibrado a los resultados documentados del playground ALBA
const G_ENV = 160;   // W/K efectivos piel→entorno
const G_EVP = 209;   // conductancia evaporativa efectiva

// ---------- Estado ----------
const state = { gen: 6390, k: 1000, e: 0, amb: 25, ext: 0, view: "thermal", running: true };
const temps = { core: 34, muscle: 34.5, skin: 31 };
const history = [];   // {t, core, muscle, skin}
let simTime = 0;

// ---------- Física ----------
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
  const tau = 900; // s — ventana de muestreo del test
  for (const key of ["core", "muscle", "skin"]) {
    temps[key] += (eq[key] - temps[key]) * (dt / tau);
  }
  simTime += dt;
}

// ---------- SVG del cuerpo ----------
const svg = document.getElementById("bodySvg");
const NS = "http://www.w3.org/2000/svg";
const tip = document.createElement("div");
tip.id = "tipBox";
tip.style.display = "none";
document.querySelector(".viz-stage").appendChild(tip);

function tempColor(t) {
  // 24 °C → azul · 37.6 → ámbar · 48+ → rojo
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
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
function segTemp(seg, eq) {
  const w = seg[6]; // fracción de masa muscular
  const torso = ["thorax", "abdomen", "pelvis", "neck", "head"].includes(seg[0]);
  if (torso) return eq.core - (seg[0] === "head" ? 2.2 : seg[0] === "neck" ? 0.8 : 0);
  return eq.core - 3.4 + w * 22; // extremidades más frías, muslos intermedios
}
function segStress(seg, load) {
  if (!load) return 0;
  const cap = KA.forceParam * (0.04 + seg[6] * 2.2); // capacidad relativa por segmento
  return Math.min(1.6, (load * 1000) / cap);
}

function drawBody() {
  const eq = equilibrium();
  svg.innerHTML = "";
  const defs = document.createElementNS(NS, "defs");
  defs.innerHTML = `
    <filter id="glow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  svg.appendChild(defs);

  // suelo
  const ground = document.createElementNS(NS, "rect");
  ground.setAttribute("x", 120); ground.setAttribute("y", 425);
  ground.setAttribute("width", 384); ground.setAttribute("height", 6);
  ground.setAttribute("rx", 3); ground.setAttribute("fill", "#1c2740");
  svg.appendChild(ground);

  for (const seg of SEGMENTS) {
    const el = document.createElementNS(NS, "ellipse");
    el.setAttribute("class", "seg");
    el.setAttribute("cx", seg[1]); el.setAttribute("cy", seg[2]);
    el.setAttribute("rx", seg[3]); el.setAttribute("ry", seg[4]);
    let fill;
    if (state.view === "thermal") fill = tempColor(segTemp(seg, eq));
    else if (state.view === "structural") {
      const s = segStress(seg, state.ext);
      fill = s <= 0 ? "#233250" : s < 0.7 ? "#2f5d8a" : s < 1 ? "#c9963f" : "#d05060";
    } else fill = "#2a3550";
    el.setAttribute("fill", fill);
    el.setAttribute("stroke", "rgba(140,190,230,.25)");
    el.setAttribute("stroke-width", "1");
    el.dataset.seg = seg[0];
    el.addEventListener("mousemove", (ev) => showTip(ev, seg, eq));
    el.addEventListener("mouseleave", hideTip);
    svg.appendChild(el);
  }

  if (state.view === "centers") drawCenters();
  if (state.view === "structural") drawLoadArrows();
  updateLoadPath(eq);
}
function drawCenters() {
  for (const [id, label, x, y, color, fn] of CENTERS) {
    const halo = document.createElementNS(NS, "circle");
    halo.setAttribute("cx", x); halo.setAttribute("cy", y);
    halo.setAttribute("r", 13); halo.setAttribute("fill", color);
    halo.setAttribute("opacity", "0.18"); halo.setAttribute("filter", "url(#glow)");
    svg.appendChild(halo);
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("cx", x); dot.setAttribute("cy", y);
    dot.setAttribute("r", 4.5); dot.setAttribute("fill", color);
    dot.setAttribute("filter", "url(#glow)");
    svg.appendChild(dot);
    const t = document.createElementNS(NS, "text");
    t.setAttribute("class", "seg-label");
    t.setAttribute("x", x + 16); t.setAttribute("y", y + 3);
    t.textContent = label;
    svg.appendChild(t);
  }
}
function drawLoadArrows() {
  const g = document.createElementNS(NS, "g");
  const load = state.ext;
  g.innerHTML = `
    <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 z" fill="#ff9d5c"/></marker></defs>
    <line x1="306" y1="0" x2="306" y2="34" stroke="#ff9d5c" stroke-width="${2 + Math.min(6, load / 300)}"
      ${load ? 'marker-end="url(#arr)"' : ""} opacity="${load ? 0.9 : 0.2}"/>
    ${load ? `<text x="320" y="14" fill="#ff9d5c" font-size="11">${load} kN</text>` : ""}`;
  svg.appendChild(g);
}
function showTip(ev, seg, eq) {
  const t = segTemp(seg, eq);
  const s = segStress(seg, state.ext);
  tip.style.display = "block";
  tip.style.left = (ev.clientX - svg.getBoundingClientRect().left + 14) + "px";
  tip.style.top = (ev.clientY - svg.getBoundingClientRect().top + 8) + "px";
  const massKg = (seg[6] * KA.muscleMass).toFixed(0);
  tip.innerHTML = `<b>${seg[0].replace(/_/g, " ")}</b><br>
    m° músculo ≈ ${massKg} kg<br>
    T segmento ≈ ${t.toFixed(1)} °C ${t > KA.tempLimit ? '<span class="warn">⚠ sobre límite</span>' : ""}<br>
    ${state.view === "structural" ? `estrés ≈ ${(s * 100).toFixed(0)} % capacidad` : ""}`;
}
function hideTip() { tip.style.display = "none"; }

// ---------- Cadena de carga ----------
const CHAIN = [
  ["Músculo", 0.10], ["Tejido conectivo / piel escamada", 0.15], ["Contactos de escama", 0.15],
  ["Anclajes de placa", 0.20], ["Marco interno / huesos", 0.25], ["Torso / extremidades", 0.15], ["Suelo", 1]
];
function updateLoadPath() {
  const box = document.getElementById("loadPathBox");
  const chainEl = document.getElementById("loadChain");
  if (state.view !== "structural") { box.hidden = true; return; }
  box.hidden = false;
  const loadN = state.ext * 1000;
  chainEl.innerHTML = "";
  CHAIN.forEach(([name, share], i) => {
    if (i < CHAIN.length - 1) {
      const node = document.createElement("div");
      node.className = "chain-node";
      // redistribución dependiente de la deformación: a mayor carga los anclajes toman más
      const deform = Math.min(1, loadN / (KA.forceParam * 0.6));
      const effShare = i === 3 ? share + deform * 0.10 : i === 1 ? share - deform * 0.06 : share;
      const carried = loadN * effShare;
      const cap = KA.forceParam * effShare * 3.2;
      node.innerHTML = `<span class="pct">${(carried / 1000).toFixed(0)} kN</span>${name}`;
      if (carried > cap) node.classList.add("fail");
      chainEl.appendChild(node);
      if (i < CHAIN.length - 2) {
        const arrow = document.createElement("span");
        arrow.className = "chain-arrow";
        arrow.textContent = "→";
        chainEl.appendChild(arrow);
      }
    }
  });
}

// ---------- Gráfica ----------
const canvas = document.getElementById("thermalChart");
const ctx = canvas.getContext("2d");
function drawChart() {
  const W = canvas.width, H = canvas.height, padL = 46, padR = 14, padT = 14, padB = 30;
  ctx.clearRect(0, 0, W, H);
  const tempsAll = history.flatMap(h => [h.core, h.muscle, h.skin]);
  const tMin = 20, tMax = Math.max(50, Math.ceil(Math.max(...tempsAll, 41) / 10) * 10);
  const tMaxX = Math.max(60, simTime / 60);
  const X = (t) => padL + (t / 60 / tMaxX) * (W - padL - padR);
  const Y = (v) => padT + (1 - (v - tMin) / (tMax - tMin)) * (H - padT - padB);

  // rejilla
  ctx.strokeStyle = "#1c2740"; ctx.fillStyle = "#8b96ad"; ctx.font = "11px system-ui";
  ctx.lineWidth = 1;
  for (let v = Math.ceil(tMin / 10) * 10; v <= tMax; v += 10) {
    ctx.beginPath(); ctx.moveTo(padL, Y(v)); ctx.lineTo(W - padR, Y(v)); ctx.stroke();
    ctx.fillText(v + " °C", 8, Y(v) + 4);
  }
  for (let m = 0; m <= tMaxX; m += Math.max(10, Math.round(tMaxX / 6 / 10) * 10)) {
    ctx.fillText(m + " min", X(m * 60) - 12, H - 8);
  }
  // línea límite 37.6
  ctx.strokeStyle = "#ff5c7a"; ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(padL, Y(KA.tempLimit)); ctx.lineTo(W - padR, Y(KA.tempLimit)); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#ff5c7a";
  ctx.fillText("límite 37.6 °C", W - padR - 92, Y(KA.tempLimit) - 6);

  const series = [
    ["core", "#56c8ff", "núcleo"], ["muscle", "#ff9d5c", "músculo"], ["skin", "#7fe3a0", "piel"]
  ];
  for (const [key, color] of series) {
    if (history.length < 2) continue;
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath();
    history.forEach((h, i) => {
      const x = X(h.t), y = Y(h[key]);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
  }
  // leyenda
  let lx = padL + 8;
  for (const [key, color, label] of series) {
    ctx.fillStyle = color;
    ctx.fillRect(lx, padT + 2, 12, 3);
    ctx.fillText(label, lx + 17, padT + 8);
    lx += 70;
  }
}

// ---------- UI ----------
function fmt(n) { return n.toLocaleString("es"); }
function updateOutputs() {
  document.getElementById("genOut").textContent = fmt(state.gen) + " W";
  document.getElementById("kOut").textContent = fmt(state.k) + " W/K";
  document.getElementById("eOut").textContent = fmt(state.e) + " W";
  document.getElementById("ambOut").textContent = state.amb + " °C";
  document.getElementById("extOut").textContent = fmt(state.ext) + " kN";
}
function updateHeader() {
  const eq = equilibrium();
  document.getElementById("mGen").textContent = fmt(state.gen) + " W";
  const coreEl = document.getElementById("mCore");
  coreEl.textContent = temps.core.toFixed(1) + " °C";
  coreEl.className = "m-value " + verdict(temps.core).cls;
  document.getElementById("mLoad").textContent = (state.ext / 25).toFixed(0) + " %";
  const v = verdict(temps.core);
  const verdictEl = document.getElementById("mVerdict");
  verdictEl.textContent = v.text;
  verdictEl.className = "m-value " + v.cls;
}
function setCase(name) {
  const c = CASES[name];
  Object.assign(state, { gen: c.gen, k: c.k, e: c.e, amb: c.amb });
  syncSliders();
  document.querySelectorAll("[data-case]").forEach(b => b.classList.toggle("active", b.dataset.case === name));
  resetSim();
}
function setActivity(name) {
  const a = ACTIVITY[name];
  state.gen = a.gen;
  syncSliders();
  document.querySelectorAll("[data-act]").forEach(b => b.classList.toggle("active", b.dataset.act === name));
  document.querySelectorAll("[data-case]").forEach(b => b.classList.remove("active"));
}
function syncSliders() {
  document.getElementById("genSlider").value = state.gen;
  document.getElementById("kSlider").value = state.k;
  document.getElementById("eSlider").value = state.e;
  document.getElementById("ambSlider").value = state.amb;
  document.getElementById("extSlider").value = state.ext;
  updateOutputs();
}
function resetSim() {
  simTime = 0; history.length = 0;
  temps.core = 34; temps.muscle = 34.5; temps.skin = Math.max(state.amb - 2, 29);
  updateOutputs();
}

// tabla de datos
const factsTable = document.getElementById("factsTable");
FACTS.forEach(([k, v]) => {
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${k}</td><td>${v}</td>`;
  factsTable.appendChild(tr);
});

// tabs de vista
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    state.view = tab.dataset.view;
    const hint = document.getElementById("vizHint");
    hint.textContent = state.view === "thermal" ? "Pasa el cursor por los segmentos para ver su masa y estado térmico"
      : state.view === "structural" ? "Ajusta la carga externa — la redistribución depende de la deformación"
      : "Centros simbólicos de Kaelen — identidad, percepción y coherencia";
    drawBody();
  });
});
// acordeones
document.querySelectorAll(".panel-title").forEach(h => {
  h.addEventListener("click", () => h.parentElement.classList.toggle("open"));
});
// presets
document.querySelectorAll("[data-act]").forEach(b =>
  b.addEventListener("click", () => setActivity(b.dataset.act)));
document.querySelectorAll("[data-case]").forEach(b =>
  b.addEventListener("click", () => setCase(b.dataset.case)));
// sliders
document.getElementById("genSlider").addEventListener("input", e => { state.gen = +e.target.value; updateOutputs(); document.querySelectorAll("[data-act],[data-case]").forEach(b => b.classList.remove("active")); });
document.getElementById("kSlider").addEventListener("input", e => { state.k = +e.target.value; updateOutputs(); document.querySelectorAll("[data-case]").forEach(b => b.classList.remove("active")); });
document.getElementById("eSlider").addEventListener("input", e => { state.e = +e.target.value; updateOutputs(); document.querySelectorAll("[data-case]").forEach(b => b.classList.remove("active")); });
document.getElementById("ambSlider").addEventListener("input", e => { state.amb = +e.target.value; updateOutputs(); });
document.getElementById("extSlider").addEventListener("input", e => { state.ext = +e.target.value; updateOutputs(); drawBody(); });

// ---------- Bucle ----------
setActivity("combat");
setCase("baseline");
function frame() {
  step(30);                       // 30 s simulados por frame
  for (let i = 0; i < 3; i++) {   // muestreo
    history.push({ t: simTime, ...temps });
  }
  if (history.length > 900) history.splice(0, history.length - 900);
  updateHeader();
  drawBody();
  drawChart();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
