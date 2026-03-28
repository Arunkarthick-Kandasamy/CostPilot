from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from costpilot_common.config import DATABASE_URL

engine = create_engine(DATABASE_URL, pool_size=5, max_overflow=10)
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
