"""Caller identity, visible assessments, and subscription context for the assessment API."""

from dataclasses import dataclass
from typing import FrozenSet, Optional

from utils.subscription_constants import (
    ACTIVE_SUBSCRIPTION_STATUSES,
    ADMIN_COGNITO_GROUPS,
    BLOCKED_SUBSCRIPTION_STATUSES,
    INDIVIDUAL_APP_USER_TYPE,
    INDIVIDUAL_PAYMENT_STATUS_PAID,
    INVITE_TYPE_ASSESSMENT_ONLY,
    PLAN_TYPE_ANNUAL,
    PLAN_TYPE_MONTHLY,
    PLAN_TYPE_ONE_TIME,
)


@dataclass(frozen=True)
class AssessmentAccessContext:
    cognito_sub: str
    visible_user_ids: FrozenSet[str]
    unrestricted_read_scope: bool = False

    company_id: Optional[str] = None
    subscription_status: Optional[str] = None
    plan_type_id: Optional[str] = None
    employee_range_max: Optional[int] = None
    assessment_quantity: Optional[int] = None
    cognito_groups: FrozenSet[str] = frozenset()
    invite_type: Optional[str] = None
    user_type: Optional[str] = None
    payment_status: Optional[str] = None

    def can_read_owner(self, owner_user_id: str) -> bool:
        return self.unrestricted_read_scope or owner_user_id in self.visible_user_ids

    def is_owner(self, owner_user_id: str) -> bool:
        return owner_user_id == self.cognito_sub

    @property
    def has_company(self) -> bool:
        return self.company_id is not None

    @property
    def is_admin_role(self) -> bool:
        """True for Cognito admin groups — matches backend SubscriptionGuard bypass."""
        return bool(self.cognito_groups & ADMIN_COGNITO_GROUPS)

    @property
    def skip_subscription_enforcement(self) -> bool:
        return self.is_admin_role

    @property
    def subscription_is_active(self) -> bool:
        return (
            self.subscription_status is not None
            and self.subscription_status in ACTIVE_SUBSCRIPTION_STATUSES
        )

    @property
    def subscription_is_blocked(self) -> bool:
        return (
            self.subscription_status is not None
            and self.subscription_status in BLOCKED_SUBSCRIPTION_STATUSES
        )

    @property
    def is_monthly_plan(self) -> bool:
        return self.plan_type_id == PLAN_TYPE_MONTHLY

    @property
    def is_annual_plan(self) -> bool:
        return self.plan_type_id == PLAN_TYPE_ANNUAL

    @property
    def is_one_time_plan(self) -> bool:
        return self.plan_type_id == PLAN_TYPE_ONE_TIME

    @property
    def is_assessment_only_user(self) -> bool:
        return (self.invite_type or "").strip().lower() == INVITE_TYPE_ASSESSMENT_ONLY

    @property
    def is_individual_b2c_user(self) -> bool:
        return (self.user_type or "").strip().lower() == INDIVIDUAL_APP_USER_TYPE

    @property
    def individual_payment_complete(self) -> bool:
        return (
            self.payment_status or ""
        ).strip().lower() == INDIVIDUAL_PAYMENT_STATUS_PAID

    @property
    def is_single_assessment_user(self) -> bool:
        if self.is_individual_b2c_user:
            return True
        if self.is_assessment_only_user:
            return True
        return False

    @property
    def uses_company_assessment_credits(self) -> bool:
        return (
            self.is_one_time_plan
            and self.has_company
            and not self.is_assessment_only_user
        )
