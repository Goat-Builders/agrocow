# AgroCow · web de presentación

Sitio estático (Vite + JavaScript, sin backend) para presentar el proyecto en vivo. Los textos salen del `README.md` de la raíz y viven en [`src/content.js`](src/content.js).

```bash
cd web
npm install
npm run dev       # http://localhost:5173/
npm run build     # genera dist/ (rutas relativas: sirve en GitHub Pages o Vercel)
npm run preview   # sirve dist/ para probarlo
```

## Teclado (modo presentador)

| Tecla | Acción |
|---|---|
| `→`, `Espacio`, `PageDown` | Capítulo siguiente |
| `←`, `PageUp`, `Shift+Espacio` | Capítulo anterior |
| `1`–`6` | Ir al capítulo (Problema, Pipeline, Señales, Límites, Salida, Estado) |
| `Home` / `End` | Inicio / último capítulo |
| `↑` `↓` | En "Señales": cambiar de señal |
| `F` | Pantalla completa |
| `L` | Modo liviano (sin desenfoque del vidrio). También se activa solo si la presentación va a menos de ~25 cuadros por segundo |

Con `prefers-reduced-motion` no hay parallax y los saltos son instantáneos.

## Parámetros de URL (para pruebas)

| Parámetro | Efecto |
|---|---|
| `?nointro` | Salta la intro de marca (por defecto corre una vez por sesión y no bloquea nada) |
| `?lite=1` / `?lite=0` | Fuerza el modo liviano / lo apaga y desactiva la detección automática |

## Diseño

- **Identidad:** el encuadre de detección que dibuja el propio producto (esquinas ámbar, etiqueta `id NN`) es el motivo de marca. Ámbar solo para la acción principal, la posición actual y los encuadres.
- **Liquid Glass en tres superficies:** vidrio (header, placas, controles), vidrio teñido ámbar (el botón principal) y plano (el resto). Tokens de espaciado, radios y tipografía en `src/styles.css`.
- **Rendimiento (medido):** el desenfoque sobre un fondo que se mueve es lo más caro. Las placas grandes pierden el blur mientras se desplaza la página, y hay un modo liviano automático o con `L`.
- **Contraste:** con vidrio, axe no puede medirlo; se midió con píxeles reales (texto invisible en la captura, peor píxel de fondo por línea).

## Pendientes

- Nombre del hackathon: `EVENT_NAME` en `src/content.js` (vacío, no se muestra). El equipo (`TEAM`) ya está cargado; solo nombres, sin mails, porque el sitio es público.
- "En desarrollo" en el capítulo Estado dice "A confirmar con el equipo".
- Mantener `src/content.js` alineado con el README cuando cambie el código.
