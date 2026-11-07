// ÚNICA fuente de textos de la web. Todo sale del README.md del repo (commit fa5060f).
// Si el README cambia, se actualiza acá. No agregar cifras ni capacidades que el README no declare.
//
// Propuesta de valor (framework de persuasión del vault, con la regla anti-tryhard):
//   Gancho .......... hero.title
//   Empatía ......... problem (Hoy)
//   Mecanismo ....... pipeline + hero.proofs
//   Prueba .......... output.realRun (corrida real, con sus límites) + problem.evidence
//   Riesgo invertido  hero.proofs[2] (cada alerta se verifica en el video) + limits
//   CTA único ....... "Empezar recorrido" / "Ver el código en GitHub"
// Sin escasez, sin urgencia, sin testimonios ni cifras de impacto: el proyecto no los tiene.

export const REPO_URL = 'https://github.com/felipebridge/agrocow';

export const TEAM = ['Matías Rodrigo Bellido', 'Felipe Bridge', 'Emiliano Lescuras', 'Valentin Ruvera'];
export const EVENT_NAME = '';

export const hero = {
  status: 'Prototipo · sin evaluación de precisión todavía',
  // `mark` dibuja el encuadre de detección (motivo de la marca) alrededor de la palabra.
  titleParts: ['Saber a qué ', { mark: 'vaca' }, ' mirar primero.'],
  lead: 'AgroCow convierte el video del corral en una lista corta de animales para revisar: detecta y sigue solo bovinos, mide cuánto usan el comedero y el bebedero, y marca desvíos de conducta.',
  audience: 'Para productores y veterinarios que cuidan un lote y no pueden mirar a todos los animales todo el día.',
  ctaPrimary: 'Empezar recorrido',
  ctaSecondary: 'Ver el código',
  proofs: [
    'Un ID por animal dentro del video',
    'Cada desvío llega con hora y severidad',
    'Cada alerta se verifica en el video anotado',
  ],
  figureLabel:
    'Ilustración de un corral visto desde una cámara: tres vacas con cajas de detección y una zona de comedero marcada',
  figureNote: 'Ilustración conceptual. No es salida real del modelo.',
};

export const problem = {
  title: 'Un animal que no está bien suele cambiar su conducta antes de que se note a simple vista.',
  before: {
    label: 'Hoy',
    text: 'Detectarlo depende de que alguien mire a esa vaca en el momento justo. Observar un lote lleva tiempo y es intermitente por definición.',
  },
  after: {
    label: 'Con AgroCow',
    text: 'El video del corral se revisa de forma continua y cada desvío llega como un evento con hora, animal y severidad, listo para que una persona lo revise.',
  },
  cardsTitle: 'Lo que cambia en la conducta',
  cards: [
    { title: 'Come distinto', text: 'Va menos al comedero o se queda menos tiempo.' },
    { title: 'Se aparta del grupo', text: 'Pasa más tiempo lejos del resto del lote.' },
    { title: 'Cambia cuánto está echada', text: 'Más o menos tiempo echada que lo habitual.' },
  ],
  evidence: {
    text: 'En un feedlot de Alberta con comedero electrónico, la frecuencia y la duración de las comidas permitieron predecir el riesgo de enfermedad respiratoria unos 7 días antes de la detección visual.',
    caveat: 'Se midió con sensores del comedero, no con video. AgroCow no reproduce ese resultado: es una hipótesis de trabajo.',
    cite: 'Wolfger et al., 2015',
    href: 'https://doi.org/10.2527/jas.2014-8030',
  },
};

export const pipeline = {
  title: 'De video crudo a alerta, en cinco pasos.',
  steps: [
    { title: 'Video', text: 'Archivo de video, leído cuadro por cuadro.' },
    { title: 'Solo bovinos', text: 'YOLO11n filtrado a la clase vaca. Personas, vehículos y perros quedan afuera.' },
    { title: 'ID por animal', text: 'ByteTrack le da un número a cada vaca dentro del video.' },
    { title: 'Zonas y conducta', text: 'Comedero, bebedero y resto del corral: visitas y permanencia por animal.' },
    { title: 'Eventos', text: 'Tres reglas sobre esos datos generan eventos con severidad, para revisión.' },
  ],
  outputsLabel: 'Salida',
  outputs: ['JSON estructurado', 'MP4 anotado'],
  note: 'La zona de alimentación se decide con el punto de apoyo del animal (los pies), no con la cabeza.',
};

export const signals = {
  title: 'Qué mira la cámara y qué puede significar.',
  lead: 'Elegí una señal para ver qué indica, qué cámara necesita y si ya existe en el código.',
  fields: { indica: 'Qué puede indicar', camara: 'Cámara necesaria', viab: 'Viabilidad estimada', estado: 'En el código' },
  footnote: 'La viabilidad es una estimación del equipo, sin validar con datos propios.',
  // level: 1 baja · 2 media · 3 media-alta · 4 alta
  items: [
    {
      title: 'Menos tiempo en el comedero',
      indica: 'Enfermedad respiratoria bovina, estrés calórico, trastornos metabólicos o dolor.',
      camara: 'Fija, con el comedero y las cabezas visibles.',
      nivel: 'Media', level: 2, nota: 'Indirecta, por presencia en zona.',
      estado: 'Se mide (por los pies). No alerta todavía.', done: 'parcial',
    },
    {
      title: 'Aislamiento del grupo',
      indica: 'Malestar general.',
      camara: 'Fija, con vista amplia del corral.',
      nivel: 'Media', level: 2, nota: '',
      estado: 'Implementado.', done: 'si',
    },
    {
      title: 'Inmovilidad prolongada',
      indica: 'Malestar. Es un indicio parcial de animal echado de más.',
      camara: 'Fija.',
      nivel: 'Media', level: 2, nota: '',
      estado: 'Implementado. No distingue parada de echada.', done: 'parcial',
    },
    {
      title: 'Vaca caída',
      indica: 'Animal que no logra pararse. Severidad crítica.',
      camara: 'Fija, sin obstrucciones.',
      nivel: 'Alta', level: 4, nota: '',
      estado: 'Planificado. Requiere clasificar la postura.', done: 'no',
    },
    {
      title: 'Cojera',
      indica: 'Pietín, dermatitis digital o úlceras de suela.',
      camara: 'Lateral, con trayectoria despejada (manga o pasillo), y detección de pose.',
      nivel: 'Media-alta', level: 3, nota: '',
      estado: 'Planificado.', done: 'no',
    },
    {
      title: 'Agrupamiento y uso del espacio',
      indica: 'Estrés calórico: se juntan en la sombra y comen menos.',
      camara: 'Fija, con vista amplia.',
      nivel: 'Media', level: 2, nota: '',
      estado: 'Planificado.', done: 'no',
    },
  ],
};

export const limits = {
  title: 'AgroCow no diagnostica. Prioriza a qué animal mirar primero.',
  lead: 'Lo que hoy no hace, dicho de entrada.',
  cards: [
    { title: 'No reemplaza al veterinario', text: 'Cada alerta es una señal para revisar, no un diagnóstico.' },
    {
      title: 'No cubre lo que pide laboratorio',
      text: 'Brucelosis o tuberculosis no se ven en video. Una alerta tampoco reemplaza la denuncia de sospecha de aftosa al SENASA.',
    },
    {
      title: 'Mide presencia, no ingesta',
      text: 'Cuenta cuánto está el animal dentro de la zona de alimentación. No ve si come.',
    },
    {
      title: 'Todavía no está evaluado',
      text: 'No hay dataset etiquetado ni métricas de precisión, recall o falsos positivos. Avisar de más cansa y avisar de menos demora: el umbral es una decisión de costos.',
    },
    {
      title: 'No sigue a una vaca entre días',
      text: 'Dentro de un video, el tracker alcanza. Entre días hace falta caravana visible o patrón de pelaje. Hoy los ID se reinician en cada video.',
    },
  ],
};

export const output = {
  title: 'Una salida pensada para integrarse.',
  lead: 'Un JSON con resumen, zonas y eventos con timestamp, más el video anotado para verificar cada alerta a ojo.',
  realRun: {
    img: './real-run.jpg',
    alt: 'Fotograma del video anotado: cuatro vacas con caja, número de ID, confianza y zona',
    tag: 'Corrida real',
    caption: 'Fotograma del video anotado. Es un video de prueba (CC0, 9 s), no un corral con cámara fija.',
    facts: [
      'Hasta 5 vacas detectadas a la vez',
      '7 IDs en total: dos duran 0,17 s (cortes de tracking)',
      'Las zonas por defecto no calzan con esta escena',
    ],
    credit: 'Video: «Cows feeding on hay», Wikimedia Commons',
    creditHref: 'https://commons.wikimedia.org/wiki/File:Cows_feeding_on_hay.webm',
  },
  jsonCaption: 'Estructura real de la salida. Los valores se omiten.',
  jsonLines: [
    '{',
    '  "video":   { "width": …, "height": …, "fps": …,',
    '               "duration_sec": … },',
    '  "summary": { "unique_animals": …, "max_heads": …,',
    '               "avg_heads": …, "total_events": …,',
    '               "critical_events": … },',
    '  "zones": {',
    '    "feeding_zone": { "total_visits": …,',
    '      "unique_animals": …, "total_dwell_sec": … }',
    '  },',
    '  "events": [',
    '    { "severity": "…", "event_type": "…", "track_id": …,',
    '      "start_timestamp_sec": …, "end_timestamp_sec": …,',
    '      "description": "…" }',
    '  ]',
    '}',
  ],
  eventsTitle: 'Los tres eventos de hoy',
  eventsNote: 'Severidad por duración: aviso al llegar al mínimo, crítico al superar el doble. Umbrales sin calibrar.',
  events: [
    { type: 'isolated_animal', rule: 'Lejos de su vecino más cercano', warn: '10 s', crit: '20 s' },
    { type: 'prolonged_immobility', rule: 'Casi sin moverse', warn: '15 s', crit: '30 s' },
    { type: 'group_activity_shift', rule: 'Salto en la velocidad del grupo', warn: '2 s', crit: '4 s' },
  ],
  colWarn: 'aviso',
  colCrit: 'crítico',
};

export const status = {
  title: 'Dónde estamos hoy.',
  columns: [
    {
      key: 'si', label: 'Implementado', note: 'Sin evaluar',
      items: [
        'Detección de bovinos (YOLO11n)',
        'Tracking con ID por video',
        'Zonas, visitas y permanencia',
        'Conteo y resumen por animal',
        'Tres eventos con reglas fijas',
        'Salida JSON y video anotado',
        'CLI y clase de Python',
      ],
    },
    { key: 'dev', label: 'En desarrollo', note: '', items: ['A confirmar con el equipo'] },
    {
      key: 'plan', label: 'Planificado', note: 'A confirmar con el equipo',
      items: [
        'Evaluación con métricas por tipo de evento',
        'Cabeza o pose: cabeza en el comedero, cojera',
        'Postura parada o echada: vaca caída',
        'Línea base por lote y alertas de alimentación',
        'Re-identificación entre días',
      ],
    },
  ],
  closing: {
    title: 'Saber a qué vaca mirar primero.',
    text: 'Un prototipo que ya corre de punta a punta. Lo que falta es evaluarlo con datos de campo.',
    cta: 'Ver el código en GitHub',
  },
  backToStart: 'Volver al inicio',
};

export const chapters = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'problema', label: 'Problema' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'senales', label: 'Señales' },
  { id: 'limites', label: 'Límites' },
  { id: 'salida', label: 'Salida' },
  { id: 'estado', label: 'Estado' },
];

export const keys = [
  { k: ['→', 'Espacio'], t: 'siguiente' },
  { k: ['←'], t: 'anterior' },
  { k: ['1–6'], t: 'ir a capítulo' },
  { k: ['F'], t: 'pantalla completa' },
  { k: ['L'], t: 'modo liviano' },
];
