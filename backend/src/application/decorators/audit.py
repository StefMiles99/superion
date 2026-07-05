"""Decorador de auditoría para use cases — BE-08."""

from __future__ import annotations

import functools
from collections.abc import Awaitable, Callable
from typing import Any, TypeVar

from domain.value_objects.action import AuditAction

T = TypeVar("T")


AuditDecorator = Callable[[Callable[..., Awaitable[T]]], Callable[..., Awaitable[T]]]


def audit(action: AuditAction, *, target_type: str) -> AuditDecorator:
    """Registra audit entry tras execute exitoso."""

    def decorator(fn: Callable[..., Awaitable[T]]) -> Callable[..., Awaitable[T]]:
        @functools.wraps(fn)
        async def wrapper(self: Any, *args: Any, **kwargs: Any) -> T:
            result = await fn(self, *args, **kwargs)
            await _emit_audit(
                action=action,
                target_type=target_type,
                args=args,
                kwargs=kwargs,
                result=result,
            )
            return result

        return wrapper

    return decorator


async def _emit_audit(
    *,
    action: AuditAction,
    target_type: str,
    args: tuple[Any, ...],
    kwargs: dict[str, Any],
    result: Any,
) -> None:
    from infrastructure.factories import get_log_audit_entry_use_case

    actor_id, target_id, payload = _extract_audit_fields(
        action=action,
        args=args,
        kwargs=kwargs,
        result=result,
    )
    if actor_id is None or target_id is None:
        return

    uc = get_log_audit_entry_use_case()
    await uc.execute(
        actor_user_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        payload=payload,
    )


def _extract_audit_fields(
    *,
    action: AuditAction,
    args: tuple[Any, ...],
    kwargs: dict[str, Any],
    result: Any,
) -> tuple[str | None, str | None, dict[str, object]]:
    if action == AuditAction.LOGIN:
        return result.user.id, result.user.id, {"email": result.user.email}

    if action == AuditAction.LOGOUT:
        from infrastructure.factories import get_token_service

        token = kwargs.get("access_token")
        if not token:
            return None, None, {}
        try:
            payload = get_token_service().decode_access_token(token)
            uid = str(payload["sub"])
            return uid, uid, {}
        except Exception:
            return None, None, {}

    current_user = kwargs.get("current_user")
    if current_user is not None:
        actor_id = current_user.id
    else:
        actor_id = None

    if action == AuditAction.START_SESSION:
        return actor_id, result.session_id, {"work_order_id": kwargs.get("work_order_id", "")}

    if action == AuditAction.FINALIZE_SESSION:
        session_id = kwargs.get("session_id", "")
        report_id = getattr(result, "report_id", session_id)
        return actor_id, str(report_id), {"session_id": session_id}

    if action == AuditAction.MANUAL_UPLOAD:
        manual_id = getattr(result, "id", getattr(result, "manual_id", ""))
        return actor_id, str(manual_id), {}

    if action == AuditAction.MANUAL_ARCHIVE:
        manual_id = kwargs.get("manual_id", "")
        return actor_id, str(manual_id), {}

    return actor_id, "unknown", {}
