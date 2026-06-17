from fastapi        import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from uuid           import UUID
from pydantic       import BaseModel
from typing         import Optional, List
 
from ..db   import get_db
from ..     import models
from ..auth import decode_token
 
router = APIRouter(tags=["subjects"])
 
 
# ── schemas ───────────────────────────────────────────────────────────
class SubjectIn(BaseModel):
    name:        str
    description: Optional[str] = None
    target_year: Optional[int] = None
 
class SubjectOut(BaseModel):
    id:          UUID
    name:        str
    description: Optional[str] = None
    topic_count: int = 0
    class Config: from_attributes = True
    target_year: Optional[int] = None
 
class TopicIn(BaseModel):
    name: str
 
class TopicOut(BaseModel):
    id:         UUID
    name:       str
    subject_id: UUID
    class Config: from_attributes = True
 
 
# ── auth helper ───────────────────────────────────────────────────────
def require_lecturer(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        user = decode_token(authorization.split(" ", 1)[1])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    if user["role"] != "lecturer":
        raise HTTPException(status_code=403, detail="Only lecturers can manage subjects")
    return user
 
 
# ══════════════════════════════════════════════════════════════════════
# SUBJECTS
# ══════════════════════════════════════════════════════════════════════
@router.post("/subjects", response_model=SubjectOut)
def create_subject(
    payload:       SubjectIn,
    db:            Session = Depends(get_db),
    authorization: str     = Header(None),
):
    user = require_lecturer(authorization)
 
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Subject name cannot be empty")
 
    # prevent duplicate subject name for this lecturer
    exists = (
        db.query(models.Subject)
        .filter(
            models.Subject.owner_id == UUID(user["sub"]),
            models.Subject.name.ilike(name),
        )
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="You already have a subject with this name")
 
    subject = models.Subject(
        name=name,
        description=payload.description,
        target_year=payload.target_year,   # ← ADD
        owner_id=UUID(user["sub"]),
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
 
    return SubjectOut(id=subject.id, name=subject.name,
                      description=subject.description, target_year=subject.target_year, topic_count=0)
 
 
@router.get("/subjects", response_model=List[SubjectOut])
def list_subjects(
    db:            Session = Depends(get_db),
    authorization: str     = Header(None),
):
    user = require_lecturer(authorization)
 
    subjects = (
        db.query(models.Subject)
        .filter(models.Subject.owner_id == UUID(user["sub"]))
        .order_by(models.Subject.created_at)
        .all()
    )
 
    result = []
    for s in subjects:
        topic_count = db.query(models.Topic).filter(models.Topic.subject_id == s.id).count()
        result.append(SubjectOut(id=s.id, name=s.name,
                                 description=s.description, topic_count=topic_count))
    return result
 
 
@router.delete("/subjects/{subject_id}")
def delete_subject(
    subject_id:    UUID,
    db:            Session = Depends(get_db),
    authorization: str     = Header(None),
):
    user = require_lecturer(authorization)
    subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if str(subject.owner_id) != user["sub"]:
        raise HTTPException(status_code=403, detail="Not your subject")
    db.delete(subject)
    db.commit()
    return {"deleted": True}
 
 
# ══════════════════════════════════════════════════════════════════════
# TOPICS
# ══════════════════════════════════════════════════════════════════════
@router.post("/subjects/{subject_id}/topics", response_model=TopicOut)
def add_topic(
    subject_id:    UUID,
    payload:       TopicIn,
    db:            Session = Depends(get_db),
    authorization: str     = Header(None),
):
    user = require_lecturer(authorization)
 
    subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if str(subject.owner_id) != user["sub"]:
        raise HTTPException(status_code=403, detail="Not your subject")
 
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Topic name cannot be empty")
 
    exists = (
        db.query(models.Topic)
        .filter(models.Topic.subject_id == subject_id, models.Topic.name.ilike(name))
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="This topic already exists in the subject")
 
    topic = models.Topic(name=name, subject_id=subject_id)
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic
 
 
@router.get("/subjects/{subject_id}/topics", response_model=List[TopicOut])
def list_topics(
    subject_id:    UUID,
    db:            Session = Depends(get_db),
    authorization: str     = Header(None),
):
    require_lecturer(authorization)
    topics = (
        db.query(models.Topic)
        .filter(models.Topic.subject_id == subject_id)
        .order_by(models.Topic.created_at)
        .all()
    )
    return topics
 
 
@router.delete("/topics/{topic_id}")
def delete_topic(
    topic_id:      UUID,
    db:            Session = Depends(get_db),
    authorization: str     = Header(None),
):
    user = require_lecturer(authorization)
    topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    subject = db.query(models.Subject).filter(models.Subject.id == topic.subject_id).first()
    if not subject or str(subject.owner_id) != user["sub"]:
        raise HTTPException(status_code=403, detail="Not your topic")
    db.delete(topic)
    db.commit()
    return {"deleted": True}