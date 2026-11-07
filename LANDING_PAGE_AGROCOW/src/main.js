import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/700.css';
import './styles.css';
import { BLOCKS, screens } from './content.js';
import { MAP } from './map-data.js';

document.documentElement.classList.add('js');

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => reduceQuery.matches;
const LAST = screens.length - 1;
const kw = (s) => s.replace(/\*(.+?)\*/g, '<em class="k">$1</em>'); // *palabra* → lima

const svg = (vb, body, cls = '') => `<svg class="${cls}" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
const ICONS = {
  camera: svg('0 0 24 24', '<rect x="3" y="7" width="13" height="10" rx="2"/><path d="m16 11 5-3v8l-5-3"/>'),
  detect: svg('0 0 24 24', '<path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4"/><circle cx="12" cy="12" r="3"/>'),
  phone: svg('0 0 24 24', '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M10 9.5a2 2 0 0 1 4 0c0 3 1 4 1 4H9s1-1 1-4zM11 16h2"/>'),
};

// Ilustraciones genéricas (sin fotos de personas ni logos de terceros)
const RIDER = `<svg class="art art--rider" viewBox="0 0 240 190" aria-hidden="true" focusable="false">
  <path d="M40 96C38 84 52 76 76 74C104 70 136 70 158 78C166 66 174 52 184 40L190 28L196 38C206 46 216 56 220 66C222 72 216 76 210 74L200 70C192 76 186 84 184 96C186 108 180 118 170 120L150 122C130 126 100 126 82 120C66 116 46 112 40 96Z"/>
  <path d="M166 116H177L179 150L183 176H168L168 154L160 130ZM146 118H157L157 150L161 176H148L146 152ZM56 108L76 112L78 144L82 176H68L66 148L50 124ZM84 118H98L96 150L98 176H86L84 150Z"/>
  <path d="M42 90C24 96 18 116 24 140C28 128 30 116 40 108Z"/>
  <path d="M104 74L114 40H128L124 74ZM118 72L136 96L130 114L118 110L114 90Z"/>
  <circle cx="122" cy="28" r="10"/>
  <path d="M104 21H142M112 20L114 8H132L134 20" class="hat"/>
  <path d="M124 48L148 62L158 76" class="arm"/></svg>`;
const NOSENSOR = svg('0 0 200 160', `
  <circle cx="100" cy="84" r="22"/><path d="M62 52a54 54 0 0 1 76 0M40 30a86 86 0 0 1 120 0"/>
  <path d="M30 140 170 20" class="strike"/>`, 'art art--nosensor');

function dotsSvg() {
  const cols = 40; const rows = 25; const hit = 9 * cols + 27;
  let c = '';
  for (let i = 0; i < cols * rows; i += 1) {
    const x = (i % cols) * 10 + 5; const y = Math.floor(i / cols) * 10 + 5;
    if (i !== hit) c += `<circle cx="${x}" cy="${y}" r="3"/>`;
  }
  const hx = (hit % cols) * 10 + 5; const hy = Math.floor(hit / cols) * 10 + 5;
  return `<svg class="art art--dots" viewBox="0 0 400 250" aria-hidden="true" focusable="false"><g class="d">${c}</g>
    <g class="hit"><circle cx="${hx}" cy="${hy}" r="5.5"/><path d="M${hx - 14} ${hy - 6}v-8h8M${hx + 6} ${hy - 14}h8v8M${hx + 14} ${hy + 6}v8h-8M${hx - 6} ${hy + 14}h-8v-8"/></g></svg>`;
}

function mapSvg() {
  const lab = (k, text) => `<text x="${MAP[k + 'Label'][0]}" y="${MAP[k + 'Label'][1]}" text-anchor="middle">${text}</text>`;
  return `<svg class="art art--map" viewBox="0 0 ${MAP.w} ${MAP.h}" role="img" aria-label="Mapa de Argentina, Brasil y Estados Unidos">
    <path class="oth" d="${MAP.others}"/><path class="hi" d="${MAP.usa}"/><path class="hi" d="${MAP.brazil}"/><path class="hi" d="${MAP.argentina}"/>
    ${lab('usa', 'EE. UU.')}${lab('brazil', 'BRASIL')}
    <text class="out" x="${MAP.argentinaLabel[0] - 40}" y="${MAP.argentinaLabel[1] + 30}" text-anchor="end">ARGENTINA</text></svg>`;
}

const LOGO = `<picture><source type="image/webp" srcset="brand/agrocow-logo-240.webp 240w, brand/agrocow-logo-480.webp 480w" sizes="(min-width: 900px) 30rem, 80vw"><img class="logo-big" src="brand/agrocow-logo-480.png" alt="AgroCow" width="480" height="86" decoding="async"></picture>`;

/* ------------------------------------------------------------------ render */
const hid = (i) => `t${i}`;
const title = (i, text, extra = '') => `<h2 id="${hid(i)}" tabindex="-1" class="title ${extra}" data-reveal>${kw(text)}</h2>`;
const sub = (text) => (text ? `<p class="sub" data-reveal>${kw(text)}</p>` : '');

const RENDER = {
  cover: (s, i) => `
    <div class="cover-copy">
      <h1 id="${hid(i)}" tabindex="-1" class="title title--xl" data-reveal>${kw(s.title)}</h1>
      ${sub(s.sub)}
    </div>
    <picture class="cover-img" data-reveal>
      <source type="image/avif" srcset="media/scene-b-poster-640.avif 640w, media/scene-b-poster-960.avif 960w" sizes="(min-width: 900px) 50vw, 100vw">
      <img src="media/scene-b-poster-960.webp" srcset="media/scene-b-poster-640.webp 640w, media/scene-b-poster-960.webp 960w" sizes="(min-width: 900px) 50vw, 100vw" alt="Corral de un feedlot con vacas en el comedero" width="960" height="540" fetchpriority="high" decoding="async">
    </picture>`,
  q: (s, i) => `<h2 id="${hid(i)}" tabindex="-1" class="q" data-reveal>${s.q}</h2>`,
  fig: (s, i) => `
    <h2 id="${hid(i)}" tabindex="-1" class="fig" data-reveal>${s.fig}</h2>
    <p class="cap" data-reveal>${s.cap}</p>
    ${sub(s.sub)}`,
  rider: (s, i) => `<div class="copy">${title(i, s.title)}${sub(s.sub)}</div>${RIDER}`,
  nosensor: (s, i) => `<div class="copy">${title(i, s.title)}${sub(s.sub)}</div>${NOSENSOR}`,
  team: (s, i) => `${LOGO}<h2 id="${hid(i)}" tabindex="-1" class="title" data-reveal>${s.title}</h2>`,
  flow: (s, i) => `<h2 id="${hid(i)}" tabindex="-1" class="flow" data-reveal>${s.title}</h2>`,
  steps: (s, i) => `
    <h2 id="${hid(i)}" tabindex="-1" class="sr-only">${s.title}</h2>
    <ol class="steps3" data-line data-reveal>
      ${s.steps.map((st, n) => `<li class="step3"><span class="step3-ic">${ICONS[st.icon]}</span><span class="step3-n" aria-hidden="true">${n + 1}</span><strong>${st.t}</strong>${st.s ? `<span class="step3-s">${st.s}</span>` : ''}</li>`).join('')}
    </ol>`,
  dots: (s, i) => `${title(i, s.title)}${sub(s.sub)}${dotsSvg()}`,
  map: (s, i) => `
    <div class="copy">
      <h2 id="${hid(i)}" tabindex="-1" class="fig fig--m" data-reveal>${s.fig}</h2>
      <p class="cap" data-reveal>${s.cap}</p>
    </div>${mapSvg()}`,
  timeline: (s, i) => `
    <h2 id="${hid(i)}" tabindex="-1" class="sr-only">${s.title}</h2>
    <ol class="tl" data-line data-reveal>
      ${s.steps.map((t, n) => `<li class="tl-step"><span class="tl-dot">${n + 1}</span><strong>${t}</strong></li>`).join('')}
    </ol>`,
  fee: (s, i) => `${title(i, s.title, 'title--xl')}${sub(s.sub)}`,
  closing: (s, i) => `<h2 id="${hid(i)}" tabindex="-1" class="big" data-reveal>${s.title}</h2>${sub(s.sub)}`,
  end: (s, i) => `<h2 id="${hid(i)}" tabindex="-1" class="sr-only">${s.title}</h2>${LOGO}`,
};

$('#contenido').innerHTML = screens.map((s, i) => `
  <section class="chapter k-${s.kind}" id="s${i + 1}" data-i="${i}" data-kind="${s.kind}" aria-labelledby="${hid(i)}">${RENDER[s.kind](s, i)}</section>`).join('');
$$('.chapter').forEach((ch) => $$('[data-reveal]', ch).forEach((el, n) => el.style.setProperty('--d', Math.min(n, 3))));

/* ------------------------------------------------------------ navegación */
const sections = $$('.chapter');
const live = $('#live');
const progress = $('#progress');
const blockStart = BLOCKS.map((_, b) => screens.findIndex((s) => s.block === b));
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
  const y = window.scrollY + vh * 0.5;
  let idx = 0;
  for (let i = 0; i < tops.length; i += 1) if (tops[i] <= y) idx = i;
  return idx;
}
function setActive(i, { announce = false, hash = true } = {}) {
  cur = i;
  document.body.dataset.ch = String(i);
  document.body.dataset.kind = screens[i].kind;
  if (hash) { try { history.replaceState(null, '', `#${i + 1}`); } catch { /* file:// o iframe */ } }
  if (announce) live.textContent = `Pantalla ${i + 1} de ${screens.length}: ${BLOCKS[screens[i].block].label}`;
}

const easeOut = (t) => 1 - (1 - t) ** 4;
const SCROLL_MS = 450; // el brief pide transiciones de 0,5 s como máximo
function scrollToY(target, instant) {
  cancelAnimationFrame(rafAnim);
  if (instant || reduced()) { window.scrollTo(0, target); animating = false; return; }
  const start = window.scrollY;
  const dist = target - start;
  if (Math.abs(dist) < 2) { animating = false; return; }
  const t0 = performance.now();
  animating = true;
  const step = (now) => {
    const t = Math.min(1, (now - t0) / SCROLL_MS);
    window.scrollTo(0, start + dist * easeOut(t));
    if (t < 1) rafAnim = requestAnimationFrame(step);
    else { animating = false; onScroll(); }
  };
  rafAnim = requestAnimationFrame(step);
}
function goTo(i, { instant = false, announce = true, focus = true } = {}) {
  const idx = Math.max(0, Math.min(LAST, i));
  setActive(idx, { announce });
  scrollToY(tops[idx], instant);
  if (focus) { const h = $('h1, h2', sections[idx]); if (h) h.focus({ preventScroll: true }); }
}
const advance = (dir) => goTo(cur + dir);

['wheel', 'touchstart', 'mousedown'].forEach((ev) =>
  window.addEventListener(ev, () => { cancelAnimationFrame(rafAnim); animating = false; }, { passive: true }));

function frame() {
  rafScroll = 0;
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
  progress.style.transform = `scaleX(${Math.min(1, window.scrollY / maxScroll).toFixed(4)})`;
  if (!animating) { const now = indexFromScroll(); if (now !== cur) setActive(now); }
}
function onScroll() { if (!rafScroll) rafScroll = requestAnimationFrame(frame); }
window.addEventListener('scroll', onScroll, { passive: true });
const remeasure = () => { measure(); onScroll(); };
window.addEventListener('resize', remeasure);
new ResizeObserver(remeasure).observe($('#contenido'));
document.fonts?.ready.then(remeasure);

/* ------------------------------------------------------------ revelado (una vez, 0,4 s) */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.25 });
$$('[data-reveal], [data-line]').forEach((el) => io.observe(el));

/* ------------------------------------------------------- teclado y botones */
function toggleFullscreen() {
  const p = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
  p?.catch(() => {});
}
document.addEventListener('fullscreenchange', () => setTimeout(remeasure, 120));
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-goto]');
  if (!a) return;
  e.preventDefault();
  goTo(Number(a.dataset.goto));
});
document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  const key = e.key;
  const run = (fn) => { e.preventDefault(); if (!e.repeat) fn(); };
  if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'PageDown') return run(() => advance(1));
  if (key === ' ' || key === 'Spacebar') return run(() => advance(e.shiftKey ? -1 : 1));
  if (key === 'ArrowLeft' || key === 'ArrowUp' || key === 'PageUp') return run(() => advance(-1));
  if (key === 'Home') return run(() => goTo(0));
  if (key === 'End') return run(() => goTo(LAST));
  if (/^[1-6]$/.test(key) && !e.shiftKey) return run(() => goTo(blockStart[Number(key) - 1]));
  if (key === 'f' || key === 'F') return run(toggleFullscreen);
  return undefined;
});

/* ------------------------------------------------------------------ inicio */
measure();
const fromHash = Number((location.hash.match(/^#(\d+)$/) || [])[1]) - 1;
if (fromHash > 0 && fromHash <= LAST) { setActive(fromHash, { hash: false }); window.scrollTo(0, tops[fromHash]); } else { setActive(0, { hash: false }); }
frame();
window.addEventListener('load', remeasure);

// Para pruebas automáticas.
window.__agrocow = { goTo, advance, get current() { return cur; }, count: screens.length, blockStart };
