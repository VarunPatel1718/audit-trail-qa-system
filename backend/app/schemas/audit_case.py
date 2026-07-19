from datetime import datetime

from pydantic import BaseModel


class AuditCaseOut(BaseModel):
    id: int
    transaction_id: int | None
    title: str
    description: str
    resolution: str
    tags: str | None
    created_at: datetime
    updated_at: datetime
