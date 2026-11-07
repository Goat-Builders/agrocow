// ÚNICA fuente de textos de la web. Sigue el guion del pitch (6 bloques + demo).
// Reglas: una idea por diapositiva y pocas palabras; *palabra* = palabra clave (va en lima, una por diapositiva).
// Cada cifra tiene su fuente en la nota al pie de su diapositiva, o figura como cálculo propio / estimación.

export const REPO_URL = 'https://github.com/felipebridge/agrocow';
export const TEAM = ['Matías Rodrigo Bellido', 'Felipe Bridge', 'Emiliano Lescuras', 'Valentin Ruvera'];

export const chapters = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'problema', label: 'Problema' },
  { id: 'por-que', label: 'Por qué' },
  { id: 'solucion', label: 'Solución' },
  { id: 'demo', label: 'Demo' },
  { id: 'mercado', label: 'Mercado' },
  { id: 'negocio', label: 'Negocio' },
  { id: 'cierre', label: 'Cierre' },
];
export const DEMO = 4; // índice de la diapositiva con la secuencia de visión

// 0 · Gancho
export const hero = {
  title: ['Cuatro segundos por ', { mark: 'vaca' }, '.'],
  sub: 'Con 5.000 vacas, ¿quién ve a tiempo a la enferma?',
  fn: 'Un recorredor mira cada animal de 4 a 8 segundos (cálculo propio).',
};

// 1 · Problema
export const problem = {
  title: 'El ojo humano llega *tarde*.',
  stats: [
    { pre: '', n: [3], post: ' de 4', label: 'enfermos pasan sin detectar' },
    { pre: '1 cada ', n: [10], post: ' min', label: 'muere un animal en los feedlots de Argentina' },
    { pre: '', n: [50, 150], post: '', label: 'terneros perdidos por año en un feedlot de 1.000' },
  ],
  fn: 'Timsit et al., 2016: la inspección visual detecta el 27 % de las neumonías. Cálculo propio: unas 50.000 muertes por año (mortalidad del 1,0 al 1,7 %; Micheloud 2026, Laguzzi 2015) y USD 650 por ternero.',
  sourceText: 'Timsit et al., 2016',
  sourceHref: 'https://www.pubmed.gov/27931931/',
};

// 2 · Por qué ahora y por qué nosotros
export const why = {
  title: '¿Hace falta *tocar* a cada vaca?',
  today: { k: 'Hoy', t: 'Un sensor por animal' },
  us: { k: 'AgroCow', t: 'Solo cámaras' },
  line: 'Y el recorredor no suma ninguna tarea.',
  team: 'Somos AgroCow',
};

// 3 · Solución
export const solution = {
  title: 'La conducta avisa *antes*.',
  steps: [
    { icon: 'camera', t: 'Cámaras', s: 'comedero, bebedero y corral' },
    { icon: 'pulse', t: 'Software', s: 'aprende la conducta: come o bebe menos, se aísla, se echa' },
  ],
  anticipa: 'Anticipa *neumonía*, terneros que no comen y problemas digestivos.',
  punch: ['Hoy el recorredor mira mil para encontrar uno.', 'Con AgroCow, va directo.'],
  // Nota al pie: lo que hace el prototipo hoy (agrotrack_cv) y lo que falta. Sin prometer de más.
  fn: 'Detecta con YOLO11 y sigue con ByteTrack, que da un número a cada animal. Mide tiempo en comedero y bebedero, distancia al grupo y movimiento; reglas de conducta generan alertas para que una persona las revise. Hoy el prototipo alerta por animal aislado, inmovilidad prolongada y cambio de actividad del grupo. En desarrollo: aprender la rutina de cada animal, reconocer «echado» y comer o beber menos. Desafío abierto: identificar a cada animal de un día a otro (hoy el número vale dentro de un video).',
};

// 4 · Demo: el pipeline de visión, etapa por etapa, sobre video real
export const demo = {
  title: '¿Y si la cámara mirara *por él*?',
  note: 'Video real · detecciones del prototipo',
  cue: 'Avanzá para ver cómo detecta',
  steps: [
    { t: 'Video', s: 'cuadro a cuadro' },
    { t: 'Detección', s: 'cada vaca, con su confianza' },
    { t: 'Seguimiento', s: 'un ID para cada una' },
    { t: 'Zonas', s: 'segundos en el comedero' },
    { t: 'Conducta', s: 'distancia a la vecina más cercana' },
  ],
};

// 5 · Mercado
export const market = {
  title: '¿Cuánto cuesta llegar *tarde*?',
  stats: [
    { pre: '+', n: [4], post: ' MILL.', label: 'cabezas por año en feedlots de Argentina' },
    { pre: 'USD ', n: [10], post: ' MILL.', label: 'de mercado para AgroCow en Argentina' },
    { pre: 'USD ', n: [1000], post: ' MILL.', label: 'en pérdidas por año, sumando Brasil y EE. UU.' },
  ],
  fn: 'Unos 4,25 millones de cabezas por año. Mercado: estimación a USD 2,5 por cabeza (precio supuesto). Pérdidas: estimación de confianza baja, entre USD 460 y 1.530 millones; es la pérdida total, no lo que se evita.',
};

// 6 · Modelo de negocio y plan de entrada
export const business = {
  title: 'Cobramos un *abono* por cada cabeza.',
  line: 'El feedlot paga por cada animal que cuidamos.',
  how: 'Así llegamos a más feedlots:',
  plan: [
    { big: 'Probamos', small: 'en un feedlot (piloto)' },
    { big: 'Veterinarios', small: 'lo ofrecen a sus clientes' },
    { big: '20 feedlots', small: 'en tres años' },
  ],
  fn: 'Después: tambos y pastoreo. El canal veterinario es una propuesta a validar.',
};

// 7 · Cierre
export const closing = {
  before: ['Un recorredor tiene', '4 segundos', 'por vaca.'],
  after: ['AgroCow le da', '4 días', 'de ventaja.'],
  thanks: 'Somos AgroCow. Muchas gracias.',
  cta: 'Ver el código',
  fn: 'Cuatro días: el piso del rango de 4 a 7 días de anticipación con datos de conducta (por ejemplo, Wolfger et al., 2015).',
};
