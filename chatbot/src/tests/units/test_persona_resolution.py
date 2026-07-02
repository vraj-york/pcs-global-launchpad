from app.utils.persona_resolution import resolve_persona_from_groups


def test_super_admin_group():
    assert resolve_persona_from_groups(["SuperAdmin"]) == "superadmin"


def test_corporation_admin_group():
    assert resolve_persona_from_groups(["CorporationAdmin"]) == "corporation_admin"


def test_company_admin_group():
    assert resolve_persona_from_groups(["CompanyAdmin"]) == "company_admin"


def test_user_group_maps_to_employee():
    assert resolve_persona_from_groups(["User"]) == "employee"


def test_highest_privilege_wins():
    assert resolve_persona_from_groups(["User", "CompanyAdmin"]) == "company_admin"


def test_unknown_groups_return_none():
    assert resolve_persona_from_groups(["UnknownGroup"]) is None
