from starlette.requests import Request


def get_client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()[:45] or None
    if request.client:
        return (request.client.host or "")[:45] or None
    return None
