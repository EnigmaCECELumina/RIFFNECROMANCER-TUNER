"""Shared pytest configuration for the backend test-suite.

``backend/server.py`` reads several settings from the environment *at import
time* (``MONGO_URL``, ``DB_NAME``, ``JWT_SECRET`` and a Stripe secret key) and
refuses to import if they are missing. Tests never talk to a real MongoDB or
Stripe account — the database is swapped for an in-memory mock and the Stripe
SDK is monkeypatched — so here we only need to make sure importing the module
succeeds. ``setdefault`` is used so a real environment (e.g. CI) can still
override these values.
"""

import os

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "riffnecromancer_test")
os.environ.setdefault("JWT_SECRET", "unit-test-secret-key-that-is-at-least-32b")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_dummy")
