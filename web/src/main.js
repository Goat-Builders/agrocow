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

/* ------------------------------------------------------------------ render */
const head = (n, label) =>
  `<div class="chap-head" data-reveal><span>${String(n).padStart(2, '0')} / 0${LAST}</span><span class="rule"></span><span class="name">${label}</span></div>`;

function renderHero() {
  return `
  <section class="chapter chapter--hero" id="inicio" data-i="0" aria-labelledby="t-inicio">
    <div class="hero-grid">
      <div class="hero-copy">
        <p class="eyebrow" data-reveal>${hero.eyebrow}</p>
        <h1 id="t-inicio" tabindex="-1" data-reveal>${hero.title}</h1>
        <p class="lead" data-reveal>${hero.lead}</p>
        <p class="status-pill" data-reveal>${hero.status}</p>
        <div class="cta-row" data-reveal>
          <a class="btn btn--primary" href="#problema" data-goto="1">${hero.ctaPrimary}</a>
          <a class="btn btn--ghost" href="#pipeline" data-goto="2">${hero.ctaSecondary}</a>
        </div>
        <ul class="keys" aria-label="Atajos de teclado" data-reveal>
          <li class="muted">Modo presentación</li>
          ${keys.map((k) => `<li>${k.k.map((x) => `<kbd>${x}</kbd>`).join(' ')} ${k.t}</li>`).join('')}
        </ul>
      </div>
      <div class="hero-art" role="img" aria-label="${hero.figureLabel}">
      </div>
    </div>
  </section>`;
}

function renderProblem() {
  const p = problem;
  return `
  <section class="chapter" id="problema" data-i="1" aria-labelledby="t-problema">
    <div class="plate plate--alt">
      ${head(1, 'Problema')}
      <div class="problem-grid">
        <div class="problem-left">
          <h2 id="t-problema" tabindex="-1" class="wide" data-reveal>${p.title}</h2>
          <p class="lead" data-reveal>${p.lead}</p>
          <div class="evidence" data-reveal>
            <p>${p.evidence.text}</p>
            <p class="caveat">${p.evidence.caveat}</p>
            <a class="cite" href="${p.evidence.href}" target="_blank" rel="noopener">Fuente: ${p.evidence.cite}</a>
          </div>
        </div>
        <ol class="problem-cards">
          ${p.cards.map((c, i) => `<li class="card card-n" data-reveal><span class="n">${String(i + 1).padStart(2, '0')}</span><div><h3>${c.title}</h3><p>${c.text}</p></div></li>`).join('')}
        </ol>
      </div>
    </div>
  </section>`;
}

function renderPipeline() {
  const p = pipeline;
  return `
  <section class="chapter" id="pipeline" data-i="2" aria-labelledby="t-pipeline">
    <div class="plate">
      ${head(2, 'Pipeline')}
      <h2 id="t-pipeline" tabindex="-1" class="wide" data-reveal>${p.title}</h2>
      <ol class="steps">
        ${p.steps.map((s, i) => `<li class="step" data-reveal><div class="step-top"><span>${String(i + 1).padStart(2, '0')}</span><span class="rule"></span></div><h3>${s.title}</h3><p>${s.text}</p></li>`).join('')}
      </ol>
      <div class="outputs" data-reveal><span>${p.outputsLabel}</span>${p.outputs.map((o) => `<span class="chip">${o}</span>`).join('')}</div>
      <p class="note" data-reveal>${p.note}</p>
    </div>
  </section>`;
}

function renderSignals() {
  const s = signals;
  return `
  <section class="chapter" id="senales" data-i="3" aria-labelledby="t-senales">
    <div class="plate plate--alt">
      ${head(3, 'Señales')}
      <div data-reveal>
        <h2 id="t-senales" tabindex="-1" class="wide">${s.title}</h2>
        <p class="lead" style="margin-top:.75rem">${s.lead}</p>
      </div>
      <div class="sig-grid" data-reveal>
        <div class="sig-list" role="group" aria-label="Señales" id="sigList">
          ${s.items.map((it, i) => `<button type="button" class="sig-btn" data-sig="${i}" aria-pressed="false" tabindex="-1"><span class="n">${String(i + 1).padStart(2, '0')}</span><span>${it.title}</span></button>`).join('')}
        </div>
        <div class="sig-detail" id="sigDetail" aria-live="polite"></div>
      </div>
      <p class="note" data-reveal>${s.footnote} Con ↑ ↓ cambiás de señal.</p>
    </div>
  </section>`;
}

function renderLimits() {
  const l = limits;
  return `
  <section class="chapter" id="limites" data-i="4" aria-labelledby="t-limites">
    <div class="plate">
      ${head(4, 'Límites')}
      <h2 id="t-limites" tabindex="-1" class="wide" data-reveal>${l.title}</h2>
      <ul class="limit-grid">
        ${l.cards.map((c) => `<li class="card" data-reveal><h3>${c.title}</h3><p>${c.text}</p></li>`).join('')}
      </ul>
    </div>
  </section>`;
}

function renderOutput() {
  const o = output;
  return `
  <section class="chapter" id="salida" data-i="5" aria-labelledby="t-salida">
    <div class="plate plate--alt">
      ${head(5, 'Salida')}
      <div data-reveal>
        <h2 id="t-salida" tabindex="-1" class="wide">${o.title}</h2>
        <p class="lead" style="margin-top:.75rem">${o.lead}</p>
      </div>
      <div class="out-grid">
        <div data-reveal>
          <div class="code" tabindex="0" role="region" aria-label="Estructura del JSON de salida"><pre><code>${o.jsonLines.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</code></pre></div>
          <p class="caption">${o.jsonCaption}</p>
        </div>
        <div class="events" data-reveal>
          <h3>${o.eventsTitle}</h3>
          <table>
            <thead><tr><th scope="col">Evento y regla</th><th scope="col">${o.colWarn}</th><th scope="col">${o.colCrit}</th></tr></thead>
            <tbody>
              ${o.events.map((e) => `<tr><td class="ev"><span class="type">${e.type}</span><span class="rule">${e.rule}</span></td><td class="num">${e.warn}</td><td class="num">&gt; ${e.crit}</td></tr>`).join('')}
            </tbody>
          </table>
          <p class="note">${o.eventsNote}</p>
        </div>
      </div>
    </div>
  </section>`;
}

function renderStatus() {
  const s = status;
  const marker = { si: 'dot--si', dev: 'dot--parcial', plan: 'dot--no' };
  return `
  <section class="chapter" id="estado" data-i="6" aria-labelledby="t-estado">
    <div class="plate">
      ${head(6, 'Estado')}
      <h2 id="t-estado" tabindex="-1" class="wide" data-reveal>${s.title}</h2>
      <div class="status-grid">
        ${s.columns.map((c) => `
          <div class="status-col" data-reveal>
            <h3><span class="dot ${marker[c.key]}" aria-hidden="true"></span>${c.label}</h3>
            ${c.note ? `<p class="tag">${c.note}</p>` : ''}
            <ul>${c.items.map((i) => `<li>${i}</li>`).join('')}</ul>
          </div>`).join('')}
      </div>
      <div class="foot" data-reveal>
        ${TEAM.length ? `<span>Equipo: ${TEAM.join(' · ')}</span>` : ''}
        ${EVENT_NAME ? `<span>${EVENT_NAME} · 10 horas</span>` : ''}
        <a href="${REPO_URL}" target="_blank" rel="noopener">github.com/felipebridge/agrocow</a>
        <a class="back" href="#inicio" data-goto="0">${s.backToStart}</a>
      </div>
    </div>
  </section>`;
}

$('#contenido').innerHTML = [
  renderHero(), renderProblem(), renderPipeline(), renderSignals(), renderLimits(), renderOutput(), renderStatus(),
].join('');

$('#topNav').innerHTML = chapters.slice(1)
  .map((c, i) => `<a href="#${c.id}" data-goto="${i + 1}">${String(i + 1).padStart(2, '0')} ${c.label}</a>`)
  .join('');

// Escalonado del revelado dentro de cada capítulo.
$$('.chapter').forEach((ch) => $$('[data-reveal]', ch).forEach((el, i) => el.style.setProperty('--d', Math.min(i, 10))));

/* ------------------------------------------------------------ señales (↑ ↓) */
const sigButtons = $$('.sig-btn');
let sigIndex = 0;

function renderSignalDetail(i) {
  const it = signals.items[i];
  const f = signals.fields;
  $('#sigDetail').innerHTML = `
    <div class="field"><span class="label">Señal ${String(i + 1).padStart(2, '0')}</span><h3>${it.title}</h3></div>
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
  hudNum.textContent = String(i).padStart(2, '0');
  hudLabel.textContent = chapters[i].label;
  $$('#topNav a').forEach((a) => {
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
  const step = (now) => {
    const t = Math.min(1, (now - t0) / dur);
    window.scrollTo(0, start + dist * easeOut(t));
    if (t < 1) rafAnim = requestAnimationFrame(step);
    else animating = false;
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
const onScroll = () => { if (!rafScroll) rafScroll = requestAnimationFrame(frame); };
window.addEventListener('scroll', onScroll, { passive: true });
const remeasure = () => { measure(); onScroll(); };
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

// Para pruebas automáticas.
window.__agrocow = { goTo, get current() { return cur; }, get signal() { return sigIndex; } };
