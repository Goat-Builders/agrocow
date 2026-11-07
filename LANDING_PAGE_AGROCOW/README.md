# AgroCow · landing para proyectar en el pitch

Sitio estático (Vite + JavaScript, sin backend) que se proyecta detrás del orador durante el pitch de 2:30 min. Una pantalla por idea, avanza con el clicker (o con scroll) al ritmo del discurso. Los textos viven en [`src/content.js`](src/content.js).

```bash
cd LANDING_PAGE_AGROCOW
npm install
npm run dev       # http://localhost:5173/
npm run build     # genera dist/ (rutas relativas)
npm run preview   # sirve dist/
```

**Deploy en Vercel:** Root Directory = `LANDING_PAGE_AGROCOW`, Framework = Vite, Build = `npm run build`, Output = `dist`.

## Pantallas (orden del guion)

| Bloque | Pantallas | Hora aprox. |
|---|---|---|
| 1 · Problema | 1 Cuatro segundos por vaca · 2 pregunta «¿Cuántos enfermos se les escaparían?» · 3 «3 DE CADA 4» · 4 «1 VACA muere cada 10 minutos» · 5 «80.000 USD de pérdidas anuales» (feedlot de 1.000 cabezas) · 6 «100 A 150 terneros se podrían comprar con esas pérdidas» | 0:00–0:30 |
| 2 · Por qué ahora y nosotros | 7 El recorredor trabaja todo el día, es propenso a errores (ilustración) · 8 «Somos» + logo de AgroCow | 0:30–0:50 |
| 3 · Solución | 9 «CÓMO FUNCIONA» → 10 **video del MVP** (`public/media/mvp.mp4`, arranca solo al llegar, se repite en bucle y se pausa al salir; clic para pausar) → 11 tres pasos (cámaras · detecta el cambio · alerta al celular) · 12 Va directo a quien lo necesita (1.000 puntos, uno resaltado) | 0:50–1:30 |
| 4 · Mercado y negocio | 13 «+4 MILLONES» · 14 «1.000 MILLONES» sobre el mapa · 15 Cobramos un abono por cabeza (más ganado, más ganamos) · 16 pregunta «¿Cómo entramos al mercado?» · 17 piloto → todo el feedlot → feedlots más grandes → otros países | 1:30–2:05 |
| 5 · Cierre | 18 «TRATARLO O ~ENTERRARLO~» (en rojo sangre) · «Con AgroCow, lo ve a tiempo» | 2:05–2:20 |

Reglas del brief que la web cumple (y `pitch-test` verifica): máximo 15 palabras por pantalla, títulos ≥ 48 px en pantalla proyectada, preguntas retóricas solas y centradas, transiciones de 0,4 s, solo verde oscuro + lima + blanco, sin logos de terceros ni fotos de personas.

## Teclado

| Tecla | Acción |
|---|---|
| `→`, `↓`, `Espacio`, `PageDown` | Pantalla siguiente |
| Clic o toque en cualquier parte | Pantalla siguiente (no actúa sobre links, botones ni el video: el clic del video lo pausa) |
| `←`, `↑`, `PageUp`, `Shift+Espacio` | Pantalla anterior |
| `1`–`5` | Ir al bloque del guion |
| `Home` / `End` | Primera / última |
| `F` | Pantalla completa |

Con `prefers-reduced-motion` los saltos son instantáneos.

## Fuentes de las cifras

Las pantallas llevan solo las cifras del guion; de dónde sale cada una y su estado está en [`public/fuentes.html`](public/fuentes.html) (`/fuentes.html`, no se proyecta). Pendientes de verificar: Micheloud 2026 y Laguzzi 2015 (mortalidad) y la cifra de terneros (el guion dice 100 a 150; las notas daban 50 a 150).

## Lo que el código hace hoy vs. lo que dice el guion

El motor (`agrotrack_cv`) detecta con YOLO11, sigue con ByteTrack, mide tiempo por zona (comedero/bebedero), distancia al grupo y movimiento, y genera alertas con tres reglas fijas. **Todavía no existen:** aprender la rutina de cada animal, reconocer «echado», la regla «come o bebe menos», reconocer al mismo animal de un día a otro y el aviso al celular (hoy las alertas salen por la API y el dashboard).

## Diseño

- Logo oficial (`assets/brand`, en `public/brand/`) y lima #BEFB03 como acento sobre verde corral casi negro.
- **Fondo:** video real de vacas (clip CC0 de Wikimedia Commons) que avanza cuadro a cuadro con el scroll (técnica de [scroll-world](https://github.com/oso95/scroll-world), MIT, ver `src/vendor/`). Encima se dibujan las cajas con ID que el pipeline (YOLO11n + ByteTrack, `agrotrack_cv`) calculó sobre ese mismo clip, guardadas en `public/media/tracks.json`. En la portada se ve entero; en el resto, un velo oscuro mantiene el contraste del texto. El video se descarga con la primera interacción y nunca con movimiento reducido o ahorro de datos (sin video queda el póster con las cajas).
- Ilustraciones propias (recorredor a caballo, mapa de Argentina, Brasil y EE. UU. generado de Natural Earth, dominio público).
- La versión con la demo por etapas sobre scroll (detección, seguimiento, zonas y conducta, con el id 01 aislado) quedó en el historial de git en el commit `4007ec3`.
