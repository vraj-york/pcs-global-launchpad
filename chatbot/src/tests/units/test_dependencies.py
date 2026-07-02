"""Guard against DI wiring regressions at import time."""


def test_dependencies_module_imports():
    from app.api import dependencies

    assert callable(dependencies.get_thread_service)
    assert callable(dependencies.get_chat_service_with_bsp)
    assert callable(dependencies.get_unified_chat_service)
