from typing import List

from factlens_common.schema import Evidence
from sqlalchemy.orm import Session


class EvidenceRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_scan_id(self, scan_id: str) -> List[Evidence]:
        return (
            self.db.query(Evidence)
            .filter(Evidence.scan_id == scan_id)
            .order_by(Evidence.relevance_score.desc())
            .all()
        )

    def add_all(self, evidences: List[Evidence]) -> List[Evidence]:
        self.db.add_all(evidences)
        self.db.flush()
        return evidences
