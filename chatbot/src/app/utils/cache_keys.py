"""Cache key helpers for warm-tier context."""

from __future__ import annotations

import hashlib
from typing import Optional


def personalization_cache_key(
    access_token: Optional[str],
    user_id_hash: Optional[str] = None,
) -> Optional[str]:
    """
    Return a stable cache key for a user's warm-tier context.

    When *user_id_hash* (the verified ``AuthContext.user_id``) is supplied, it
    is folded into the key so the entry is bound to the authenticated identity
    rather than the raw token string alone — a defence-in-depth guard against
    any token-hash collision serving one user's personalization to another.
    Falls back to a token-only key for backward compatibility.
    """
    if not access_token:
        return None
    basis = access_token if not user_id_hash else f"{user_id_hash}:{access_token}"
    return hashlib.sha256(basis.encode("utf-8")).hexdigest()[:32]
