import type { Manual, ProcedureTemplate, UserProfile, WorkOrder } from "@superion/domain";

export const MOCK_PASSWORD = "test1234";

export const mockUser: UserProfile = {
  id: "tech-1",
  email: "juan@planta.com",
  full_name: "Juan Pérez",
  role: "technician",
  plant_id: "plant-1",
};

export const mockAdmin: UserProfile = {
  id: "admin-ana",
  email: "ana@planta.com",
  full_name: "Ana Gómez",
  role: "rag_admin",
  plant_id: "plant-1",
};

/** Mismo rol que el seed de backend en producción. */
export const mockProdAdmin: UserProfile = {
  id: "admin-1",
  email: "admin@planta.com",
  full_name: "Admin RAG",
  role: "rag_admin",
  plant_id: "plant-1",
};

export const mockManuals: Manual[] = [
  {
    id: "man-1",
    title: "Atlas Copco GA-37 — Service Manual",
    asset_model: "Atlas Copco GA-37",
    version: 3,
    status: "active",
    index_status: "indexed",
    chunk_count: 412,
    uploaded_at: "2026-06-20T10:00:00Z",
    uploaded_by: { id: mockAdmin.id, full_name: mockAdmin.full_name },
  },
  {
    id: "man-2",
    title: "Grundfos CR-15 — Installation & Operating",
    asset_model: "Grundfos CR-15",
    version: 1,
    status: "active",
    index_status: "indexed",
    chunk_count: 188,
    uploaded_at: "2026-06-28T14:30:00Z",
    uploaded_by: { id: mockAdmin.id, full_name: mockAdmin.full_name },
  },
];

export const mockTemplate: ProcedureTemplate = {
  id: "tmpl-compresor",
  name: "MP-Compresor-C3-v3",
  manual_id: "man-1",
  estimated_minutes: 45,
  critical_step_indices: [1],
  photo_required_step_indices: [1, 2],
  steps: [
    {
      index: 0,
      title: "Preparar área de trabajo",
      description: "Delimita la zona y verifica herramientas.",
      estimated_minutes: 5,
      critical: false,
      requires_photo: false,
      photo_criteria: null,
    },
    {
      index: 1,
      title: "Aislar el equipo (LOTO)",
      description: "Coloca el candado de bloqueo en la válvula V-12.",
      estimated_minutes: 10,
      critical: true,
      requires_photo: true,
      photo_criteria: "Candado LOTO colocado en V-12",
    },
    {
      index: 2,
      title: "Revisar filtros de aire",
      description: "Inspecciona y fotografía el estado de los filtros.",
      estimated_minutes: 15,
      critical: false,
      requires_photo: true,
      photo_criteria: "Filtro de aire visible y limpio",
    },
    {
      index: 3,
      title: "Cerrar y registrar",
      description: "Retira el bloqueo y registra observaciones finales.",
      estimated_minutes: 5,
      critical: false,
      requires_photo: false,
      photo_criteria: null,
    },
  ],
};

export const mockWorkOrders: WorkOrder[] = [
  {
    id: "wo-001",
    code: "OT-1001",
    type: "preventive",
    priority: "high",
    status: "pending",
    asset: { id: "asset-1", tag: "COMP-C3", name: "Compresor C-3", model: "Atlas Copco GA-37" },
    assigned_to: { id: mockUser.id, full_name: mockUser.full_name },
    planned_start: "2026-07-04T14:00:00Z",
    planned_end: "2026-07-04T15:30:00Z",
    procedure_template_id: mockTemplate.id,
    procedure_name: mockTemplate.name,
    estimated_minutes: 45,
    description: "Mantenimiento preventivo del compresor C-3.",
    notes: "Revisar filtros antes de arrancar.",
  },
  {
    id: "wo-002",
    code: "OT-1002",
    type: "corrective",
    priority: "med",
    status: "pending",
    asset: { id: "asset-2", tag: "BOM-B2", name: "Bomba B-2", model: "Grundfos CR-15" },
    assigned_to: { id: mockUser.id, full_name: mockUser.full_name },
    planned_start: "2026-07-05T09:00:00Z",
    planned_end: "2026-07-05T11:00:00Z",
    procedure_template_id: mockTemplate.id,
    procedure_name: mockTemplate.name,
    estimated_minutes: 45,
    description: "Correctivo por fuga en sello mecánico.",
    notes: "",
  },
];
