"""Shared subscription checks for assessment write routes."""

from sqlalchemy import text
from sqlalchemy.orm import Session

from utils.assessment_access_context import AssessmentAccessContext
from utils.exceptions import AuthorizationException
from utils.subscription_constants import (
    ALLOWED_PLAN_TYPE_IDS,
    INDIVIDUAL_PAYMENT_REQUIRED_MSG,
    ONE_TIME_ASSESSMENT_ALREADY_USED_MSG,
    ONE_TIME_COMPANY_ASSESSMENT_CREDITS_EXHAUSTED_MSG,
    SUBSCRIPTION_ACCESS_DENIED_MSG,
    SUBSCRIPTION_EMPLOYEE_LIMIT_MSG,
    SUBSCRIPTION_PLAN_FEATURE_DENIED_MSG,
)


def count_active_employees(db: Session, company_id: str) -> int:
    result = db.execute(
        text(
            """
            SELECT COUNT(DISTINCT uca.user_id)
            FROM user_company_access uca
            JOIN app_users au
                ON au.cognito_sub = uca.user_id
                AND au.deleted_at IS NULL
                AND LOWER(au.status) = 'active'
            WHERE uca.company_id = :cid
            """
        ),
        {"cid": company_id},
    ).scalar()
    return int(result or 0)


def _employee_limit_exceeded(ctx: AssessmentAccessContext, db: Session) -> bool:
    if ctx.employee_range_max is None or not ctx.company_id:
        return False
    return count_active_employees(db, ctx.company_id) > ctx.employee_range_max


def _require_individual_payment(ctx: AssessmentAccessContext) -> None:
    if ctx.skip_subscription_enforcement:
        return
    if not ctx.is_individual_b2c_user:
        return
    if not ctx.individual_payment_complete:
        raise AuthorizationException(INDIVIDUAL_PAYMENT_REQUIRED_MSG)


def require_writable_subscription(ctx: AssessmentAccessContext, db: Session) -> None:
    """
    Enforce subscription rules for all assessment mutations.
    Matches backend SubscriptionGuard ordering: employee cap, blocked, inactive.
    """
    if ctx.skip_subscription_enforcement:
        return

    _require_individual_payment(ctx)

    if not ctx.has_company:
        return

    if _employee_limit_exceeded(ctx, db):
        raise AuthorizationException(SUBSCRIPTION_EMPLOYEE_LIMIT_MSG)

    if ctx.subscription_is_blocked or not ctx.subscription_is_active:
        raise AuthorizationException(SUBSCRIPTION_ACCESS_DENIED_MSG)


def _assessment_count_for_user(db: Session, cognito_sub: str) -> int:
    result = db.execute(
        text("SELECT COUNT(*) FROM assessments WHERE user_id = :sub"),
        {"sub": cognito_sub},
    ).scalar()
    return int(result or 0)


def _assessment_count_for_company(db: Session, company_id: str) -> int:
    result = db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM assessments a
            JOIN user_company_access uca ON uca.user_id = a.user_id
            WHERE uca.company_id = :cid
            """
        ),
        {"cid": company_id},
    ).scalar()
    return int(result or 0)


def _user_has_unfinished_assessment(db: Session, cognito_sub: str) -> bool:
    result = db.execute(
        text(
            """
            SELECT 1
            FROM assessments
            WHERE user_id = :sub
              AND status <> 'report_generated'
            LIMIT 1
            """
        ),
        {"sub": cognito_sub},
    ).fetchone()
    return result is not None


def require_can_start_new_assessment(ctx: AssessmentAccessContext, db: Session) -> None:
    """Enforce subscription, plan type, one-time limit, and employee cap for POST /assessments."""
    _require_individual_payment(ctx)
    require_writable_subscription(ctx, db)

    if ctx.has_company:
        if ctx.plan_type_id not in ALLOWED_PLAN_TYPE_IDS:
            raise AuthorizationException(SUBSCRIPTION_PLAN_FEATURE_DENIED_MSG)

    if ctx.is_single_assessment_user:
        if _assessment_count_for_user(db, ctx.cognito_sub) > 0:
            raise AuthorizationException(ONE_TIME_ASSESSMENT_ALREADY_USED_MSG)

    if ctx.uses_company_assessment_credits:
        if _user_has_unfinished_assessment(db, ctx.cognito_sub):
            return
        purchased = (
            ctx.assessment_quantity if ctx.assessment_quantity is not None else 1
        )
        if not ctx.company_id:
            raise AuthorizationException(SUBSCRIPTION_PLAN_FEATURE_DENIED_MSG)
        company_count = _assessment_count_for_company(db, ctx.company_id)
        if company_count >= purchased:
            raise AuthorizationException(
                ONE_TIME_COMPANY_ASSESSMENT_CREDITS_EXHAUSTED_MSG
            )
