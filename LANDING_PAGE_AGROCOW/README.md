# AgroCow · web de presentación

Sitio estático (Vite + JavaScript, sin backend) para el pitch en vivo: 8 diapositivas (Inicio, Problema, Por qué, Solución, Demo, Mercado, Negocio, Cierre). Los textos viven en [`src/content.js`](src/content.js) y siguen el guion del pitch: pocas palabras, una palabra clave (`*así*`) por diapositiva y la fuente de cada cifra en la nota al pie.

```bash
cd LANDING_PAGE_AGROCOW
npm install
npm run dev       # http://localhost:5173/
npm run build     # genera dist/ (rutas relativas: sirve en GitHub Pages o Vercel)
npm run preview   # sirve dist/ para probarlo
```

## Teclado (modo presentador)

| Tecla | Acción |
|---|---|
| `→`, `Espacio`, `PageDown` | Siguiente (en la demo, primero recorre las 5 etapas del pipeline) |
| `←`, `PageUp`, `Shift+Espacio` | Anterior |
| `1`–`7` | Ir a la diapositiva |
| `Home` / `End` | Inicio / cierre |
| `F` | Pantalla completa |
| `L` | Modo liviano (sin desenfoque del vidrio). También se activa solo si la presentación va a menos de ~25 cuadros por segundo |

Con `prefers-reduced-motion` no hay video y los saltos son instantáneos.

## La demo (diapositiva 4)

Video real de vacas que avanza cuadro a cuadro con el scroll (técnica de [scroll-world](https://github.com/oso95/scroll-world), MIT; ver `src/vendor/`). Encima se dibuja lo que el pipeline calculó sobre ese mismo clip (YOLO11n clase *cow* + ByteTrack, `agrotrack_cv`), guardado en `public/media/tracks.json`:

1. **Video**: cada cuadro.
2. **Detección**: una caja por vaca con su confianza. El animal con **id 01** va en naranja y muestra sus señales (confianza, velocidad, segundos en el comedero, distancia a las otras).
3. **Seguimiento**: ID y estela por animal.
4. **Zonas**: segundos de cada vaca en la zona del comedero.
5. **Conducta**: distancia a la vecina más cercana. El id 01 queda a 2,6 anchos del grupo, sobre la regla de `isolated_animal` (2,5 anchos); la tarjeta lo marca y aclara la regla completa (más de 10 s seguidos).

Cada etapa cae en los cuadros del clip donde se ve lo que explica (`STAGE_FRAMES` en `src/main.js`). Todos los valores salen de `tracks.json`; no hay números inventados.

## Parámetros de URL (para pruebas)

| Parámetro | Efecto |
|---|---|
| `?nointro` | Salta la intro de marca (por defecto corre una vez por sesión y no bloquea nada) |
| `?lite=1` / `?lite=0` | Fuerza el modo liviano / lo apaga y desactiva la detección automática |

## Diseño

- **Identidad:** el logo oficial (`assets/brand`, copiado en `public/brand/`): corchetes verde lima que encuadran una cabeza de vaca. El lima (#BEFB03) se usa solo para la palabra clave de cada diapositiva, las cifras y los encuadres de detección. El naranja identifica al animal en seguimiento.
- **Diapositivas como keynote:** un titular, pocas palabras, sin tarjetas. Vidrio solo en la cabecera y en el panel de la demo.
- **Animaciones** (una sola vez, solo `transform` y `opacity`): contadores, conectores que se dibujan, y el "4 segundos → 4 días" del cierre.
- **Rendimiento (Lighthouse 12, build de producción, simulado):** móvil 90, escritorio 100; accesibilidad y buenas prácticas 100; CLS 0; unos 155 KiB sin el video. El video se descarga con la primera interacción y nunca con modo liviano, ahorro de datos o movimiento reducido. El blur se quita mientras se hace scroll.
- **Contraste:** con vidrio, axe no puede medirlo; se midió con píxeles reales (texto invisible en la captura, peor píxel de fondo por línea).

## Pendientes

- Cifras sin verificar en origen: Micheloud 2026 y Laguzzi 2015 (mortalidad en feedlots). El guion dice "entre 100 y 150 terneros"; el cálculo de las notas da 50–150 y la web usa 50–150.
- El canal veterinario es una propuesta a validar; la web lo dice.
- Mantener `src/content.js` alineado con el README de la raíz y con lo que el código hace de verdad (ver la nota al pie de la diapositiva 3).
