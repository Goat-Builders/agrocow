import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import './styles.css';
import { mountScrub } from './scrub.js';
import {
  REPO_URL, TEAM, EVENT_NAME, chapters, keys, hero, cv, problem, solution, proof, money, limits, status,
} from './content.js';

document.documentElement.classList.add('js');

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => reduceQuery.matches;
const LAST = chapters.length - 1; // 0 = Inicio, 1–6 = diapositivas numeradas
const pad = (n) => String(n).padStart(2, '0');
let intent = false; // ¿ya hubo scroll, tecla o toque? (recién ahí se pide el video)
let scrub = null;

/* ------------------------------------------------------------------ assets */
// Fotos reales (CC0) en AVIF y WebP, varios anchos. Todo lo que no está en la primera pantalla es lazy.
const IMG = {
  'real-run': { w: [480, 720], dim: [720, 405] },
  'cow-dark': { w: [200, 360], dim: [360, 260] },
  'cow-white': { w: [200, 310], dim: [310, 260] },
};
function pic(name, alt, { sizes = '100vw', eager = false } = {}) {
  const { w, dim } = IMG[name];
  const set = (ext) => w.map((x) => `img/${name}-${x}.${ext} ${x}w`).join(', ');
  return `<picture>
    <source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">
    <source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">
    <img src="img/${name}-${w[w.length - 1]}.webp" alt="${alt}" width="${dim[0]}" height="${dim[1]}" decoding="async" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'}>
  </picture>`;
}

const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
const ICONS = {
  bowl: svg('<path d="M3 11h18c0 4-3.6 7-8 7h-2c-4.4 0-8-3-8-7Z"/><path d="M8 7c0-1 1-1.5 1-2.5M13 7c0-1 1-1.5 1-2.5"/>'),
  apart: svg('<circle cx="5" cy="15" r="2.2"/><circle cx="10.5" cy="16" r="2.2"/><circle cx="7.5" cy="10" r="2.2"/><circle cx="19" cy="6.5" r="2.2" stroke-dasharray="2.4 2"/>'),
  lying: svg('<rect x="3" y="9" width="15" height="7" rx="3.5"/><path d="M18 11h2.2A1.8 1.8 0 0 1 22 12.8V14"/><path d="M6 16v2.5M14 16v2.5"/>'),
  cow: svg('<path d="M5 7 3 4M19 7l2-3"/><path d="M6 8h12l1 6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z"/><circle cx="9.5" cy="12" r=".8"/><circle cx="14.5" cy="12" r=".8"/>'),
  detect: svg('<path d="M4 9V5h4M16 5h4v4M20 15v4h-4M8 19H4v-4"/><circle cx="12" cy="12" r="2.5"/>'),
  bell: svg('<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15Z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
  token: svg('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>'),
  coin: svg('<circle cx="12" cy="12" r="8"/><path d="M12 7v10M9.5 9.5h3.8a1.7 1.7 0 0 1 0 3.4H10.7a1.7 1.7 0 0 0 0 3.4H14.5"/>'),
};

/* ------------------------------------------------------------------ render */
const head = (n, label) =>
  `<div class="chap-head" data-reveal><span class="n">${pad(n)} / ${pad(LAST)}</span><span class="rule"></span><span>${label}</span></div>`;
const plate = (inner) => `<div class="plate glass glass--plate">${inner}</div>`;

const nftCard = () => `
  <div class="nft">
    <div class="nft-photo">${pic('cow-white', 'Vaca real de ejemplo para el token', { sizes: '17rem' })}</div>
    <div class="nft-row"><b>${money.card.cap}</b></div>
    <div class="nft-row"><span>${money.card.token}</span><span class="pill">${money.card.example}</span></div>
    <span class="nft-status">${money.card.status}</span>
  </div>`;
const payoutCard = () => `
  <div class="payout tile">
    <span class="coin" aria-hidden="true">${money.payout.label}</span>
    <strong>${money.payout.to}</strong>
    <span class="pill pill--amber">${money.payout.tag}</span>
  </div>`;

function renderHero() {
  const title = hero.titleParts.map((p) => (typeof p === 'string' ? p : `<span class="mark">${p.mark}</span>`)).join('');
  return `
  <section class="chapter chapter--hero" id="inicio" data-i="0" data-cv="0" aria-labelledby="t-inicio">
    <div class="hero-sticky">
    <div class="hero-grid">
      <div class="hero-copy">
        <span class="pill pill--amber"><span class="dot"></span>${hero.status}</span>
        <h1 id="t-inicio" tabindex="-1">${title}</h1>
        <p class="lead">${hero.lead}</p>
        <div class="cta-row">
          <a class="btn glass-cta" href="#problema" data-goto="1">${hero.ctaPrimary} <span aria-hidden="true">→</span></a>
          <a class="link-quiet" href="${REPO_URL}" target="_blank" rel="noopener">${hero.ctaSecondary} <span aria-hidden="true">↗</span></a>
        </div>
      </div>
      <div class="cv-hud glass" id="cvHud" aria-live="polite">
        <p class="cv-kicker">${cv.kicker}</p>
        <ol class="cv-steps">${cv.steps.map((s, i) => `<li data-k="${i + 1}"><span class="cv-n">${i + 1}</span><div><strong>${s.t}</strong><span class="cv-s">${s.s}</span></div></li>`).join('')}</ol>
        <p class="cv-metrics" id="cvMetrics"></p>
      </div>
    </div>
    <p class="hero-note small">${hero.photoNote}</p>
    <p class="cv-cue small" aria-hidden="true">${cv.cue} <span>↓</span></p>
    </div>
  </section>`;
}

function renderProblem() {
  const p = problem;
  return `
  <section class="chapter" id="problema" data-i="1" aria-labelledby="t-problema">
    ${plate(`
      ${head(1, 'Problema')}
      <h2 id="t-problema" tabindex="-1" data-reveal>${p.title}</h2>
      <ul class="tiles3" data-reveal>
        ${p.tiles.map((t) => `<li class="tile tile-big">${ICONS[t.icon]}<h3>${t.title}</h3><p>${t.text}</p></li>`).join('')}
      </ul>
      <p class="pain" data-reveal>${p.pain}</p>
      <p class="evidence" data-reveal>${p.evidence} <a href="${p.href}" target="_blank" rel="noopener">${p.cite}</a></p>`)}
  </section>`;
}

function renderSolution() {
  const s = solution;
  return `
  <section class="chapter" id="solucion" data-i="2" aria-labelledby="t-solucion">
    ${plate(`
      ${head(2, 'Solución')}
      <h2 id="t-solucion" tabindex="-1" data-reveal>${s.title}</h2>
      <div class="flow" id="flow" data-step="1" data-reveal>
        <div class="flow-nodes" role="group" aria-label="Pasos">
          ${s.steps.map((st, i) => `<button type="button" class="node" data-node="${i + 1}" aria-label="Paso ${i + 1}: ${st.label}"><span class="node-ic">${ICONS[st.icon]}</span><span class="lbl">${st.label}</span></button>`).join('')}
        </div>
        <div class="flow-stage">
          <div class="scene" aria-hidden="true">
            <div class="pane pane--photo">
              ${pic('cow-dark', '', { sizes: '(min-width: 900px) 30vw, 80vw' })}
              <div class="ov ov-box"><span>id 03</span></div>
              <span class="ov ov-chip pill pill--amber">aislamiento · aviso · ${s.example}</span>
            </div>
            <div class="pane pane--nft">${nftCard()}</div>
            <div class="pane pane--pay">${payoutCard()}</div>
          </div>
          <div class="flow-copy" id="flowCopy" aria-live="polite"></div>
        </div>
        <p class="flow-note">${s.note}</p>
      </div>`)}
  </section>`;
}

function renderProof() {
  const p = proof;
  return `
  <section class="chapter" id="prueba" data-i="3" aria-labelledby="t-prueba">
    ${plate(`
      ${head(3, 'Prueba')}
      <h2 id="t-prueba" tabindex="-1" data-reveal>${p.title}</h2>
      <div class="proof-grid" data-reveal>
        <figure class="run">
          <div class="run-frame">${pic(p.img, p.alt, { sizes: '(min-width: 900px) 52vw, 90vw' })}<span class="run-tag">${p.tag}</span></div>
          <figcaption class="small">${p.caption} <a class="credit" href="${p.creditHref}" target="_blank" rel="noopener">${p.credit}</a></figcaption>
        </figure>
        <ul class="facts">${p.facts.map((f) => `<li>${f}</li>`).join('')}</ul>
      </div>`)}
  </section>`;
}

function renderMoney() {
  const m = money;
  return `
  <section class="chapter" id="dinero" data-i="4" aria-labelledby="t-dinero">
    ${plate(`
      ${head(4, 'Dinero')}
      <h2 id="t-dinero" tabindex="-1" data-reveal>${m.title}</h2>
      <div class="money-row" data-reveal>
        ${nftCard()}
        <span class="arrow" aria-hidden="true">→</span>
        ${payoutCard()}
        <ol class="rules" aria-label="Condiciones">${m.rules.map((r) => `<li>${r}</li>`).join('')}</ol>
      </div>
      <div class="notes" data-reveal>${m.notes.map((n) => `<p class="small">${n}</p>`).join('')}</div>`)}
  </section>`;
}

function renderLimits() {
  const l = limits;
  return `
  <section class="chapter" id="limites" data-i="5" aria-labelledby="t-limites">
    ${plate(`
      ${head(5, 'Límites')}
      <h2 id="t-limites" tabindex="-1" data-reveal>${l.title}</h2>
      <ul class="limit-grid" data-reveal>
        ${l.tiles.map((t) => `<li class="tile"><h3>${t.title}</h3><p>${t.text}</p></li>`).join('')}
      </ul>`)}
  </section>`;
}

function renderStatus() {
  const s = status;
  return `
  <section class="chapter" id="estado" data-i="6" aria-labelledby="t-estado">
    ${plate(`
      ${head(6, 'Estado')}
      <h2 id="t-estado" tabindex="-1" data-reveal>${s.title}</h2>
      <div class="status-grid" data-reveal>
        ${s.columns.map((c) => `
          <div class="status-col tile">
            <h3><span class="dot dot--${c.key}" aria-hidden="true"></span>${c.label}</h3>
            <ul>${c.items.map((i) => `<li>${i}</li>`).join('')}</ul>
          </div>`).join('')}
      </div>
      <div class="closing glass glass--soft" data-reveal>
        <div><h3>${s.closing.title}</h3><p>${s.closing.text}</p></div>
        <a class="btn glass-cta" href="${REPO_URL}" target="_blank" rel="noopener">${s.closing.cta} <span aria-hidden="true">↗</span></a>
      </div>
      <div class="foot" data-reveal>
        ${TEAM.length ? `<span>Equipo: ${TEAM.join(' · ')}</span>` : ''}
        ${EVENT_NAME ? `<span>${EVENT_NAME}</span>` : ''}
        <a href="#inicio" data-goto="0">${s.backToStart}</a>
      </div>`)}
  </section>`;
}

$('#contenido').innerHTML = [
  renderHero(), renderProblem(), renderSolution(), renderProof(), renderMoney(), renderLimits(), renderStatus(),
].join('');

$('#topNav').innerHTML = chapters.slice(1)
  .map((c, i) => `<a href="#${c.id}" data-goto="${i + 1}">${pad(i + 1)} ${c.label}</a>`).join('');
$('#dock').innerHTML = chapters
  .map((c, i) => `<a href="#${c.id}" data-goto="${i}" tabindex="-1"><span>${i ? `${pad(i)} ` : ''}${c.label}</span></a>`).join('');

// Atajos de presentador: leyenda fija que solo se ve en la portada.
document.body.insertAdjacentHTML('beforeend', `
  <ul class="keys-hint glass glass--soft" aria-label="Atajos de teclado">
    <li>Modo presentación</li>
    ${keys.map((k) => `<li>${k.k.map((x) => `<kbd>${x}</kbd>`).join(' ')} ${k.t}</li>`).join('')}
  </ul>`);

// Escalonado del revelado dentro de cada diapositiva.
$$('.chapter').forEach((ch) => $$('[data-reveal]', ch).forEach((el, i) => el.style.setProperty('--d', Math.min(i, 6))));

/* ------------------------------------ la secuencia de visión (portada, 5 etapas) */
const CV_STEPS = cv.steps.length;
const heroEl = $('#inicio');
const cvMetrics = $('#cvMetrics');
let cvStage = 0;
document.body.dataset.cv = '0'; // sin esto, los selectores :not([data-cv="0"]) aplicaban desde el arranque
const cvStepPx = () => window.innerHeight * 0.7;   // igual que --cv-step en styles.css
function cvFromScroll() {
  const y = window.scrollY - (tops[0] || 0);
  return Math.max(0, Math.min(CV_STEPS, Math.floor((y + cvStepPx() * 0.5) / cvStepPx())));
}
function setCv(n) {
  if (n === cvStage) return;
  cvStage = n;
  heroEl.dataset.cv = String(n);
  document.body.dataset.cv = String(n);
  scrub?.setStage(n);
  $$('.cv-steps li').forEach((li) => {
    const k = Number(li.dataset.k);
    li.classList.toggle('on', k === n);
    li.classList.toggle('done', k < n);
  });
  if (n === 0) cvMetrics.textContent = '';
}

/* ------------------------------------------------- el flujo (diapositiva 2) */
const flowEl = $('#flow');
const flowNodes = $$('.node', flowEl);
const flowCopy = $('#flowCopy');
const flow = { step: 1, timer: 0 };
const FLOW_MS = 3200;

function setStep(n) {
  flow.step = Math.max(1, Math.min(solution.steps.length, n));
  const st = solution.steps[flow.step - 1];
  flowEl.dataset.step = String(flow.step);
  flowEl.style.setProperty('--p', String((flow.step - 1) / (solution.steps.length - 1)));
  flowNodes.forEach((b, i) => {
    if (i + 1 === flow.step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    if (i + 1 < flow.step) b.setAttribute('data-done', ''); else b.removeAttribute('data-done');
  });
  flowCopy.innerHTML = `
    <span class="num">${flow.step} / ${solution.steps.length}</span>
    <h3>${st.title}</h3>
    <p>${st.text}</p>
    ${st.tag ? `<span class="pill pill--amber">${st.tag}</span>` : ''}`;
}
function stopAuto() { clearInterval(flow.timer); flow.timer = 0; }
function startAuto() {
  stopAuto();
  flow.timer = setInterval(() => {
    if (document.hidden || cur !== 2) { stopAuto(); return; }
    if (flow.step < solution.steps.length) setStep(flow.step + 1); else stopAuto();
  }, FLOW_MS);
}
flowNodes.forEach((b) => b.addEventListener('click', () => { stopAuto(); setStep(Number(b.dataset.node)); }));
setStep(1);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopAuto(); else if (cur === 2 && flow.step < solution.steps.length) startAuto(); });

/* ------------------------------------------------- rendimiento: modo liviano */
// ?lite=1 lo fuerza, ?lite=0 lo apaga (y desactiva la detección). Tecla L: alterna.
const liteParam = new URLSearchParams(location.search).get('lite');
let liteDecided = liteParam !== null;
function setLite(on, why = '') {
  document.documentElement.classList.toggle('lite', on);
  try { sessionStorage.setItem('agrocow-lite', on ? '1' : '0'); } catch { /* sin storage */ }
  if (why) $('#live').textContent = on ? 'Modo liviano activado' : 'Modo liviano desactivado';
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
const btnFs = $('#btnFs');
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

function setActive(i, { announce = false, hash = true, fromBelow = false } = {}) {
  const changed = i !== cur;
  cur = i;
  document.body.dataset.ch = String(i);
  hudNum.textContent = pad(i);
  hudLabel.textContent = chapters[i].label;
  $$('#topNav a, #dock a').forEach((a) => {
    if (Number(a.dataset.goto) === i) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
  });
  if (hash) { try { history.replaceState(null, '', `#${chapters[i].id}`); } catch { /* file:// o iframe */ } }
  if (announce) live.textContent = i === 0 ? 'Inicio' : `Diapositiva ${i} de ${LAST}: ${chapters[i].label}`;
  // El flujo arranca desde el paso 1 (o desde el último si se vuelve desde abajo) y avanza solo.
  if (i === 2 && changed) { setStep(fromBelow ? solution.steps.length : 1); if (!fromBelow) startAuto(); else stopAuto(); }
  if (i !== 2) stopAuto();
}

const easeOut = (t) => 1 - (1 - t) ** 5; // aproxima cubic-bezier(0.22, 1, 0.36, 1)
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
  setActive(idx, { announce, fromBelow });
  const target = idx === 0 && fromBelow ? tops[0] + CV_STEPS * cvStepPx() : tops[idx];
  scrollToY(target, instant);
  if (idx === 0) setCv(fromBelow ? CV_STEPS : 0);
  if (focus) { const h = $('h1, h2', sections[idx]); if (h) h.focus({ preventScroll: true }); }
}

// Avanzar/volver: dentro de la solución, primero se recorre el flujo paso a paso.
function advance(dir) {
  if (cur === 0) {
    const k = cvStage + dir;
    if (k >= 0 && k <= CV_STEPS) { setCv(k); scrollToY(tops[0] + k * cvStepPx()); return; }
    if (dir > 0) { goTo(1); return; }
    return;
  }
  if (cur === 2) {
    const n = flow.step + dir;
    if (n >= 1 && n <= solution.steps.length) { stopAuto(); setStep(n); return; }
  }
  goTo(cur + dir, { fromBelow: dir < 0 });
}


['wheel', 'touchstart', 'mousedown'].forEach((ev) =>
  window.addEventListener(ev, () => { cancelAnimationFrame(rafAnim); animating = false; }, { passive: true }));

/* --------------------------------------------------------- scroll: progreso y diapositiva activa */
function frame() {
  rafScroll = 0;
  scrub?.read();
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
  progress.style.transform = `scaleX(${Math.min(1, window.scrollY / maxScroll).toFixed(4)})`;
  if (!animating) { const now = indexFromScroll(); if (now !== cur) setActive(now, { fromBelow: now < cur }); setCv(cur === 0 ? cvFromScroll() : 0); }
}
const onScroll = () => { markMoving(); if (!rafScroll) rafScroll = requestAnimationFrame(frame); };
window.addEventListener('scroll', onScroll, { passive: true });
const remeasure = () => { measure(); scrub?.layout(); onScroll(); };
window.addEventListener('resize', remeasure);
new ResizeObserver(remeasure).observe($('#contenido'));
document.fonts?.ready.then(remeasure);

/* ------------------------------------------------------------ revelado */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.12 });
$$('[data-reveal]').forEach((el) => io.observe(el));

/* --------------------------------------------------------- pantalla completa */
function toggleFullscreen() {
  const p = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
  p?.catch(() => {});
}
document.addEventListener('fullscreenchange', () => {
  const on = Boolean(document.fullscreenElement);
  btnFs.setAttribute('aria-pressed', String(on));
  btnFs.setAttribute('aria-label', on ? 'Salir de pantalla completa' : 'Pantalla completa');
  setTimeout(remeasure, 120);
});

/* ------------------------------------------------------- teclado y botones */
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-goto]');
  if (!a) return;
  e.preventDefault();
  goTo(Number(a.dataset.goto), { announce: true, focus: true });
});
$('#btnPrev').addEventListener('click', () => advance(-1));
$('#btnNext').addEventListener('click', () => advance(1));
btnFs.addEventListener('click', toggleFullscreen);

document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  const key = e.key;
  const run = (fn) => { e.preventDefault(); if (!e.repeat) fn(); };

  if (key === 'ArrowRight' || key === 'PageDown') return run(() => advance(1));
  if (key === ' ' || key === 'Spacebar') return run(() => advance(e.shiftKey ? -1 : 1));
  if (key === 'ArrowLeft' || key === 'PageUp') return run(() => advance(-1));
  if (key === 'Home') return run(() => goTo(0));
  if (key === 'End') return run(() => goTo(LAST));
  if (/^[1-6]$/.test(key) && !e.shiftKey) return run(() => goTo(Number(key)));
  if (key === 'f' || key === 'F') return run(toggleFullscreen);
  if (key === 'l' || key === 'L') return run(() => { liteDecided = true; setLite(!document.documentElement.classList.contains('lite'), 'manual'); });
  return undefined;
});

/* ----------------------------------------------- fondo: video real cuadro a cuadro */
// Sin video con movimiento reducido, modo liviano o ahorro de datos: queda el póster con las cajas del primer cuadro.
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
    { id: 'scene-a', clip: 'media/scene-a.mp4', clipM: 'media/scene-a-m.mp4', poster: 'media/scene-a-poster' },
    { id: 'scene-b', clip: 'media/scene-b.mp4', clipM: 'media/scene-b-m.mp4', poster: 'media/scene-b-poster' },
  ],
  // Escena A: la secuencia de visión de la portada; escena B: de ahí hasta el cierre.
  bounds: () => [{ start: tops[0], end: tops[0] + CV_STEPS * cvStepPx() }, { start: tops[0] + CV_STEPS * cvStepPx(), end: tops[LAST] }],
  tracksUrl: 'media/tracks.json',
  // zona del comedero (fija en la imagen, como en el motor) sobre el heno del clip A
  zones: { 'scene-a': [{ label: 'comedero', poly: [[0.42, 0.52], [0.98, 0.52], [0.98, 0.8], [0.42, 0.78]] }] },
  onActive: markMoving,
  onFrame: ({ count, seen, frame: f, total }) => {
    if (cur === 0 && cvStage > 0) cvMetrics.textContent = `vacas en cuadro ${count} · IDs vistos ${seen} · cuadro ${f}/${total}`;
  },
});
// El video se pide recién con la primera intención (scroll, tecla o toque): no compite con la
// primera pantalla ni se descarga si nadie avanza. Hasta entonces, las cajas reales se mueven sobre el póster.
const enableVideo = () => scrub.setEnabled(videoAllowed());
const onIntent = () => {
  if (intent) return;
  intent = true;
  ['scroll', 'keydown', 'pointerdown', 'touchstart', 'wheel'].forEach((ev) => window.removeEventListener(ev, onIntent));
  enableVideo();
};
['scroll', 'keydown', 'pointerdown', 'touchstart', 'wheel'].forEach((ev) => window.addEventListener(ev, onIntent, { passive: true }));
if (initial > 0) onIntent();
reduceQuery.addEventListener?.('change', () => { if (intent) enableVideo(); });
if (initial > 0) { setActive(initial, { hash: false }); window.scrollTo(0, tops[initial]); } else { setActive(0, { hash: false }); }
frame();
window.addEventListener('load', remeasure);

// La intro de marca no bloquea nada (pointer-events: none): se quita del DOM al terminar.
setTimeout(() => $('#intro')?.remove(), 2300);

// Para pruebas automáticas.
window.__agrocow = { goTo, advance, get current() { return cur; }, get flowStep() { return flow.step; }, get cvStage() { return cvStage; }, get scrub() { return scrub.state; } };
