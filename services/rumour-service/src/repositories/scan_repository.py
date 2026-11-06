from typing import List, Optional

from factlens_common.schema import Scan
from sqlalchemy.orm import Session, joinedload


class ScanRepository:
    """Reads and writes rumor scans against the shared `scans` table."""

    SCAN_TYPE = "RUMOR"

    def __init__(self, db: Session):
        self.db = db

    def _base_query(self):
        return (
            self.db.query(Scan)
            .options(
                joinedload(Scan.evidence),
                joinedload(Scan.queries),
                joinedload(Scan.result),
                joinedload(Scan.url_analyses),
                joinedload(Scan.model_runs),
            )
            .filter(Scan.type == self.SCAN_TYPE)
        )

    def create(self, scan: Scan) -> Scan:
        self.db.add(scan)
        self.db.flush()
        return scan

    def get_by_id(self, scan_id: str) -> Optional[Scan]:
        return self._base_query().filter(Scan.id == scan_id).first()

    def list_scans(
        self, user_id: Optional[str] = None, limit: int = 50, offset: int = 0
    ) -> List[Scan]:
        query = self._base_query()
        if user_id:
            query = query.filter(Scan.user_id == user_id)
        return (
            query.order_by(Scan.created_at.desc()).offset(offset).limit(limit).all()
        )

    def list_unassigned_scans(self, limit: int = 50, offset: int = 0) -> List[Scan]:
        return (
            self._base_query()
            .filter(Scan.user_id.is_(None))
            .order_by(Scan.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def delete(self, scan: Scan) -> None:
        self.db.delete(scan)
        self.db.flush()
