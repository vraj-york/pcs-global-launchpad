"""Backward-compatible re-export — prefer ``BspContextInjector``."""

from app.services.bsp_context_injector import BSPPromptInjector, BspContextInjector

__all__ = ["BSPPromptInjector", "BspContextInjector"]
