from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from ..domain.models import RefreshToken

class TokenRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, refresh_token: RefreshToken) -> RefreshToken:
        self.db.add(refresh_token)
        self.db.flush()
        return refresh_token

    def get_valid_token(self, token_hash: str) -> Optional[RefreshToken]:
        token = self.db.query(RefreshToken).filter(
            RefreshToken.token_hash == token_hash
        ).first()
        if not token or token.revoked:
            return None
        
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        expires = token.expires_at
        if expires and expires.tzinfo is not None:
            expires = expires.replace(tzinfo=None)
            
        if expires and expires <= now:
            return None
        return token

    def revoke_token(self, token_hash: str) -> None:
        token = self.db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
        if token:
            token.revoked = True
            self.db.commit()

    def revoke_all_for_user(self, user_id: str) -> None:
        self.db.query(RefreshToken).filter(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked == False
        ).update({"revoked": True})
        self.db.flush()
