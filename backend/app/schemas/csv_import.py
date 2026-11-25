"""Schémas Pydantic pour l'importation CSV."""

from typing import List
from pydantic import BaseModel


class CsvImportErrorItem(BaseModel):
    row_number: int
    raw_data: str
    error: str


class CsvImportUserSummary(BaseModel):
    user_code: str
    imported_count: int


class CsvImportResponse(BaseModel):
    total_rows: int
    imported_count: int
    duplicates_skipped: int
    error_count: int
    errors: List[CsvImportErrorItem]
    summary_by_user: List[CsvImportUserSummary]
