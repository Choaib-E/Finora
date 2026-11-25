"""Modèles et valeurs par défaut pour les catégories marocaines."""

from typing import List, TypedDict


class DefaultCategorySeed(TypedDict):
    nom: str
    type: str
    couleur: str


DEFAULT_CATEGORIES: List[DefaultCategorySeed] = [
    # Dépenses
    {"nom": "Alimentation", "type": "depense", "couleur": "#F97316"},
    {"nom": "Logement", "type": "depense", "couleur": "#3B82F6"},
    {"nom": "Transport", "type": "depense", "couleur": "#06B6D4"},
    {"nom": "Factures & Télécoms", "type": "depense", "couleur": "#8B5CF6"},
    {"nom": "Santé", "type": "depense", "couleur": "#EF4444"},
    {"nom": "Loisirs", "type": "depense", "couleur": "#EC4899"},
    {"nom": "Shopping", "type": "depense", "couleur": "#EAB308"},
    {"nom": "Éducation", "type": "depense", "couleur": "#6366F1"},
    {"nom": "Autres dépenses", "type": "depense", "couleur": "#64748B"},
    # Revenus
    {"nom": "Salaire", "type": "revenu", "couleur": "#10B981"},
    {"nom": "Freelance", "type": "revenu", "couleur": "#14B8A6"},
    {"nom": "Investissements", "type": "revenu", "couleur": "#22C55E"},
    {"nom": "Primes & Bonus", "type": "revenu", "couleur": "#84CC16"},
    {"nom": "Autres revenus", "type": "revenu", "couleur": "#059669"},
]
