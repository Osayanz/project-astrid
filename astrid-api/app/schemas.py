from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


# ---- Auth / Users
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: str = Field(pattern="^(student|lecturer)$")
    enrollment_year: Optional[int] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

# ---- Quizzes
class QuizCreate(BaseModel):
    title: str
    description: Optional[str] = None
    duration: Optional[int] = None
    quiz_number: Optional[int] = None     
    subject_id: Optional[UUID] = None      

class QuestionCreate(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str = Field(pattern="^(A|B|C|D)$")
    points: int = 1
    topic_tag: Optional[str] = None
    topic_id: Optional[UUID] = None        
    difficulty_level: Optional[str] = "Medium"

class QuestionOut(BaseModel):
    id: UUID
    quiz_id: UUID
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str
    topic_tag: str
    points: int
    topic_tag: Optional[str] = None
    difficulty_level: Optional[str] = None

# ---- Attempts
class AttemptStartIn(BaseModel):
    quiz_id: UUID

class AttemptStartOut(BaseModel):
    attempt_id: UUID

class AnswerIn(BaseModel):
    question_id: UUID
    selected_option: str = Field(pattern="^(A|B|C|D)$")
    answered_at: Optional[datetime] = None
    time_spent_sec: Optional[int] = None

class AttemptSubmitIn(BaseModel):
    attempt_id: UUID
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    duration_sec: Optional[int] = None
    answers: List[AnswerIn]

class AttemptResultOut(BaseModel):
    attempt_id:            UUID
    score:                 int
    max_score:             int
    duration_sec:          Optional[int]       = None
    score_percentage:      Optional[float]     = None
    risk_level:            Optional[str]       = None
    predicted_final_score: Optional[float]     = None   
    prediction_status:     Optional[str]       = None

class QuizOut(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    duration: Optional[int] = None
    quiz_number: Optional[int] = None      
    subject_id: Optional[UUID] = None      
    created_by: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class QuizResultOut(BaseModel):
    attempt_id: UUID
    student_id: UUID
    student_name: str
    student_email: str
    score: int
    max_score: int
    submitted_at: datetime

    attempt_no: int | None = None
    duration_sec: int | None = None
    score_percentage: float | None = None
    risk_level: str | None = None
    prediction_status: str | None = None

class QuizAnalyticsOut(BaseModel):
    total_attempts: int
    class_average: float
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    average_duration_sec: float

class WeakTopicOut(BaseModel):
    topic: str
    total_answers: int
    wrong_answers: int
    wrong_percentage: float