from sqlalchemy.orm import Session

from ..repositories.evidence_repository import EvidenceRepository
from ..repositories.scan_repository import ScanRepository


class RumourUnitOfWork:
    """
    Unit of Work: coordinates multi-repository transactions so a scan and its
    evidence, URL analyses and model runs are persisted atomically.
    """

    def __init__(self, session: Session):
        self.session = session
        self.scans = ScanRepository(session)
        self.evidence = EvidenceRepository(session)

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
