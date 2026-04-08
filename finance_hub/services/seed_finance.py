"""Seed helpers for default accounts, investments and import sources."""

from __future__ import annotations

import datetime as dt

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models import Account, ImportSource, Investment


def bootstrap_finance_workspace(db: Session) -> None:
    """Create default finance workspace records when the tables are empty."""

    if db.scalar(select(Account.id).limit(1)) is None:
        db.add_all(
            [
                Account(
                    label="Compte principal",
                    institution="Banque Campus",
                    type="checking",
                    balance=1260.0,
                    last4="2048",
                    notes="Compte courant utilise pour les depenses du quotidien.",
                ),
                Account(
                    label="Carte mobile",
                    institution="NeoBank",
                    type="checking",
                    balance=280.0,
                    last4="5512",
                    notes="Compte secondaire pour les achats en ligne et les voyages.",
                ),
                Account(
                    label="Epargne projet",
                    institution="Savings Space",
                    type="savings",
                    balance=1850.0,
                    notes="Reserve pour semestre, depot de garantie ou demenagement.",
                ),
                Account(
                    label="Especes",
                    institution="Offline",
                    type="cash",
                    balance=70.0,
                    notes="Petites depenses non cartees.",
                ),
            ]
        )

    if db.scalar(select(Investment.id).limit(1)) is None:
        db.add_all(
            [
                Investment(
                    type="ETF Monde",
                    amount=900.0,
                    current_value=980.0,
                    date_label="Mars 2026",
                    notes="Exemple de placement long terme verse chaque mois.",
                ),
                Investment(
                    type="Fonds securise",
                    amount=450.0,
                    current_value=455.0,
                    date_label="Fevrier 2026",
                    notes="Exemple de poche prudente pour les projets a court terme.",
                ),
            ]
        )

    if db.scalar(select(ImportSource.id).limit(1)) is None:
        db.add_all(
            [
                ImportSource(
                    label="Primary budget import",
                    provider="Bundled demo CSV",
                    source_type="csv",
                    status="connected",
                    last_imported_at=dt.datetime.utcnow(),
                    storage_path="data/demo-budget.csv",
                    notes="Jeu de donnees de demo charge automatiquement pour le premier lancement.",
                ),
                ImportSource(
                    label="Bank CSV export",
                    provider="Any bank",
                    source_type="csv",
                    status="planned",
                    notes="Pipeline prevu pour brancher un export CSV mensuel.",
                ),
                ImportSource(
                    label="Broker CSV export",
                    provider="Any broker",
                    source_type="csv",
                    status="planned",
                    notes="Pipeline prevu pour suivre versements, positions et valorisations.",
                ),
            ]
        )

    db.commit()
