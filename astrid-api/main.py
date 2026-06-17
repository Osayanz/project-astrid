from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import engine
from app import models
from app.routes import all_routers
from fastapi.openapi.utils import get_openapi

# Ensure SQLAlchemy models match existing DB tables (we don't create tables here)
# models.Base.metadata.create_all(bind=engine)  # NOT needed since you already created tables in Supabase

app = FastAPI(title="Astrid API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],  # you can tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in all_routers:
    app.include_router(r)

@app.get("/")
def root():
    return {"message": "Astrid API is running"}

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="Astrid API",
        version="1.0.0",
        description="Quiz System API",
        routes=app.routes,
    )

    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }

    openapi_schema["security"] = [{"BearerAuth": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi