from sqlalchemy.orm import Session
from ..repositories.user_repository import UserRepository
from ..repositories.profile_repository import ProfileRepository
from ..repositories.token_repository import TokenRepository

class IdentityUnitOfWork:
    """
    Unit of Work Pattern: Manages business transaction boundaries
    across User, UserProfile, and RefreshToken repositories.
    """

    def __init__(self, session: Session):
        self.session = session
        self.users = UserRepository(session)
        self.profiles = ProfileRepository(session)
        self.tokens = TokenRepository(session)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self.rollback()
        else:
            self.commit()

    def commit(self):
        self.session.commit()

    def rollback(self):
        self.session.rollback()

