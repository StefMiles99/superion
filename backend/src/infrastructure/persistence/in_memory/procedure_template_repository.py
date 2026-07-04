"""Repositorio in-memory de plantillas — BE-02."""

from __future__ import annotations

import asyncio

from domain.entities.procedure_template import ProcedureTemplate
from domain.value_objects.step import Step


def _build_compresor_steps() -> tuple[Step, ...]:
    titles = [
        "Preparar área de trabajo",
        "Verificar EPP",
        "Aislar equipo",
        "Despresurizar sistema",
        "Inspeccionar filtros",
        "Revisar niveles de aceite",
        "Comprobar correas",
        "Medir vibraciones",
        "Limpiar intercambiador",
        "Verificar válvulas de seguridad",
        "Prueba de arranque",
        "Registrar lecturas finales",
    ]
    critical = {3, 7}
    photo_required = {3, 5}
    steps: list[Step] = []
    for index, title in enumerate(titles):
        steps.append(
            Step(
                index=index,
                title=title,
                description=f"Ejecutar: {title.lower()}.",
                estimated_minutes=5 + (index % 4),
                critical=index in critical,
                requires_photo=index in photo_required,
                photo_criteria="sensor visible" if index in photo_required else None,
            )
        )
    return tuple(steps)


def _build_bomba_steps() -> tuple[Step, ...]:
    titles = [
        "Preparar área",
        "Cerrar válvulas de entrada",
        "Drenar línea",
        "Inspeccionar sello mecánico",
        "Verificar rodamientos",
        "Medir presión de succión",
        "Medir presión de descarga",
        "Revisar acoplamiento",
        "Lubricar puntos",
        "Prueba de fugas",
        "Arranque controlado",
        "Documentar parámetros",
    ]
    critical = {2, 6}
    photo_required = {3, 9}
    steps: list[Step] = []
    for index, title in enumerate(titles):
        steps.append(
            Step(
                index=index,
                title=title,
                description=f"Procedimiento: {title.lower()}.",
                estimated_minutes=4 + (index % 5),
                critical=index in critical,
                requires_photo=index in photo_required,
                photo_criteria="manómetro legible" if index in photo_required else None,
            )
        )
    return tuple(steps)


class InMemoryProcedureTemplateRepository:
    """Plantillas sembradas para desarrollo y tests."""

    _instance: InMemoryProcedureTemplateRepository | None = None

    def __init__(self, templates: list[ProcedureTemplate]) -> None:
        self._templates = {template.id: template for template in templates}
        self._lock = asyncio.Lock()

    @classmethod
    def with_fixtures(cls) -> InMemoryProcedureTemplateRepository:
        compresor_steps = _build_compresor_steps()
        bomba_steps = _build_bomba_steps()
        templates = [
            ProcedureTemplate(
                id="tmpl-compresor",
                name="MP-Compresor-C3-v3",
                version="3",
                manual_id="manual-comp-1",
                steps=compresor_steps,
                critical_step_indices=(3, 7),
                photo_required_step_indices=(3, 5),
                estimated_minutes=90,
            ),
            ProcedureTemplate(
                id="tmpl-bomba",
                name="MP-Bomba-B2-v2",
                version="2",
                manual_id="manual-bomb-1",
                steps=bomba_steps,
                critical_step_indices=(2, 6),
                photo_required_step_indices=(3, 9),
                estimated_minutes=75,
            ),
        ]
        return cls(templates)

    @classmethod
    def reset_singleton(cls) -> None:
        cls._instance = None

    @classmethod
    def shared(cls) -> InMemoryProcedureTemplateRepository:
        if cls._instance is None:
            cls._instance = cls.with_fixtures()
        return cls._instance

    async def get_by_id(self, template_id: str) -> ProcedureTemplate | None:
        async with self._lock:
            return self._templates.get(template_id)

    async def reset(self) -> None:
        async with self._lock:
            fresh = self.with_fixtures()
            self._templates = fresh._templates
