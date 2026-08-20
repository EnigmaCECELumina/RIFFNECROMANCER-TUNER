import os
from typing import Optional


def _first_env(*names: str) -> Optional[str]:
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return None


def get_stripe_api_key() -> str:
    api_key = _first_env("STRIPE_SECRET_KEY", "STRIPE_API_KEY", "STRIPE_LIVE_SECRET_KEY")
    if not api_key:
        raise RuntimeError(
            "Missing required Stripe secret env var. Set STRIPE_SECRET_KEY or STRIPE_API_KEY."
        )
    return api_key


def get_stripe_publishable_key() -> str:
    publishable_key = _first_env("STRIPE_PUBLISHABLE_KEY", "STRIPE_PUBLIC_KEY", "STRIPE_LIVE_PUBLISHABLE_KEY")
    if not publishable_key:
        raise RuntimeError(
            "Missing required Stripe publishable env var. Set STRIPE_PUBLISHABLE_KEY."
        )
    return publishable_key


def get_stripe_lookup_key(package_id: Optional[str] = None) -> Optional[str]:
    package_token = None
    if package_id:
        package_token = package_id.replace("-", "_").upper()

    candidate_names = [
        "STRIPE_LOOKUP_KEY",
        "apex_premium_monthly",
        "APEX_PREMIUM_MONTHLY",
        "APEX_PREMIUM_MONTHLY_LOOKUP_KEY",
    ]
    if package_token:
        candidate_names.insert(0, f"{package_token}_LOOKUP_KEY")
        candidate_names.insert(1, f"APEX_{package_token}_LOOKUP_KEY")

    return _first_env(*candidate_names)


def get_stripe_product_id() -> str:
    product_id = _first_env("STRIPE_PRODUCT_ID")
    if not product_id:
        raise RuntimeError(
            "Missing required Stripe product ID env var. Set STRIPE_PRODUCT_ID."
        )
    return product_id
