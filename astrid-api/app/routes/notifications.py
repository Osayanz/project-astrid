from datetime import datetime
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..db import get_db
from .. import models
from ..auth import decode_token
from ..notify import create_notification

router = APIRouter(tags=["notifications"])


def _user(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        return decode_token(authorization.split(" ", 1)[1])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


# ── schemas ───────────────────────────────────────────────────────────
class NotificationOut(BaseModel):
    id:         UUID
    type:       str
    title:      str
    body:       Optional[str] = None
    severity:   Optional[str] = None
    ref_id:     Optional[UUID] = None
    is_read:    bool
    created_at: datetime

    class Config:
        from_attributes = True


class CardIn(BaseModel):
    severity: str = Field(pattern="^(yellow|red)$")
    message:  Optional[str] = None


# ══════════════════════════════════════════════════════════════════════
# READ
# ══════════════════════════════════════════════════════════════════════
@router.get("/notifications", response_model=List[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    authorization: str = Header(None),
):
    user = _user(authorization)
    uid = UUID(user["sub"])
    return (
        db.query(models.Notification)
        .filter(models.Notification.user_id == uid)
        .order_by(models.Notification.created_at.desc())
        .all()
    )


@router.get("/notifications/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    authorization: str = Header(None),
):
    user = _user(authorization)
    uid = UUID(user["sub"])
    count = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == uid,
            models.Notification.is_read == False,  # noqa: E712
        )
        .count()
    )
    return {"count": count}


@router.post("/notifications/{notification_id}/read")
def mark_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    authorization: str = Header(None),
):
    user = _user(authorization)
    uid = UUID(user["sub"])
    n = (
        db.query(models.Notification)
        .filter(
            models.Notification.id == notification_id,
            models.Notification.user_id == uid,
        )
        .first()
    )
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    db.commit()
    return {"ok": True}


@router.post("/notifications/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    authorization: str = Header(None),
):
    user = _user(authorization)
    uid = UUID(user["sub"])
    (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == uid,
            models.Notification.is_read == False,  # noqa: E712
        )
        .update({models.Notification.is_read: True})
    )
    db.commit()
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════
# LECTURER — send a warning card to a student
# ══════════════════════════════════════════════════════════════════════
@router.post("/lecturer/students/{student_id}/card")
def send_card(
    student_id: UUID,
    payload: CardIn,
    db: Session = Depends(get_db),
    authorization: str = Header(None),
):
    user = _user(authorization)
    if user["role"] != "lecturer":
        raise HTTPException(status_code=403, detail="Only lecturers can send cards")

    student = (
        db.query(models.User)
        .filter(models.User.id == student_id, models.User.role == "student")
        .first()
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    colour = "Yellow" if payload.severity == "yellow" else "Red"
    default_msg = (
        "A warning to improve your engagement and performance."
        if payload.severity == "yellow"
        else "A serious warning — your performance needs immediate attention."
    )
    body = (payload.message or "").strip() or default_msg

    n = create_notification(
        db,
        user_id=student.id,
        type="card",
        title=f"{colour} card from your lecturer",
        body=body,
        severity=payload.severity,
    )
    return {"ok": True, "notification_id": str(n.id)}
