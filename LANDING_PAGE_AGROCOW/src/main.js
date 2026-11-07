import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import './styles.css';
import { mountScrub } from './scrub.js';
import {
  REPO_URL, TEAM, chapters, DEMO, hero, problem, why, solution, demo, market, business, closing,
} from './content.js';

document.documentElement.classList.add('js');

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => reduceQuery.matches;
const LAST = chapters.length - 1; // 0 = Inicio, 1–7 = diapositivas numeradas
const pad = (n) => String(n).padStart(2, '0');
const num = (n) => n.toLocaleString('es-AR');
const kw = (s) => s.replace(/\*(.+?)\*/g, '<em class="k">$1</em>'); // *palabra clave* → lima
let intent = false; // ¿ya hubo scroll, tecla o toque? (recién ahí se pide el video)
let scrub = null;

const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
const ICONS = {
  camera: svg('<rect x="3" y="7" width="13" height="10" rx="2"/><path d="m16 11 5-3v8l-5-3"/>'),
  pulse: svg('<path d="M3 12h4l2-5 4 10 2-5h6"/>'),
  list: svg('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 11h6M9 15h4"/>'),
  sensor: svg('<circle cx="12" cy="13" r="2.5"/><path d="M7.5 9.5a6 6 0 0 1 9 0M5 7a9.5 9.5 0 0 1 14 0"/>'),
  eye: svg('<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/>'),
};

/* ------------------------------------------------------------------ render */
const section = (i, inner) => `<section class="chapter" id="${chapters[i].id}" data-i="${i}" aria-labelledby="t-${chapters[i].id}"><div class="slide">${inner}</div></section>`;
const h2 = (i, text) => `<h2 id="t-${chapters[i].id}" tabindex="-1" data-reveal>${kw(text)}</h2>`;
const fn = (text) => `<p class="fn" data-reveal>${text}</p>`;
const kpi = (s) => `${s.pre}${s.n.map((v) => `<span data-count="${v}">${num(v)}</span>`).join('<span>–</span>')}${s.post}`;
const stats = (list) => `<ul class="stats" data-stats>${list.map((s) => `<li class="stat" data-reveal><p class="kpi">${kpi(s)}</p><p class="stat-label">${s.label}</p></li>`).join('')}</ul>`;

function renderHero() {
  const title = hero.title.map((p) => (typeof p === 'string' ? p : `<span class="mark">${p.mark}</span>`)).join('');
  return `
  <section class="chapter" id="inicio" data-i="0" aria-labelledby="t-inicio">
    <div class="slide hero-copy">
      <h1 id="t-inicio" tabindex="-1">${title}</h1>
      <p class="sub">${hero.sub}</p>
      <p class="fn">${hero.fn}</p>
    </div>
  </section>`;
}

const renderProblem = () => section(1, `
  ${h2(1, problem.title)}
  ${stats(problem.stats)}
  ${fn(problem.fn.replace(problem.sourceText, `<a class="src-link" href="${problem.sourceHref}" target="_blank" rel="noopener">${problem.sourceText}</a>`))}`);

const renderWhy = () => section(2, `
  ${h2(2, why.title)}
  <div class="versus" data-reveal>
    <div class="vs vs--today"><span class="vs-ic">${ICONS.sensor}</span><span class="vs-k">${why.today.k}</span><p class="vs-t">${why.today.t}</p></div>
    <div class="vs vs--us"><span class="vs-ic">${ICONS.eye}</span><span class="vs-k">${why.us.k}</span><p class="vs-t">${why.us.t}</p></div>
  </div>
  <p class="line" data-reveal>${why.line}</p>
  <p class="team" data-reveal><strong>${why.team}</strong> · ${TEAM.join(' · ')}</p>`);

const renderSolution = () => section(3, `
  ${h2(3, solution.title)}
  <ol class="steps3" data-line data-reveal>
    ${solution.steps.map((st) => `<li class="step3"><span class="step3-ic">${ICONS[st.icon]}</span><strong>${st.t}</strong><span>${st.s}</span></li>`).join('')}
  </ol>
  <p class="line" data-reveal>${kw(solution.anticipa)}</p>
  <p class="punch" data-reveal>${solution.punch[0]} <b>${solution.punch[1]}</b></p>
  ${fn(solution.fn)}`);

function renderDemo() {
  const d = demo;
  return `
  <section class="chapter seq" id="demo" data-i="${DEMO}" data-cv="0" aria-labelledby="t-demo">
    <div class="seq-sticky">
      <div class="seq-grid">
        <div class="seq-intro glass glass--plate">
          <h2 id="t-demo" tabindex="-1">${kw(d.title)}</h2>
          <p class="seq-note">${d.note}</p>
          <p class="cv-cue">${d.cue} <span aria-hidden="true">→</span></p>
        </div>
        <div class="cv-hud glass" id="cvHud" aria-live="polite">
          <ol class="cv-steps">${d.steps.map((s, i) => `<li data-k="${i + 1}"><span class="cv-n">${i + 1}</span><div><strong>${s.t}</strong><span class="cv-s">${s.s}</span></div></li>`).join('')}</ol>
          <p class="cv-metrics" id="cvMetrics"></p>
        </div>
      </div>
    </div>
  </section>`;
}

const renderMarket = () => section(5, `
  ${h2(5, market.title)}
  ${stats(market.stats)}
  ${fn(market.fn)}`);

const renderBusiness = () => section(6, `
  ${h2(6, business.title)}
  <p class="line" data-reveal>${business.line}</p>
  <p class="how" data-reveal>${business.how}</p>
  <ol class="plan" data-line data-reveal>
    ${business.plan.map((p, i) => `<li class="plan-step"><span class="plan-dot">${i + 1}</span><strong>${p.big}</strong><span>${p.small}</span></li>`).join('')}
  </ol>
  ${fn(business.fn)}`);

const renderClosing = () => section(7, `
  <div class="contrast" data-reveal>
    <p class="c-line c-before">${closing.before[0]} <b>${closing.before[1]}</b> ${closing.before[2]}</p>
    <h2 class="c-line c-after" id="t-cierre" tabindex="-1">${closing.after[0]} <b>${closing.after[1]}</b> ${closing.after[2]}</h2>
  </div>
  <div class="thanks" data-reveal>
    <p>${closing.thanks}</p>
    <a class="btn" href="${REPO_URL}" target="_blank" rel="noopener">${closing.cta} <span aria-hidden="true">↗</span></a>
  </div>
  ${fn(closing.fn)}`);

$('#contenido').innerHTML = [
  renderHero(), renderProblem(), renderWhy(), renderSolution(), renderDemo(), renderMarket(), renderBusiness(), renderClosing(),
].join('');

$$('.chapter').forEach((ch) => $$('[data-reveal]', ch).forEach((el, i) => el.style.setProperty('--d', Math.min(i, 5))));

/* ------------------------------------------------- contadores (una sola vez) */
function countUp(list) {
  if (reduced()) return;
  $$('[data-count]', list).forEach((el) => {
    const to = Number(el.dataset.count);
    const t0 = performance.now();
    const dur = 900;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      el.textContent = num(Math.round(to * (1 - (1 - t) ** 3)));
      if (t < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  });
}

/* ------------------------------------ la demo: pipeline de visión en 5 etapas */
const SEQ_STEPS = demo.steps.length;
const seqEl = $('#demo');
const cvMetrics = $('#cvMetrics');
let cvStage = 0;
document.body.dataset.cv = '0';
const cvStepPx = () => window.innerHeight * 0.7; // igual que --cv-step en styles.css
const seqTop = () => tops[DEMO] || 0;
function cvFromScroll() {
  const y = window.scrollY - seqTop();
  return Math.max(0, Math.min(SEQ_STEPS, Math.floor((y + cvStepPx() * 0.5) / cvStepPx())));
}
// Cuadros del clip (scene-a, 267 cuadros) donde cae cada etapa. Dentro de cada una, el scroll avanza el video.
// La vaca con id 01 camina separada del resto en los cuadros 36–47 (a 2,6–2,8 anchos, sobre la regla de «aislada»):
// ahí se muestran Detección (señales) y Conducta (alerta).
const STAGE_FRAMES = [[0, 6], [6, 26], [35, 45], [60, 120], [120, 180], [36, 42]];
function frameFor(s) {
  const j = Math.max(0, Math.min(SEQ_STEPS, Math.round(s)));
  const u = j === 0 ? s / 0.5 : j === SEQ_STEPS ? (s - (j - 0.5)) / 0.5 : s - (j - 0.5);
  const [a, b] = STAGE_FRAMES[j];
  return a + (b - a) * Math.max(0, Math.min(1, u));
}
function setCv(n) {
  if (n === cvStage) return;
  cvStage = n;
  seqEl.dataset.cv = String(n);
  document.body.dataset.cv = String(n);
  scrub?.setStage(n);
  $$('.cv-steps li').forEach((li) => {
    const k = Number(li.dataset.k);
    li.classList.toggle('on', k === n);
    li.classList.toggle('done', k < n);
  });
  if (n === 0) cvMetrics.textContent = '';
}

/* ------------------------------------------------- rendimiento: modo liviano */
const liteParam = new URLSearchParams(location.search).get('lite');
let liteDecided = liteParam !== null;
function setLite(on, why2 = '') {
  document.documentElement.classList.toggle('lite', on);
  try { sessionStorage.setItem('agrocow-lite', on ? '1' : '0'); } catch { /* sin storage */ }
  if (why2) $('#live').textContent = on ? 'Modo liviano activado' : 'Modo liviano desactivado';
  if (intent) scrub?.setEnabled(videoAllowed());
}
if (liteParam === '1') setLite(true);
else if (liteParam === null) { try { if (sessionStorage.getItem('agrocow-lite') === '1') { setLite(true); liteDecided = true; } } catch { /* sin storage */ } }

const perf = { n: 0, slow: 0 };
let movingTimer = 0;
function markMoving() {
  document.body.classList.add('moving');
  clearTimeout(movingTimer);
  movingTimer = setTimeout(() => document.body.classList.remove('moving'), 160);
}

/* ------------------------------------------------------------ navegación */
const sections = $$('.chapter');
const live = $('#live');
const hudNum = $('#hudNum');
const hudLabel = $('#hudLabel');
const progress = $('#progress');
let tops = [];
let cur = 0;
let animating = false;
let rafScroll = 0;
let rafAnim = 0;
let vh = window.innerHeight;

function measure() {
  vh = window.innerHeight;
  tops = sections.map((s) => s.getBoundingClientRect().top + window.scrollY);
}
function indexFromScroll() {
  const y = window.scrollY + vh * 0.4;
  let idx = 0;
  for (let i = 0; i < tops.length; i += 1) if (tops[i] <= y) idx = i;
  return idx;
}

function setActive(i, { announce = false, hash = true } = {}) {
  cur = i;
  document.body.dataset.ch = String(i);
  hudNum.textContent = pad(i);
  hudLabel.textContent = chapters[i].label;
  if (hash) { try { history.replaceState(null, '', `#${chapters[i].id}`); } catch { /* file:// o iframe */ } }
  if (announce) live.textContent = i === 0 ? 'Inicio' : `Diapositiva ${i} de ${LAST}: ${chapters[i].label}`;
}

const easeOut = (t) => 1 - (1 - t) ** 5;
function scrollToY(target, instant) {
  cancelAnimationFrame(rafAnim);
  if (instant || reduced()) { window.scrollTo(0, target); animating = false; return; }
  const start = window.scrollY;
  const dist = target - start;
  if (Math.abs(dist) < 2) { animating = false; return; }
  const dur = 800;
  const t0 = performance.now();
  animating = true;
  let prev = 0;
  const step = (now) => {
    if (prev && !liteDecided) { const d = now - prev; if (d < 400) { perf.n += 1; if (d > 40) perf.slow += 1; } }
    prev = now;
    const t = Math.min(1, (now - t0) / dur);
    window.scrollTo(0, start + dist * easeOut(t));
    if (t < 1) rafAnim = requestAnimationFrame(step);
    else {
      animating = false;
      onScroll();
      // Si más de la mitad de los cuadros (de al menos 10, acumulados) tardó más de 40 ms, pasa solo a modo liviano.
      if (!liteDecided && perf.n >= 10) { liteDecided = true; if (perf.slow / perf.n > 0.5) setLite(true, 'auto'); }
    }
  };
  rafAnim = requestAnimationFrame(step);
}

function goTo(i, { instant = false, announce = true, focus = true, fromBelow = false } = {}) {
  const idx = Math.max(0, Math.min(LAST, i));
  setActive(idx, { announce });
  const target = idx === DEMO && fromBelow ? seqTop() + SEQ_STEPS * cvStepPx() : tops[idx];
  scrollToY(target, instant);
  setCv(idx === DEMO && fromBelow ? SEQ_STEPS : 0);
  if (focus) { const h = $('h1, h2', sections[idx]); if (h) h.focus({ preventScroll: true }); }
}

// Avanzar/volver: dentro de la demo, primero se recorren las 5 etapas del pipeline.
function advance(dir) {
  if (cur === DEMO) {
    const k = cvStage + dir;
    if (k >= 0 && k <= SEQ_STEPS) { setCv(k); scrollToY(seqTop() + k * cvStepPx()); return; }
    goTo(DEMO + dir);
    return;
  }
  if (cur === DEMO + 1 && dir < 0) { goTo(DEMO, { fromBelow: true }); return; }
  goTo(cur + dir);
}

['wheel', 'touchstart', 'mousedown'].forEach((ev) =>
  window.addEventListener(ev, () => { cancelAnimationFrame(rafAnim); animating = false; }, { passive: true }));

/* --------------------------------------------------------- scroll: progreso, diapositiva y etapa */
function frame() {
  rafScroll = 0;
  scrub?.read();
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
  progress.style.transform = `scaleX(${Math.min(1, window.scrollY / maxScroll).toFixed(4)})`;
  document.body.classList.toggle('past-hero', window.scrollY > vh * 0.12); // celular: el gancho sube sobre la foto
  if (!animating) {
    const now = indexFromScroll();
    if (now !== cur) setActive(now);
    setCv(cur === DEMO ? cvFromScroll() : 0);
  }
}
function onScroll() { markMoving(); if (!rafScroll) rafScroll = requestAnimationFrame(frame); }
window.addEventListener('scroll', onScroll, { passive: true });
const remeasure = () => { measure(); scrub?.layout(); onScroll(); };
window.addEventListener('resize', remeasure);
new ResizeObserver(remeasure).observe($('#contenido'));
document.fonts?.ready.then(remeasure);

/* ------------------------------------------------------------ revelado */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    if (e.target.hasAttribute('data-stats')) countUp(e.target);
    io.unobserve(e.target);
  });
}, { threshold: 0.2 });
$$('[data-reveal], [data-line], [data-stats]').forEach((el) => io.observe(el));

/* --------------------------------------------------------- pantalla completa (tecla F) */
function toggleFullscreen() {
  const p = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
  p?.catch(() => {});
}
document.addEventListener('fullscreenchange', () => setTimeout(remeasure, 120));

/* ------------------------------------------------------- teclado y botones */
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-goto]');
  if (!a) return;
  e.preventDefault();
  goTo(Number(a.dataset.goto), { announce: true, focus: true });
});
$('#btnPrev').addEventListener('click', () => advance(-1));
$('#btnNext').addEventListener('click', () => advance(1));

document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  const key = e.key;
  const run = (fn2) => { e.preventDefault(); if (!e.repeat) fn2(); };
  if (key === 'ArrowRight' || key === 'PageDown') return run(() => advance(1));
  if (key === ' ' || key === 'Spacebar') return run(() => advance(e.shiftKey ? -1 : 1));
  if (key === 'ArrowLeft' || key === 'PageUp') return run(() => advance(-1));
  if (key === 'Home') return run(() => goTo(0));
  if (key === 'End') return run(() => goTo(LAST));
  if (/^[1-7]$/.test(key) && !e.shiftKey) return run(() => goTo(Number(key)));
  if (key === 'f' || key === 'F') return run(toggleFullscreen);
  if (key === 'l' || key === 'L') return run(() => { liteDecided = true; setLite(!document.documentElement.classList.contains('lite'), 'manual'); });
  return undefined;
});

/* ----------------------------------------------- fondo: video real cuadro a cuadro */
// Sin video con movimiento reducido, modo liviano o ahorro de datos: queda el póster con las cajas.
function videoAllowed() {
  const c = navigator.connection;
  const saveData = Boolean(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')));
  return !reduced() && !document.documentElement.classList.contains('lite') && !saveData;
}

/* ------------------------------------------------------------------ inicio */
measure();
const initial = chapters.findIndex((c) => `#${c.id}` === location.hash);
scrub = mountScrub($('#stage'), {
  scenes: [
    // B: fondo de toda la página (tenue fuera de la portada)
    { id: 'scene-b', base: true, clip: 'media/scene-b.mp4', clipM: 'media/scene-b-m.mp4', poster: 'media/scene-b-poster' },
    // A: la demo, encima, solo mientras dura la secuencia
    { id: 'scene-a', clip: 'media/scene-a.mp4', clipM: 'media/scene-a-m.mp4', poster: 'media/scene-a-poster', frameMap: (p) => frameFor(p * SEQ_STEPS) },
  ],
  bounds: () => [{ start: tops[0], end: tops[LAST] }, { start: seqTop(), end: seqTop() + SEQ_STEPS * cvStepPx() }],
  tracksUrl: 'media/tracks.json',
  zones: { 'scene-a': [{ label: 'comedero', poly: [[0.42, 0.52], [0.98, 0.52], [0.98, 0.8], [0.42, 0.78]] }] },
  onActive: markMoving,
  onFrame: ({ count, seen }) => {
    if (cur === DEMO && cvStage > 0) cvMetrics.textContent = `${count} vacas en cuadro · ${seen} IDs`;
  },
});
// El video se pide recién con la primera intención (scroll, tecla o toque). Hasta entonces, cajas sobre el póster.
const enableVideo = () => scrub.setEnabled(videoAllowed());
const INTENT = ['scroll', 'keydown', 'pointerdown', 'touchstart', 'wheel'];
const onIntent = () => {
  if (intent) return;
  intent = true;
  INTENT.forEach((ev) => window.removeEventListener(ev, onIntent));
  enableVideo();
};
INTENT.forEach((ev) => window.addEventListener(ev, onIntent, { passive: true }));
reduceQuery.addEventListener?.('change', () => { if (intent) enableVideo(); });

if (initial > 0) { onIntent(); setActive(initial, { hash: false }); window.scrollTo(0, tops[initial]); } else { setActive(0, { hash: false }); }
frame();
window.addEventListener('load', remeasure);
setTimeout(() => $('#intro')?.remove(), 2300);

// Para pruebas automáticas.
window.__agrocow = { goTo, advance, get current() { return cur; }, get cvStage() { return cvStage; }, get scrub() { return scrub.state; } };
