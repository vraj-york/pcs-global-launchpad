"""
Proactive Routes

Backend contract for chatbot proactive employee idle-state UX.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query, Request

from app.api.dependencies import get_proactive_employee_service
from app.models.schema import ProactiveEmployeeResponse
from app.services import ProactiveEmployeeService
from app.utils.subscription_access import require_chatbot_subscription

router = APIRouter(prefix="/proactive", tags=["Proactive"])


def _extract_bearer_token(request: Request) -> Optional[str]:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    return None


@router.get("/employee", response_model=ProactiveEmployeeResponse)
def get_employee_proactive_payload(
    fastapi_request: Request,
    display_name: Optional[str] = Query(default=None, min_length=1, max_length=80),
    phase: Optional[int] = Query(default=None, ge=0, le=2),
    service: ProactiveEmployeeService = Depends(get_proactive_employee_service),
):
    """
    Return proactive empty-state payload for employee chatbot role.

    Current implementation is mock-backed by design because team entities and
    assessment-result APIs are not yet available in the platform.

    Query params:
      - display_name: optional preview override (e.g. QA screenshots).
      - phase: optional filter (0|1|2). If omitted, returns all phases.
    """
    require_chatbot_subscription(_extract_bearer_token(fastapi_request))
    return service.get_payload(display_name=display_name, phase=phase)
