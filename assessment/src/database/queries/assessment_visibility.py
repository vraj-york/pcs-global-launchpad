"""
Resolve assessment visibility from Cognito groups, app_users, user_company_access,
and corporation_companies. Aligned with backend AssessmentListService scope rules.
"""

from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

from utils.assessment_access_context import AssessmentAccessContext
from utils.subscription_constants import (
    COMPANY_ADMIN_COGNITO_GROUP,
    CORPORATION_ADMIN_APP_USER_TYPE,
    CORPORATION_ADMIN_COGNITO_GROUP,
    SUPER_ADMIN_COGNITO_GROUP,
)


def _load_user_profile_context(
    db: Session, cognito_sub: str
) -> tuple[str | None, str | None, str | None]:
    """Load invite_type, user_type, and payment_status for entitlement checks."""
    row = db.execute(
        text(
            """
            SELECT invite_type, user_type, payment_status
            FROM app_users
            WHERE cognito_sub = :sub AND deleted_at IS NULL
            """
        ),
        {"sub": cognito_sub},
    ).fetchone()
    if not row:
        return None, None, None
    return row[0], row[1], row[2]


def _resolve_corporation_id_for_corp_admin(db: Session, cognito_sub: str) -> str | None:
    row = db.execute(
        text(
            """
            SELECT corporation_id
            FROM app_users
            WHERE cognito_sub = :sub
              AND deleted_at IS NULL
              AND corporation_id IS NOT NULL
              AND user_type ILIKE :user_type_pattern
            """
        ),
        {
            "sub": cognito_sub,
            "user_type_pattern": f"%{CORPORATION_ADMIN_APP_USER_TYPE}%",
        },
    ).fetchone()
    return row[0] if row and row[0] else None


def _resolve_admin_company_ids(db: Session, cognito_sub: str) -> list[str]:
    rows = db.execute(
        text(
            """
            SELECT uca.company_id
            FROM user_company_access uca
            JOIN corporation_companies cc
                ON cc.id = uca.company_id
                AND cc.deleted_at IS NULL
            WHERE uca.user_id = :sub
              AND uca.is_admin = true
            """
        ),
        {"sub": cognito_sub},
    ).fetchall()
    return [r[0] for r in rows if r[0]]


def _visible_users_for_corporation(db: Session, corporation_id: str) -> set[str]:
    rows = db.execute(
        text(
            """
            SELECT DISTINCT u.cognito_sub
            FROM app_users u
            JOIN user_company_access uca ON uca.user_id = u.cognito_sub
            JOIN corporation_companies cc
                ON cc.id = uca.company_id
                AND cc.deleted_at IS NULL
            WHERE u.deleted_at IS NULL
              AND cc.corporation_id = :corporation_id
            """
        ),
        {"corporation_id": corporation_id},
    ).fetchall()
    return {r[0] for r in rows if r[0]}


def _visible_users_for_companies(db: Session, company_ids: list[str]) -> set[str]:
    if not company_ids:
        return set()
    stmt = text(
        """
        SELECT DISTINCT u.cognito_sub
        FROM app_users u
        JOIN user_company_access uca ON uca.user_id = u.cognito_sub
        JOIN corporation_companies cc
            ON cc.id = uca.company_id
            AND cc.deleted_at IS NULL
        WHERE u.deleted_at IS NULL
          AND uca.company_id IN :company_ids
        """
    ).bindparams(bindparam("company_ids", expanding=True))
    rows = db.execute(stmt, {"company_ids": company_ids}).fetchall()
    return {r[0] for r in rows if r[0]}


def build_assessment_access_context(
    db: Session,
    cognito_sub: str,
    cognito_groups: frozenset[str] = frozenset(),
) -> AssessmentAccessContext:
    visible: set[str] = {cognito_sub}
    invite_type, user_type, payment_status = _load_user_profile_context(db, cognito_sub)

    if SUPER_ADMIN_COGNITO_GROUP in cognito_groups:
        return AssessmentAccessContext(
            cognito_sub=cognito_sub,
            visible_user_ids=frozenset(visible),
            unrestricted_read_scope=True,
            cognito_groups=cognito_groups,
            invite_type=invite_type,
            user_type=user_type,
            payment_status=payment_status,
        )

    if CORPORATION_ADMIN_COGNITO_GROUP in cognito_groups:
        corporation_id = _resolve_corporation_id_for_corp_admin(db, cognito_sub)
        if corporation_id:
            visible.update(_visible_users_for_corporation(db, corporation_id))

    elif COMPANY_ADMIN_COGNITO_GROUP in cognito_groups:
        company_ids = _resolve_admin_company_ids(db, cognito_sub)
        visible.update(_visible_users_for_companies(db, company_ids))

    # Subscription context for the caller's primary company (earliest access row).
    sub_row = db.execute(
        text(
            """
            SELECT
                uca.company_id,
                cc.subscription_status,
                pp.plan_type_id,
                pp.employee_range_max,
                cc.assessment_quantity
            FROM user_company_access uca
            JOIN corporation_companies cc
                ON cc.id = uca.company_id
                AND cc.deleted_at IS NULL
            LEFT JOIN pricing_plans pp
                ON pp.id = cc.plan_id
            WHERE uca.user_id = :sub
            ORDER BY uca.created_at ASC
            LIMIT 1
            """
        ),
        {"sub": cognito_sub},
    ).fetchone()

    company_id: str | None = None
    subscription_status: str | None = None
    plan_type_id: str | None = None
    employee_range_max: int | None = None
    assessment_quantity: int | None = None

    if sub_row:
        company_id = sub_row[0]
        raw_status = sub_row[1]
        subscription_status = raw_status.lower() if raw_status else None
        plan_type_id = sub_row[2]
        employee_range_max = sub_row[3]
        assessment_quantity = sub_row[4]

    return AssessmentAccessContext(
        cognito_sub=cognito_sub,
        visible_user_ids=frozenset(visible),
        company_id=company_id,
        subscription_status=subscription_status,
        plan_type_id=plan_type_id,
        employee_range_max=employee_range_max,
        assessment_quantity=assessment_quantity,
        cognito_groups=cognito_groups,
        invite_type=invite_type,
        user_type=user_type,
        payment_status=payment_status,
    )
