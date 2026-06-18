from sqlalchemy import Column, String, Text, Integer, Boolean, ForeignKey, DateTime, CHAR, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from .db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    quizzes = relationship("Quiz", back_populates="creator", cascade="all,delete")
    enrollment_year = Column(Integer, nullable=True)

class Quiz(Base):
    __tablename__ = "quizzes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    duration = Column(Integer, nullable=True)
    quiz_number = Column(Integer, nullable=True)
    subject_id  = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)           
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    creator = relationship("User", back_populates="quizzes")
    questions = relationship("Question", back_populates="quiz", cascade="all,delete")

class Question(Base):
    __tablename__ = "questions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    option_a = Column(Text, nullable=False)
    option_b = Column(Text, nullable=False)
    option_c = Column(Text, nullable=False)
    option_d = Column(Text, nullable=False)
    correct_option = Column(CHAR(1), nullable=False)
    topic_tag = Column(String(100), nullable=False)
    points = Column(Integer, nullable=False, default=1)
    difficulty_level = Column(String, default="medium")

    quiz = relationship("Quiz", back_populates="questions")

class Attempt(Base):
    __tablename__ = "attempts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    started_at = Column(DateTime(timezone=True))
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    duration_sec = Column(Integer)

    score = Column(Integer, nullable=False, default=0)
    max_score = Column(Integer, nullable=False, default=0)
    attempt_no = Column(Integer, nullable=False, default=1)
    predicted_final_score = Column(Float, nullable=True)
    score_percentage = Column(Float, nullable=True)
    risk_level = Column(String(20), nullable=True)
    prediction_status = Column(String(50), nullable=False, default="not_predicted")

    responses = relationship("Response", back_populates="attempt", cascade="all,delete")

class Response(Base):
    __tablename__ = "responses"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id = Column(UUID(as_uuid=True), ForeignKey("attempts.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)

    selected_option = Column(CHAR(1), nullable=False)

    answered_at = Column(DateTime(timezone=True))
    attempt = relationship("Attempt", back_populates="responses")
    time_spent_sec = Column(Integer, default=0)
    is_correct = Column(Boolean, nullable=True)

class Subject(Base):
    __tablename__ = "subjects"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name        = Column(String(120), nullable=False)
    description = Column(Text, nullable=True)
    owner_id    = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
 
    topics  = relationship("Topic", back_populates="subject", cascade="all,delete")
    target_year = Column(Integer, nullable=True)
 
 
class Topic(Base):
    __tablename__ = "topics"
    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name       = Column(String(120), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
 
    subject = relationship("Subject", back_populates="topics")

class Notification(Base):
    __tablename__ = "notifications"
    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type       = Column(String(30), nullable=False)   # 'weak_topics' | 'new_quiz' | 'card'
    title      = Column(String(200), nullable=False)
    body       = Column(Text, nullable=True)
    severity   = Column(String(10), nullable=True)     # 'yellow' | 'red' (cards only)
    ref_id     = Column(UUID(as_uuid=True), nullable=True)
    is_read    = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)