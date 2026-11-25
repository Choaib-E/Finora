"""Fixtures Pytest avec base MongoDB simulée (mongomock) pour préserver choaib."""

import mongomock
import pytest
from fastapi.testclient import TestClient

from app.core.security import _revoked_jti
from app.database.mongo import MongoManager, get_db, mongo_manager
from app.main import app


@pytest.fixture()
def mock_db(monkeypatch):
    _revoked_jti.clear()
    client = mongomock.MongoClient()
    db = client["choaib_test"]
    MongoManager.ensure_indexes(db)
    monkeypatch.setattr(mongo_manager, "connect", lambda: db)
    monkeypatch.setattr(mongo_manager, "close", lambda: None)
    monkeypatch.setattr(mongo_manager, "get_database", lambda: db)
    yield db
    client.close()


@pytest.fixture()
def client(mock_db):
    def _override_get_db():
        return mock_db

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
