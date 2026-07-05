import type { ProcedureTemplate, Step } from '@superion/domain';

function buildCompresorSteps(): Step[] {
  const titles = [
    'Preparar área de trabajo',
    'Verificar EPP',
    'Aislar equipo',
    'Despresurizar sistema',
    'Inspeccionar filtros',
    'Revisar niveles de aceite',
    'Comprobar correas',
    'Medir vibraciones',
    'Limpiar intercambiador',
    'Verificar válvulas de seguridad',
    'Prueba de arranque',
    'Registrar lecturas finales',
  ];
  const critical = new Set([3, 7]);
  const photoRequired = new Set([3, 5]);

  return titles.map((title, index) => ({
    index,
    title,
    description: `Ejecutar: ${title.toLowerCase()}.`,
    estimatedMinutes: 5 + (index % 4),
    critical: critical.has(index),
    requiresPhoto: photoRequired.has(index),
    photoCriteria: photoRequired.has(index) ? 'sensor visible' : null,
  }));
}

function buildBombaSteps(): Step[] {
  const titles = [
    'Preparar área',
    'Cerrar válvulas de entrada',
    'Drenar línea',
    'Inspeccionar sello mecánico',
    'Verificar rodamientos',
    'Medir presión de succión',
    'Medir presión de descarga',
    'Revisar acoplamiento',
    'Lubricar puntos',
    'Prueba de fugas',
    'Arranque controlado',
    'Documentar parámetros',
  ];
  const critical = new Set([2, 6]);
  const photoRequired = new Set([3, 9]);

  return titles.map((title, index) => ({
    index,
    title,
    description: `Procedimiento: ${title.toLowerCase()}.`,
    estimatedMinutes: 4 + (index % 5),
    critical: critical.has(index),
    requiresPhoto: photoRequired.has(index),
    photoCriteria: photoRequired.has(index) ? 'manómetro legible' : null,
  }));
}

export const FIXTURE_PROCEDURE_TEMPLATES: Record<string, ProcedureTemplate> = {
  'tmpl-compresor': {
    id: 'tmpl-compresor',
    name: 'MP-Compresor-C3-v3',
    manualId: 'manual-comp-1',
    steps: buildCompresorSteps(),
    criticalStepIndices: [3, 7],
    photoRequiredStepIndices: [3, 5],
    estimatedMinutes: 90,
  },
  'tmpl-bomba': {
    id: 'tmpl-bomba',
    name: 'MP-Bomba-B2-v1',
    manualId: 'manual-bomb-1',
    steps: buildBombaSteps(),
    criticalStepIndices: [2, 6],
    photoRequiredStepIndices: [3, 9],
    estimatedMinutes: 60,
  },
  'tmpl-motor': {
    id: 'tmpl-motor',
    name: 'MP-Motor-M1-v2',
    manualId: 'manual-motor-1',
    steps: buildBombaSteps().map((step, index) => ({
      ...step,
      index,
      title: `Motor paso ${String(index + 1)}`,
    })),
    criticalStepIndices: [1, 5],
    photoRequiredStepIndices: [2],
    estimatedMinutes: 45,
  },
};

export const WORK_ORDER_TEMPLATE_IDS: Record<string, string> = {
  '770e8400-e29b-41d4-a716-446655440000': 'tmpl-compresor',
  '770e8400-e29b-41d4-a716-446655440001': 'tmpl-bomba',
  '770e8400-e29b-41d4-a716-446655440002': 'tmpl-motor',
  '770e8400-e29b-41d4-a716-446655440003': 'tmpl-compresor',
  '770e8400-e29b-41d4-a716-446655440004': 'tmpl-motor',
};

export const WORK_ORDER_DETAILS: Record<
  string,
  { description: string; notes: string; linkedWoIds: string[] }
> = {
  '770e8400-e29b-41d4-a716-446655440000': {
    description: 'Mantenimiento preventivo trimestral del compresor C-3.',
    notes: 'Verificar presión antes de iniciar.',
    linkedWoIds: [],
  },
  '770e8400-e29b-41d4-a716-446655440001': {
    description: 'Revisión de bomba B-2 según plan anual.',
    notes: '',
    linkedWoIds: [],
  },
  '770e8400-e29b-41d4-a716-446655440002': {
    description: 'Inspección de motor M-1.',
    notes: 'Coordinar parada con producción.',
    linkedWoIds: [],
  },
  '770e8400-e29b-41d4-a716-446655440003': {
    description: 'Mantenimiento en curso de válvula V-4.',
    notes: '',
    linkedWoIds: [],
  },
  '770e8400-e29b-41d4-a716-446655440004': {
    description: 'Mantenimiento completado de filtro F-1.',
    notes: '',
    linkedWoIds: [],
  },
};
