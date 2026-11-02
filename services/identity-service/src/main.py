import sys
from pathlib import Path

# Add service directory to Python module path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from src.core.config import settings
from src.core.database import engine, Base, SessionLocal
from src.domain.models import User, UserProfile
from src.core.security import hash_password
from src.api.routes import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Verify and create tables in factlens_identity_db
    Base.metadata.create_all(bind=engine)
    print(f"[Identity Service] Tables verified for {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")

    # Seed default analyst account if absent
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "analyst@factlens.gov.bd").first()
        if not user:
            # bcrypt embeds its own salt and cost in the digest.
            seeded_user = User(
                name="Shahriar Abdullah",
                email="analyst@factlens.gov.bd",
                password_hash=hash_password("Password@123"),
                salt="",
                role="ROLE_ANALYST",
                is_active=True
            )
            db.add(seeded_user)
            db.flush()

            profile = UserProfile(
                user_id=seeded_user.id,
                full_name="Shahriar Abdullah",
                # Contact details are left for the user to fill in on the
                # Profile page; the seed never invents them.
                phone=None,
                location=None,
                bio=None,
                organization=None,
                preferences={"theme": "dark", "language": "en"}
            )
            db.add(profile)
            db.commit()
            print("[Identity Service] Default analyst profile seeded (analyst@factlens.gov.bd / Shahriar Abdullah).")
    except Exception as e:
        db.rollback()
        print(f"[Identity Service] Seeding note: {e}")
    finally:
        db.close()

    yield
    print("[Identity Service] Shutting down.")

app = FastAPI(
    title="FactLens Identity & Profile Service",
    description="Microservice providing authentication, JWT token rotation, and user profile management.",
    version=settings.VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount media directory for serving uploaded avatars
app.mount("/media", StaticFiles(directory=str(settings.MEDIA_DIR)), name="media")

# Include API endpoints
app.include_router(api_router)

@app.get("/health")
@app.get("/api/v1/health")
async def health():
    return {
        "service": "FactLens Identity & Profile Service",
        "status": "healthy",
        "version": settings.VERSION
    }

@app.get("/")
async def root():
    return {
        "service": "FactLens Identity & Profile Service",
        "status": "online",
        "endpoints": {
            "register": "POST /api/v1/auth/register",
            "login": "POST /api/v1/auth/login",
            "refresh": "POST /api/v1/auth/refresh",
            "profile": "GET /api/v1/profile/me",
            "avatar": "PUT /api/v1/profile/me/avatar"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8001, reload=True)

