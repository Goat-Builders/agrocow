/* Fondo "frame motion": video real que avanza cuadro a cuadro con el scroll, con el pipeline de
   visión del proyecto dibujado encima, etapa por etapa (detección, seguimiento, zonas, conducta).

   Adaptado del motor de scroll-world (https://github.com/oso95/scroll-world,
   skills/scroll-world/references/scrub-engine.js), © 2026 cyw, licencia MIT
   (texto completo en ./vendor/scroll-world-LICENSE.txt).

   Se conserva del original: el clip se carga como Blob (siempre se puede buscar, no depende
   de byte ranges), el tiempo actual se acerca al objetivo con un factor 0,18 por cuadro, nunca se
   pide una búsqueda mientras el decodificador está en `seeking`, el umbral de búsqueda es más
   grueso en el celular, el póster queda visible hasta el primer `seeked`, cada video se "prepara"
   al primer toque (iOS) y con prefers-reduced-motion no se carga ningún video.

   Cambios para AgroCow: no arma textos, nav ni alto de scroll propios (eso lo pone el pitch); el
   loop se apaga solo cuando no hay nada que mover; tope de ~40 cuadros por segundo; pausa con la
   pestaña oculta; carga diferida y nunca con modo liviano o ahorro de datos; se compara contra el
   último tiempo pedido (un clip que arranca en 0,034 s hacía buscar para siempre); y las cajas,
   estelas, zonas y métricas salen de correr el detector y el tracker del proyecto sobre el clip. */

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const MIN_FRAME_MS = 24;     // ~40 fps como máximo
const LERP = 0.18;           // igual que scroll-world
const CROSSFADE = 0.12;      // ancho del fundido entre escenas, en alturas de pantalla
const MAX_BOXES = 8;
const TRAIL = 24;            // cuadros de estela
const ISOLATION_MULT = 2.5;  // mismo umbral que isolation_mult del motor
const ISOLATION_MIN = 3;     // mismo mínimo de animales que isolation_min_animals
const fmt = (n, d = 1) => n.toFixed(d).replace('.', ',');

function inPoly(x, y, poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]; const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}

export function mountScrub(stage, { scenes, bounds, tracksUrl, zones = {}, posX = 0.5, posY = 0.55, onActive = () => {}, onFrame = () => {} }) {
  const coarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  const small = window.matchMedia('(max-width: 860px)');
  const isMobile = () => coarse || small.matches;
  const SVGNS = 'http://www.w3.org/2000/svg';
  let enabled = false;
  let tracks = null;
  let raf = 0;
  let last = 0;
  let cv = 0;               // etapa del pipeline que se muestra (0 = portada)

  // ---- DOM: por escena, póster + (video) + cajas + capa SVG (estelas y zonas) ----
  const S = scenes.map((sc, i) => {
    const el = document.createElement('div');
    el.className = 'sc';
    el.innerHTML = `<picture class="sc-poster">
        <source type="image/avif" srcset="${sc.poster}-640.avif 640w, ${sc.poster}-960.avif 960w" sizes="100vw">
        <img src="${sc.poster}-960.webp" srcset="${sc.poster}-640.webp 640w, ${sc.poster}-960.webp 960w" sizes="100vw" alt="" width="960" height="540" decoding="async" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>
      </picture>
      <svg class="sc-svg" aria-hidden="true"><g class="sc-zone"></g><g class="sc-trails"></g></svg>
      <div class="sc-boxes"></div>`;
    stage.appendChild(el);
    const boxes = el.querySelector('.sc-boxes');
    const svg = el.querySelector('.sc-svg');
    const pool = Array.from({ length: MAX_BOXES }, () => {
      const b = document.createElement('div');
      b.className = 'trk';
      b.innerHTML = '<span></span>';
      boxes.appendChild(b);
      const line = document.createElementNS(SVGNS, 'polyline');
      line.setAttribute('class', 'trail');
      svg.querySelector('.sc-trails').appendChild(line);
      return { el: b, label: b.firstChild, line, id: null, text: '' };
    });
    if (i > 0) el.style.visibility = 'hidden';
    return { ...sc, el, boxes, svg, pool, video: null, ready: false, loading: false, lastSeek: null, cur: 0, target: 0, op: i === 0 ? 1 : 0, lastFrame: -1 };
  });

  let size = { w: window.innerWidth, h: window.innerHeight };
  const measureScene = () => { const r = S[0].el.getBoundingClientRect(); size = { w: r.width || window.innerWidth, h: r.height || window.innerHeight }; };

  // ---- geometría: dónde cae el cuadro del video (object-fit: cover) ----
  function rect(vw, vh) {
    const s = Math.max(size.w / vw, size.h / vh);
    const w = vw * s; const h = vh * s;
    return { x: (size.w - w) * posX, y: (size.h - h) * posY, w, h };
  }

  // ---- datos derivados de las cajas (se calculan una vez al cargar) ----
  function prepare(id, tr) {
    const zone = (zones[id] || [])[0];
    const dwell = []; const seen = []; const seenSet = new Set(); const acc = new Map();
    tr.frames.forEach((row, f) => {
      row.forEach(([tid, x, y, w, h]) => {
        seenSet.add(tid);
        if (zone && inPoly(x + w / 2, y + h, zone.poly)) acc.set(tid, (acc.get(tid) || 0) + 1 / tr.fps);
      });
      dwell[f] = new Map(acc);
      seen[f] = seenSet.size;
    });
    tr.dwell = dwell; tr.seen = seen; tr.zone = zone;
  }

  function drawZone(s, r) {
    const g = s.svg.querySelector('.sc-zone');
    const tr = tracks && tracks[s.id];
    if (!tr || !tr.zone) { g.innerHTML = ''; return; }
    const pts = tr.zone.poly.map(([x, y]) => `${(r.x + x * r.w).toFixed(1)},${(r.y + y * r.h).toFixed(1)}`).join(' ');
    const [lx, ly] = tr.zone.poly[1]; // esquina superior derecha: lejos del panel
    g.innerHTML = `<polygon points="${pts}"/><text text-anchor="end" x="${(r.x + lx * r.w - 8).toFixed(1)}" y="${(r.y + ly * r.h - 10).toFixed(1)}">zona ${tr.zone.label} · fija en la imagen</text>`;
  }

  function drawBoxes(s, timeSec) {
    if (!tracks || !tracks[s.id]) return;
    const tr = tracks[s.id];
    const f = Math.min(tr.frames.length - 1, Math.max(0, Math.floor(timeSec * tr.fps)));
    if (f === s.lastFrame) return;
    s.lastFrame = f;
    const r = rect(tr.w, tr.h);
    const row = tr.frames[f];
    // conducta: distancia de cada vaca a su vecina más cercana, en anchos medios de caja (regla del motor)
    let near = null;
    if (cv === 5 && row.length >= ISOLATION_MIN) {
      const wbar = row.reduce((a, b) => a + b[3], 0) / row.length;
      near = row.map(([, x, y, w, h]) => {
        const px = x + w / 2; const py = y + h;
        let best = Infinity;
        row.forEach(([, x2, y2, w2, h2]) => { const d = Math.hypot(px - (x2 + w2 / 2), (py - (y2 + h2)) * (tr.h / tr.w)); if (d > 1e-6 && d < best) best = d; });
        return best / wbar;
      });
    }
    s.pool.forEach((p, k) => {
      const b = row[k];
      if (!b) {
        if (p.id !== null) { p.el.style.opacity = '0'; p.line.setAttribute('points', ''); p.id = null; }
        return;
      }
      const [id, x, y, w, h, conf] = b;
      p.el.style.cssText = `opacity:1;left:${(r.x + x * r.w).toFixed(1)}px;top:${(r.y + y * r.h).toFixed(1)}px;width:${(w * r.w).toFixed(1)}px;height:${(h * r.h).toFixed(1)}px`;
      const tag = `id ${String(id).padStart(2, '0')}`;
      let text = tag;
      let far = false;
      if (cv === 2) text = `vaca ${fmt(conf ?? 0, 2)}`;
      else if (cv === 4) { const sec = tr.dwell[f].get(id); text = sec ? `${tag} · comedero ${fmt(sec)} s` : tag; }
      else if (cv === 5) {
        if (near) { far = near[k] > ISOLATION_MULT; text = `${tag} · vecino ${fmt(near[k])}×`; } else text = `${tag} · menos de 3 vacas`;
      }
      if (text !== p.text) { p.text = text; p.label.textContent = text; }
      if (p.id !== id) { p.id = id; p.el.classList.toggle('trk--mint', id % 2 === 0); }
      p.el.classList.toggle('trk--far', far);
      // estela: el punto de apoyo (pies) de este ID en los últimos cuadros
      if (cv >= 3) {
        const pts = [];
        for (let q = Math.max(0, f - TRAIL); q <= f; q += 2) {
          const hit = tr.frames[q].find((bb) => bb[0] === id);
          if (hit) pts.push(`${(r.x + (hit[1] + hit[3] / 2) * r.w).toFixed(1)},${(r.y + (hit[2] + hit[4]) * r.h).toFixed(1)}`);
        }
        p.line.setAttribute('points', pts.join(' '));
        p.line.classList.toggle('trail--mint', id % 2 === 0);
      }
    });
    if (s.op > 0.5) onFrame({ scene: s.id, frame: f + 1, total: tr.frames.length, count: row.length, seen: tr.seen[f] });
  }

  // ---- scroll → objetivo y opacidad de cada escena ----
  function read() {
    const y = window.scrollY;
    const vh = window.innerHeight;
    const fade = CROSSFADE * vh;
    const b = bounds();
    S.forEach((s, i) => {
      const { start, end } = b[i];
      s.target = clamp((y - start) / Math.max(1, end - start));
      let outside = 0;
      if (y < start) outside = start - y; else if (y > end) outside = y - end;
      if (i === 0 && y < start) outside = 0;
      if (i === S.length - 1 && y > end) outside = 0;
      const op = smooth(1 - outside / fade);
      if (Math.abs(op - s.op) > 0.001) { s.op = op; s.el.style.opacity = op.toFixed(3); s.el.style.visibility = op < 0.001 ? 'hidden' : 'visible'; }
      s.el.style.zIndex = op > 0.5 ? '2' : '1';
      if (enabled && !s.video && !s.loading && op > 0 && Math.abs(y - start) < 1.6 * vh + (end - start)) load(s);
    });
    wake();
  }

  // ---- loop: se apaga solo cuando todo está quieto ----
  function tick(now) {
    raf = 0;
    if (document.hidden) return;
    if (now - last < MIN_FRAME_MS) { raf = requestAnimationFrame(tick); return; }
    last = now;
    const eps = isMobile() ? 0.02 : 0.008;
    let busy = false;
    S.forEach((s) => {
      if (s.op <= 0.001 && Math.abs(s.cur - s.target) < 0.002) return;
      const d = s.target - s.cur;
      if (Math.abs(d) < 0.0015) s.cur = s.target; else { s.cur += d * LERP; busy = true; }
      const tr = tracks && tracks[s.id];
      const dur = (s.video && s.ready && s.video.duration) || (tr ? tr.frames.length / tr.fps : 1);
      const t = clamp(s.cur, 0, 0.999) * dur;
      if (enabled && s.video && s.ready) {
        if (s.video.seeking) busy = true;
        else if (s.lastSeek === null || Math.abs(s.lastSeek - t) > eps) { s.lastSeek = t; try { s.video.currentTime = t; } catch { /* nada */ } busy = true; }
        drawBoxes(s, s.video.currentTime);
      } else {
        drawBoxes(s, t); // sin video: las cajas igual siguen el scroll sobre el póster
      }
    });
    if (busy) { onActive(); raf = requestAnimationFrame(tick); }
  }
  function wake() { if (!raf && !document.hidden) raf = requestAnimationFrame(tick); }

  // ---- carga ----
  function load(s) {
    s.loading = true;
    const url = isMobile() && s.clipM ? s.clipM : s.clip;
    fetch(url).then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status))))).then((blob) => {
      if (!enabled) { s.loading = false; return; }
      const v = document.createElement('video');
      v.className = 'sc-video';
      v.muted = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true'); v.tabIndex = -1;
      v.src = URL.createObjectURL(blob);
      v.addEventListener('loadedmetadata', () => { s.ready = true; s.lastFrame = -1; s.lastSeek = null; wake(); });
      v.addEventListener('seeked', () => s.el.classList.add('has-clip'), { once: true });
      v.addEventListener('loadeddata', () => { try { v.pause(); } catch { /* nada */ } if (primed) prime(v); });
      s.el.insertBefore(v, s.svg);
      s.video = v;
    }).catch(() => { s.loading = false; });
  }
  let primed = false;
  function prime(v) {
    if (!isMobile() || !v) return;
    try { const p = v.play(); if (p && p.then) p.then(() => { try { v.pause(); } catch { /* nada */ } }).catch(() => {}); } catch { /* nada */ }
  }
  const onGesture = () => { if (primed) return; primed = true; S.forEach((s) => prime(s.video)); };
  window.addEventListener('pointerdown', onGesture, { once: true, passive: true });
  window.addEventListener('touchstart', onGesture, { once: true, passive: true });

  function relayout() {
    measureScene();
    S.forEach((s) => {
      s.svg.setAttribute('viewBox', `0 0 ${size.w.toFixed(0)} ${size.h.toFixed(0)}`);
      const tr = tracks && tracks[s.id];
      if (tr) drawZone(s, rect(tr.w, tr.h));
      s.lastFrame = -1;
    });
  }

  relayout();
  if (tracksUrl) {
    fetch(tracksUrl).then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (!j) return;
      tracks = j;
      Object.entries(tracks).forEach(([id, tr]) => prepare(id, tr));
      relayout(); last = 0; wake();
    }).catch(() => {});
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });

  return {
    read,
    layout() { relayout(); read(); },
    setStage(n) { if (n === cv) return; cv = n; stage.dataset.cv = String(n); S.forEach((s) => { s.lastFrame = -1; }); last = 0; wake(); },
    setEnabled(on) {
      enabled = on;
      if (!on) S.forEach((s) => { if (s.video) { const u = s.video.src; s.video.removeAttribute('src'); s.video.load(); s.video.remove(); try { URL.revokeObjectURL(u); } catch { /* nada */ } } s.video = null; s.ready = false; s.loading = false; s.el.classList.remove('has-clip'); s.lastFrame = -1; });
      read();
    },
    get state() { return S.map((s) => ({ id: s.id, op: s.op, cur: s.cur, ready: s.ready, t: s.video ? s.video.currentTime : null, boxes: s.pool.filter((p) => p.id !== null).length, labels: s.pool.filter((p) => p.id !== null).map((p) => p.text), far: s.pool.filter((p) => p.el.classList.contains('trk--far')).length, trails: s.pool.filter((p) => (p.line.getAttribute('points') || '').length > 0).length })); },
  };
}
