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

Con `prefers-reduced-motion` no hay parallax y los saltos son instantáneos.

## Pendientes

- Nombres del equipo y del hackathon: `TEAM` y `EVENT_NAME` en `src/content.js` (vacíos, no se muestran).
- "En desarrollo" en el capítulo Estado dice "A confirmar con el equipo".
- Mantener `src/content.js` alineado con el README cuando cambie el código.
