import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './styles.css';
import {
  REPO_URL, TEAM, EVENT_NAME, hero, problem, pipeline, signals, limits, output, status, chapters, keys,
} from './content.js';

document.documentElement.classList.add('js');

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
$('#figNote').textContent = hero.figureNote;
const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => reduceQuery.matches;
const LAST = chapters.length - 1; // 6 capítulos numerados + Inicio
const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/* ------------------------------------------------------------------ render */
const head = (n, label) =>
  `<div class="chap-head" data-reveal><span class="n">${pad(n)} / ${pad(LAST)}</span><span class="rule"></span><span>${label}</span></div>`;
const plate = (inner) => `<div class="plate glass glass--plate">${inner}</div>`;

function renderHero() {
  const title = hero.titleParts.map((p) => (typeof p === 'string' ? p : `<span class="mark">${p.mark}</span>`)).join('');
  return `
  <section class="chapter chapter--hero" id="inicio" data-i="0" aria-labelledby="t-inicio">
    <div class="hero-grid">
      <div class="hero-copy glass glass--plate">
        <p class="status-pill glass glass--soft" data-reveal><span class="pill-dot" aria-hidden="true"></span>${hero.status}</p>
        <h1 id="t-inicio" tabindex="-1" data-reveal>${title}</h1>
        <p class="lead" data-reveal>${hero.lead}</p>
        <p class="audience" data-reveal>${hero.audience}</p>
        <div class="cta-row" data-reveal>
          <a class="btn glass-cta" href="#problema" data-goto="1">${hero.ctaPrimary} <span aria-hidden="true">→</span></a>
          <a class="link-quiet" href="${REPO_URL}" target="_blank" rel="noopener">${hero.ctaSecondary} <span aria-hidden="true">↗</span></a>
        </div>
        <ul class="proofs" aria-label="Qué entrega" data-reveal>
          ${hero.proofs.map((p) => `<li class="glass glass--soft"><span class="corner" aria-hidden="true"></span>${p}</li>`).join('')}
        </ul>
      </div>
      <div class="hero-art" role="img" aria-label="${hero.figureLabel}"></div>
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
      <div class="compare" data-reveal>
        <div class="tile tile--before"><span class="tile-label">${p.before.label}</span><p>${p.before.text}</p></div>
        <span class="arrow" aria-hidden="true">→</span>
        <div class="tile tile--after"><span class="tile-label">${p.after.label}</span><p>${p.after.text}</p></div>
      </div>
      <div class="problem-row">
        <div data-reveal>
          <p class="sub-label">${p.cardsTitle}</p>
          <ul class="mini-cards">
            ${p.cards.map((c) => `<li class="tile"><h3>${c.title}</h3><p>${c.text}</p></li>`).join('')}
          </ul>
        </div>
        <div class="evidence" data-reveal>
          <p>${p.evidence.text}</p>
          <p class="caveat">${p.evidence.caveat}</p>
          <a class="cite" href="${p.evidence.href}" target="_blank" rel="noopener">Fuente: ${p.evidence.cite}</a>
        </div>
      </div>`)}
  </section>`;
}

function renderPipeline() {
  const p = pipeline;
  return `
  <section class="chapter" id="pipeline" data-i="2" aria-labelledby="t-pipeline">
    ${plate(`
      ${head(2, 'Pipeline')}
      <h2 id="t-pipeline" tabindex="-1" data-reveal>${p.title}</h2>
      <ol class="steps" data-line>
        ${p.steps.map((s, i) => `<li class="step tile" data-reveal><span class="step-n glass glass--soft">${pad(i + 1)}</span><h3>${s.title}</h3><p>${s.text}</p></li>`).join('')}
      </ol>
      <div class="outputs" data-reveal><span>${p.outputsLabel}</span>${p.outputs.map((o) => `<span class="chip glass glass--soft">${o}</span>`).join('')}</div>
      <p class="note" data-reveal>${p.note}</p>`)}
  </section>`;
}

function renderSignals() {
  const s = signals;
  return `
  <section class="chapter" id="senales" data-i="3" aria-labelledby="t-senales">
    ${plate(`
      ${head(3, 'Señales')}
      <div data-reveal>
        <h2 id="t-senales" tabindex="-1">${s.title}</h2>
        <p class="lead" style="margin-top:.5rem">${s.lead}</p>
      </div>
      <div class="sig-grid" data-reveal>
        <div class="sig-list" role="group" aria-label="Señales" id="sigList">
          ${s.items.map((it, i) => `<button type="button" class="sig-btn glass glass--soft" data-sig="${i}" aria-pressed="false" tabindex="-1"><span class="n">${pad(i + 1)}</span><span>${it.title}</span></button>`).join('')}
        </div>
        <div class="sig-detail tile" id="sigDetail" aria-live="polite"></div>
      </div>
      <p class="note" data-reveal>${s.footnote} Con <kbd>↑</kbd> <kbd>↓</kbd> cambiás de señal.</p>`)}
  </section>`;
}

function renderLimits() {
  const l = limits;
  return `
  <section class="chapter" id="limites" data-i="4" aria-labelledby="t-limites">
    ${plate(`
      ${head(4, 'Límites')}
      <div data-reveal>
        <h2 id="t-limites" tabindex="-1">${l.title}</h2>
        <p class="lead" style="margin-top:.5rem">${l.lead}</p>
      </div>
      <ul class="limit-grid">
        ${l.cards.map((c) => `<li class="tile" data-reveal><h3>${c.title}</h3><p>${c.text}</p></li>`).join('')}
      </ul>`)}
  </section>`;
}

function renderOutput() {
  const o = output;
  const r = o.realRun;
  return `
  <section class="chapter" id="salida" data-i="5" aria-labelledby="t-salida">
    ${plate(`
      ${head(5, 'Salida')}
      <div data-reveal>
        <h2 id="t-salida" tabindex="-1">${o.title}</h2>
        <p class="lead" style="margin-top:.5rem">${o.lead}</p>
      </div>
      <div class="out-grid">
        <figure class="run" data-reveal>
          <div class="run-frame">
            <img src="${r.img}" alt="${r.alt}" width="720" height="1280" loading="lazy" decoding="async">
            <span class="run-tag">${r.tag}</span>
          </div>
          <figcaption class="run-caption">${r.caption}</figcaption>
          <ul class="run-facts">${r.facts.map((f) => `<li>${f}</li>`).join('')}</ul>
          <a class="credit" href="${r.creditHref}" target="_blank" rel="noopener">${r.credit}</a>
        </figure>
        <div class="panes" data-reveal>
          <div class="seg glass glass--soft" role="group" aria-label="Qué mostrar">
            <button type="button" data-pane="json" aria-pressed="true">Estructura del JSON</button>
            <button type="button" data-pane="events" aria-pressed="false">${o.eventsTitle}</button>
          </div>
          <div class="pane" id="pane-json">
            <div class="code" tabindex="0" role="region" aria-label="Estructura del JSON de salida"><pre><code>${esc(o.jsonLines.join('\n'))}</code></pre></div>
            <p class="caption">${o.jsonCaption}</p>
          </div>
          <div class="pane events tile" id="pane-events" hidden>
            <table>
              <thead><tr><th scope="col">Evento y regla</th><th scope="col">${o.colWarn}</th><th scope="col">${o.colCrit}</th></tr></thead>
              <tbody>
                ${o.events.map((e) => `<tr><td class="ev"><span class="type">${e.type}</span><span class="rule">${e.rule}</span></td><td class="num">${e.warn}</td><td class="num">&gt; ${e.crit}</td></tr>`).join('')}
              </tbody>
            </table>
            <p class="note">${o.eventsNote}</p>
          </div>
        </div>
      </div>`)}
  </section>`;
}

function renderStatus() {
  const s = status;
  const marker = { si: 'dot--si', dev: 'dot--parcial', plan: 'dot--no' };
  return `
  <section class="chapter" id="estado" data-i="6" aria-labelledby="t-estado">
    ${plate(`
      ${head(6, 'Estado')}
      <h2 id="t-estado" tabindex="-1" data-reveal>${s.title}</h2>
      <div class="status-grid">
        ${s.columns.map((c) => `
          <div class="status-col tile" data-reveal>
            <h3><span class="dot ${marker[c.key]}" aria-hidden="true"></span>${c.label}</h3>
            ${c.note ? `<p class="tag">${c.note}</p>` : ''}
            <ul>${c.items.map((i) => `<li>${i}</li>`).join('')}</ul>
          </div>`).join('')}
      </div>
      <div class="closing glass glass--soft" data-reveal>
        <div><h3>${s.closing.title}</h3><p>${s.closing.text}</p></div>
        <a class="btn glass-cta" href="${REPO_URL}" target="_blank" rel="noopener">${s.closing.cta} <span aria-hidden="true">↗</span></a>
      </div>
      <div class="foot" data-reveal>
        ${TEAM.length ? `<span>Equipo: ${TEAM.join(' · ')}</span>` : ''}
        ${EVENT_NAME ? `<span>${EVENT_NAME} · 10 horas</span>` : ''}
        <a href="#inicio" data-goto="0">${s.backToStart}</a>
      </div>`)}
  </section>`;
}

$('#contenido').innerHTML = [
  renderHero(), renderProblem(), renderPipeline(), renderSignals(), renderLimits(), renderOutput(), renderStatus(),
].join('');

$('#topNav').innerHTML = chapters.slice(1)
  .map((c, i) => `<a href="#${c.id}" data-goto="${i + 1}">${pad(i + 1)} ${c.label}</a>`)
  .join('');
$('#dock').innerHTML = chapters
  .map((c, i) => `<a href="#${c.id}" data-goto="${i}" tabindex="-1"><span>${i ? `${pad(i)} ` : ''}${c.label}</span></a>`)
  .join('');

// Atajos de presentador: una leyenda fija que solo se ve en el Inicio.
document.body.insertAdjacentHTML('beforeend', `
  <ul class="keys-hint glass glass--soft" aria-label="Atajos de teclado">
    <li>Modo presentación</li>
    ${keys.map((k) => `<li>${k.k.map((x) => `<kbd>${x}</kbd>`).join(' ')} ${k.t}</li>`).join('')}
  </ul>`);

// Escalonado del revelado dentro de cada capítulo.
$$('.chapter').forEach((ch) => $$('[data-reveal]', ch).forEach((el, i) => el.style.setProperty('--d', Math.min(i, 10))));

/* ------------------------------------------------------------ señales (↑ ↓) */
const sigButtons = $$('.sig-btn');
let sigIndex = 0;

function renderSignalDetail(i) {
  const it = signals.items[i];
  const f = signals.fields;
  $('#sigDetail').innerHTML = `
    <div class="field"><span class="label">Señal ${pad(i + 1)}</span><h3>${it.title}</h3></div>
    <dl style="margin:0;display:flex;flex-direction:column;gap:1rem">
      <div class="field"><dt>${f.indica}</dt><dd>${it.indica}</dd></div>
      <div class="field"><dt>${f.camara}</dt><dd>${it.camara}</dd></div>
      <div class="field"><dt>${f.estado}</dt><dd class="badge"><span class="dot dot--${it.done === 'si' ? 'si' : it.done === 'parcial' ? 'parcial' : 'no'}" aria-hidden="true"></span>${it.estado}</dd></div>
    </dl>
    <div class="meter-row">
      <span class="label">${f.viab}</span>
      <span class="meter" aria-hidden="true">${[1, 2, 3, 4].map((n) => `<i class="${n <= it.level ? 'on' : ''}"></i>`).join('')}</span>
      <strong>${it.nivel}</strong>${it.nota ? `<span class="muted">${it.nota}</span>` : ''}
    </div>`;
}

function selectSignal(i, { focus = false } = {}) {
  sigIndex = Math.max(0, Math.min(sigButtons.length - 1, i));
  sigButtons.forEach((b, n) => {
    const on = n === sigIndex;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.tabIndex = on ? 0 : -1;
  });
  renderSignalDetail(sigIndex);
  if (focus) sigButtons[sigIndex].focus({ preventScroll: true });
}
sigButtons.forEach((b, n) => b.addEventListener('click', () => selectSignal(n)));
selectSignal(0);

/* ----------------------------------------- Salida: JSON / eventos (sin flechas) */
const segButtons = $$('.seg button');
segButtons.forEach((b) => b.addEventListener('click', () => {
  segButtons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  $('#pane-json').hidden = b.dataset.pane !== 'json';
  $('#pane-events').hidden = b.dataset.pane !== 'events';
}));

/* ------------------------------------------------- rendimiento: modo liviano */
// ?lite=1 lo fuerza, ?lite=0 lo apaga (y desactiva la detección). Tecla L: alterna.
const liteParam = new URLSearchParams(location.search).get('lite');
let liteDecided = liteParam !== null;
function setLite(on, why = '') {
  document.documentElement.classList.toggle('lite', on);
  try { sessionStorage.setItem('agrocow-lite', on ? '1' : '0'); } catch { /* sin storage */ }
  if (why) $('#live').textContent = on ? 'Modo liviano activado' : 'Modo liviano desactivado';
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

function setActive(i, { announce = false, hash = true } = {}) {
  cur = i;
  document.body.dataset.ch = String(i);
  hudNum.textContent = pad(i);
  hudLabel.textContent = chapters[i].label;
  $$('#topNav a, #dock a').forEach((a) => {
    if (Number(a.dataset.goto) === i) a.setAttribute('aria-current', 'step');
    else a.removeAttribute('aria-current');
  });
  if (hash) {
    try { history.replaceState(null, '', `#${chapters[i].id}`); } catch { /* file:// o iframe */ }
  }
  if (announce) live.textContent = i === 0 ? 'Inicio' : `Capítulo ${i} de ${LAST}: ${chapters[i].label}`;
}

const easeOut = (t) => 1 - (1 - t) ** 5; // aproxima cubic-bezier(0.22, 1, 0.36, 1)

function scrollToY(target, instant) {
  cancelAnimationFrame(rafAnim);
  if (instant || reduced()) {
    window.scrollTo(0, target);
    animating = false;
    return;
  }
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
      // Si más de la mitad de los cuadros (de al menos 10, acumulados entre transiciones) tardó más de 40 ms, pasa solo a modo liviano.
      if (!liteDecided && perf.n >= 10) { liteDecided = true; if (perf.slow / perf.n > 0.5) setLite(true, 'auto'); }
    }
  };
  rafAnim = requestAnimationFrame(step);
}

function goTo(i, { instant = false, announce = true, focus = true } = {}) {
  const idx = Math.max(0, Math.min(LAST, i));
  setActive(idx, { announce });
  scrollToY(tops[idx], instant);
  if (focus) {
    const h = $('h1, h2', sections[idx]);
    if (h) h.focus({ preventScroll: true });
  }
}

// Si la persona usa rueda o toca la pantalla, se corta la animación automática.
['wheel', 'touchstart', 'mousedown'].forEach((ev) =>
  window.addEventListener(ev, () => { cancelAnimationFrame(rafAnim); animating = false; }, { passive: true }));

/* --------------------------------------------------------- scroll → mundo */
const layers = [
  { el: $('.l-far'), k: 3.5 },
  { el: $('.l-mid'), k: 8 },
  { el: $('.l-near'), k: 15 },
  { el: $('.glow-a'), k: 2 },
  { el: $('.glow-b'), k: 5 },
];

function frame() {
  rafScroll = 0;
  const y = window.scrollY;
  // posición continua entre capítulos: 0 … LAST
  let idx = 0;
  for (let i = 0; i < tops.length; i += 1) if (tops[i] <= y) idx = i;
  const next = tops[idx + 1];
  const p = next === undefined ? idx : idx + Math.min(1, (y - tops[idx]) / Math.max(1, next - tops[idx]));

  if (!reduced()) {
    const vw = window.innerWidth / 100;
    layers.forEach((l) => { l.el.style.transform = `translate3d(${(-p * l.k * vw).toFixed(1)}px,0,0)`; });
  } else {
    layers.forEach((l) => { l.el.style.transform = ''; });
  }

  const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
  progress.style.transform = `scaleX(${Math.min(1, y / maxScroll).toFixed(4)})`;

  if (!animating) {
    const now = indexFromScroll();
    if (now !== cur) setActive(now);
  }
}
const onScroll = () => { markMoving(); if (!rafScroll) rafScroll = requestAnimationFrame(frame); };
window.addEventListener('scroll', onScroll, { passive: true });
const remeasure = () => { measure(); onScroll(); };
window.addEventListener('resize', remeasure);
new ResizeObserver(remeasure).observe($('#contenido'));
document.fonts?.ready.then(remeasure);

/* ------------------------------------------------------------ revelado */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.12 });
$$('[data-reveal], [data-line]').forEach((el) => io.observe(el));

/* ------------------------------------------- brillo del vidrio que sigue al mouse */
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.addEventListener('pointermove', (e) => {
    const g = e.target instanceof Element ? e.target.closest('.glass') : null;
    if (!g) return;
    const r = g.getBoundingClientRect();
    g.style.setProperty('--mx', `${(e.clientX - r.left).toFixed(0)}px`);
    g.style.setProperty('--my', `${(e.clientY - r.top).toFixed(0)}px`);
  }, { passive: true });
}

/* --------------------------------------------------------- pantalla completa */
function toggleFullscreen() {
  const el = document.documentElement;
  const p = document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen?.();
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
$('#btnPrev').addEventListener('click', () => goTo(cur - 1));
$('#btnNext').addEventListener('click', () => goTo(cur + 1));
btnFs.addEventListener('click', toggleFullscreen);

document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;

  const key = e.key;
  const go = (i) => { e.preventDefault(); if (!e.repeat) goTo(i); };

  if (key === 'ArrowRight' || key === 'PageDown') return go(cur + 1);
  if (key === ' ' || key === 'Spacebar') return go(e.shiftKey ? cur - 1 : cur + 1);
  if (key === 'ArrowLeft' || key === 'PageUp') return go(cur - 1);
  if (key === 'Home') return go(0);
  if (key === 'End') return go(LAST);
  if (/^[1-6]$/.test(key) && !e.shiftKey) return go(Number(key));
  if (key === 'f' || key === 'F') { e.preventDefault(); if (!e.repeat) toggleFullscreen(); return; }
  if (key === 'l' || key === 'L') { e.preventDefault(); if (!e.repeat) { liteDecided = true; setLite(!document.documentElement.classList.contains('lite'), 'manual'); } return; }

  // En "Señales" las flechas ↑ ↓ recorren la lista.
  if ((key === 'ArrowDown' || key === 'ArrowUp') && cur === 3) {
    e.preventDefault();
    selectSignal(sigIndex + (key === 'ArrowDown' ? 1 : -1), { focus: true });
  }
});

/* ------------------------------------------------------------------ inicio */
measure();
const initial = chapters.findIndex((c) => `#${c.id}` === location.hash);
if (initial > 0) {
  setActive(initial, { hash: false });
  window.scrollTo(0, tops[initial]);
} else {
  setActive(0, { hash: false });
}
frame();
window.addEventListener('load', remeasure);

// La intro de marca no bloquea nada (pointer-events: none): se quita del DOM al terminar.
setTimeout(() => $('#intro')?.remove(), 2300);

// Para pruebas automáticas.
window.__agrocow = { goTo, get current() { return cur; }, get signal() { return sigIndex; } };
