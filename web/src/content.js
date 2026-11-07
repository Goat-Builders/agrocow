// ÚNICA fuente de textos de la web (pitch de 7 diapositivas). Todo sale del README.md y de docs/blockchain.md.
// Regla: una idea por pantalla, frases cortas, nada que el README no declare, y lo que es prototipo se dice.
//
// Estructura del pitch (framework de persuasión del vault, sin escasez ni cifras inventadas):
//   0 Inicio ..... gancho + promesa            1 Problema ... el dolor
//   2 Solución ... propuesta de valor (flujo)  3 Prueba ..... corrida real
//   4 Dinero ..... del dato al pago (testnet)  5 Límites .... objeciones, honestas
//   6 Estado ..... dónde estamos + CTA único

export const REPO_URL = 'https://github.com/felipebridge/agrocow';
export const TEAM = ['Matías Rodrigo Bellido', 'Felipe Bridge', 'Emiliano Lescuras', 'Valentin Ruvera'];
export const EVENT_NAME = '';

export const chapters = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'problema', label: 'Problema' },
  { id: 'solucion', label: 'Solución' },
  { id: 'prueba', label: 'Prueba' },
  { id: 'dinero', label: 'Dinero' },
  { id: 'limites', label: 'Límites' },
  { id: 'estado', label: 'Estado' },
];

export const keys = [
  { k: ['→', 'Espacio'], t: 'avanzar' },
  { k: ['←'], t: 'volver' },
  { k: ['1–6'], t: 'ir a una diapositiva' },
  { k: ['F'], t: 'pantalla completa' },
];

export const hero = {
  status: 'Prototipo · testnet · Belo simulado',
  titleParts: ['Saber a qué ', { mark: 'vaca' }, ' mirar primero.'],
  lead: 'De la cámara del corral a la alerta, el certificado y el pago.',
  ctaPrimary: 'Empezar',
  ctaSecondary: 'Ver el código',
  photoNote: 'De fondo: video real (Wikimedia Commons, CC0) con las detecciones del modelo, cuadro a cuadro al hacer scroll.',

};

export const problem = {
  title: 'Una vaca que está mal cambia su conducta antes de que se note.',
  tiles: [
    { icon: 'bowl', title: 'Come distinto', text: 'Va menos al comedero.' },
    { icon: 'apart', title: 'Se aparta', text: 'Se aleja del lote.' },
    { icon: 'lying', title: 'Se echa distinto', text: 'Más o menos de lo habitual.' },
  ],
  pain: 'Pero nadie puede mirar a todo el lote, todo el día.',
  evidence: 'Con sensores de comedero, la conducta de alimentación anticipó la enfermedad respiratoria unos 7 días.',
  cite: 'Wolfger et al., 2015',
  href: 'https://doi.org/10.2527/jas.2014-8030',
};

export const solution = {
  title: 'AgroCow mira por vos y te dice a qué vaca ir primero.',
  steps: [
    { icon: 'cow', label: 'Vaca real', title: 'Una vaca real, en video', text: 'Una cámara del corral graba el lote.' },
    { icon: 'detect', label: 'Detección', title: 'La visión artificial la encuentra', text: 'Detecta cada vaca y le da un ID.' },
    { icon: 'bell', label: 'Alerta', title: 'Si algo cambia, avisa', text: 'Se aparta o se queda quieta: alerta con hora y severidad.' },
    { icon: 'token', label: 'Token', title: 'Cada vaca tiene su token', text: 'Un NFT con su estado, registrado en una red rápida y barata.', tag: 'testnet' },
    { icon: 'coin', label: 'Pago', title: 'Un hito cumplido libera el pago', text: 'El contrato manda USDC a la wallet del productor (Belo).', tag: 'simulado' },
  ],
  note: 'Los pasos 1 a 3 funcionan hoy. Los pasos 4 y 5 son un prototipo en testnet.',
  example: 'ejemplo',
};

export const proof = {
  title: 'Ya funciona sobre video real.',
  img: 'real-run',
  alt: 'Fotograma del video anotado: vacas con caja, número de ID, confianza y zona',
  tag: 'Corrida real',
  facts: [
    'Detecta y sigue a cada vaca.',
    'Alerta aislamiento, inmovilidad y saltos de actividad.',
    'Todavía sin evaluación de precisión.',
  ],
  caption: 'Fotograma del video anotado. Video de prueba (CC0, 9 s), no un corral con cámara fija.',
  credit: 'Wikimedia Commons',
  creditHref: 'https://commons.wikimedia.org/wiki/File:Cows_feeding_on_hay.webm',
};

export const money = {
  title: 'Del dato al pago.',
  card: { cap: 'Caravana AR-0421', token: 'Token #17', status: 'Sin alertas · 7 días', example: 'ejemplo' },
  rules: [
    '7 días sin alertas de aislamiento',
    'Visto bueno del veterinario',
    'El contrato libera USDC a la wallet Belo',
  ],
  payout: { label: 'USDC', to: 'wallet Belo del productor', tag: 'simulado' },
  notes: [
    'Prototipo en testnet (Polygon Amoy / Arbitrum Sepolia). Sin fondos reales.',
    'Belo no tiene API pública: el pago se simula. Falta identificar a cada vaca entre días.',
  ],
};

export const limits = {
  title: 'Lo que todavía no hace.',
  tiles: [
    { title: 'No diagnostica', text: 'Es una alerta para el veterinario.' },
    { title: 'No está evaluado', text: 'No hay métricas de precisión.' },
    { title: 'Mide presencia', text: 'No ve si la vaca come.' },
    { title: 'No la reconoce entre días', text: 'Los ID se reinician en cada video.' },
  ],
};

export const status = {
  title: 'Dónde estamos.',
  columns: [
    { key: 'si', label: 'Funciona', items: ['Detección y seguimiento', 'Alertas de conducta', 'API y dashboard (MVP)'] },
    { key: 'dev', label: 'Prototipo', items: ['Token y pago en testnet', 'Belo simulado'] },
    { key: 'plan', label: 'Falta', items: ['Evaluar con datos de campo', 'Identificar cada vaca entre días', 'Integración real con Belo'] },
  ],
  closing: {
    title: 'Saber a qué vaca mirar primero.',
    text: 'Siguiente paso: probarlo con video de campo y un veterinario.',
    cta: 'Ver el código en GitHub',
  },
  backToStart: 'Volver al inicio',
};
