import importlib


def test_prefers_explicit_env_names(monkeypatch):
    monkeypatch.delenv("STRIPE_SECRET_KEY", raising=False)
    monkeypatch.setenv("STRIPE_API_KEY", "sk_test_123")

    stripe_config = importlib.import_module("backend.stripe_config")

    assert stripe_config.get_stripe_api_key() == "sk_test_123"


def test_reads_lookup_key_from_env(monkeypatch):
    monkeypatch.delenv("STRIPE_LOOKUP_KEY", raising=False)
    monkeypatch.delenv("APEX_PREMIUM_MONTHLY_LOOKUP_KEY", raising=False)
    monkeypatch.setenv("STRIPE_LOOKUP_KEY", "lookup_test")

    stripe_config = importlib.import_module("backend.stripe_config")

    assert stripe_config.get_stripe_lookup_key() == "lookup_test"
