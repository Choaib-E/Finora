"""Outils de formatage monétaire et de dates (contexte marocain MAD / DH)."""

from datetime import datetime, timezone


def format_mad(amount: float) -> str:
    """Formate un montant en Dirhams marocains (ex: 1 500,00 DH)."""
    formatted = f"{amount:,.2f}".replace(",", " ").replace(".", ",")
    return f"{formatted} DH"


def utc_now() -> datetime:
    """Retourne l'instant UTC courant."""
    return datetime.now(timezone.utc)


def ensure_utc_datetime(dt: datetime) -> datetime:
    """Normalise une date/datetime en datetime UTC aware."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)
