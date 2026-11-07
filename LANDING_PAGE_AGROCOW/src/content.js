// ÚNICA fuente de textos de la web: pantallas para proyectar detrás del orador (pitch de 2:30 min).
// Reglas del brief: cada pantalla tiene título (máx. 6 palabras), subtítulo opcional (máx. 10) y UNA imagen
// o cifra grande; nunca más de 15 palabras; solo cifras y frases del guion.
// *palabra* = resaltada en lima · ~palabra~ = rojo sangre.
// Las fuentes de cada cifra NO van en pantalla: están en public/fuentes.html y en el README.

export const BLOCKS = [
  { label: 'Problema', time: '0:00' },
  { label: 'Por qué', time: '0:30' },
  { label: 'Solución', time: '0:50' },
  { label: 'Mercado y negocio', time: '1:30' },
  { label: 'Cierre', time: '2:05' },
];

// kind: cover | q (pregunta retórica, sola) | fig (cifra grande) | rider | team | flow (transición)
//       video (video del MVP) | steps | dots | map | timeline | fee | closing
export const screens = [
  // 1 · Problema (0:00–0:30)
  { block: 0, kind: 'cover', title: 'Cuatro segundos por *vaca*', sub: 'Ahora, con cinco mil. Todos los días.' },
  { block: 0, kind: 'q', q: '¿Cuántos enfermos se les escaparían?' },
  { block: 0, kind: 'fig', fig: '3 DE CADA 4', cap: 'ENFERMOS SE ESCAPAN', sub: 'Al resto, con días de retraso' },
  { block: 0, kind: 'fig', fig: '1 VACA', cap: 'MUERE CADA 10 MINUTOS', sub: 'En feedlots de Argentina' },
  { block: 0, kind: 'fig', fig: '80.000 USD', cap: 'DE PÉRDIDAS ANUALES', sub: 'En un feedlot de 1.000 cabezas' },
  { block: 0, kind: 'fig', fig: '100 A 150', cap: 'TERNEROS SE PODRÍAN COMPRAR', sub: 'Con esas pérdidas' },

  // 2 · Por qué ahora y por qué nosotros (0:30–0:50)
  { block: 1, kind: 'rider', title: 'El recorredor trabaja todo el *día*', sub: 'Es propenso a errores' },
  { block: 1, kind: 'team', title: 'Somos' }, // + el logo de AgroCow (así no se repite el nombre)

  // 3 · Solución (0:50–1:30). Después de "Así funciona" va el video del MVP: arranca solo al llegar a la pantalla.
  { block: 2, kind: 'flow', title: 'CÓMO FUNCIONA' },
  { block: 2, kind: 'video', title: 'Video del MVP', src: 'media/mvp.mp4', poster: 'media/mvp-poster.webp', cap: 'MVP · YOLO11n + ByteTrack' },
  {
    block: 2, kind: 'steps', title: 'Funciona en tres pasos',
    steps: [
      { icon: 'camera', t: 'Cámaras', s: 'comedero, bebedero, corral' },
      { icon: 'detect', t: 'Detecta el cambio', s: 'come menos, se aísla' },
      { icon: 'phone', t: 'Alerta al celular', s: '' },
    ],
  },
  { block: 2, kind: 'dots', title: 'Va directo a quien lo *necesita*', sub: 'Hoy mira mil animales para encontrar uno' },

  // 4 · Mercado y modelo de negocio (1:30–2:05)
  { block: 3, kind: 'fig', fig: '+4 MILLONES', cap: 'DE CABEZAS POR AÑO PASAN POR FEEDLOTS EN ARGENTINA' },
  { block: 3, kind: 'map', fig: '1.000 MILLONES', cap: 'DE USD DE PÉRDIDAS POR AÑO' },
  { block: 3, kind: 'fee', title: 'Cobramos un *abono* por cabeza', sub: 'Mientras más crezca el ganado, más ganamos' },
  { block: 3, kind: 'q', q: '¿Cómo entramos al mercado?' },
  {
    block: 3, kind: 'timeline', title: 'Cómo crecemos',
    steps: ['Piloto', 'Todo el feedlot', 'Feedlots más grandes', 'Otros países'],
  },

  // 5 · Cierre (2:05–2:20)
  { block: 4, kind: 'closing', title: 'TRATARLO O ~ENTERRARLO~', sub: 'Con AgroCow, lo ve a tiempo' },
];
