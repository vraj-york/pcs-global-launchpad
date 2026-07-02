"""Subscription enforcement constants — aligned with backend/src/auth/subscription.constants.ts."""

ACTIVE_SUBSCRIPTION_STATUSES = frozenset(["active", "trialing"])

BLOCKED_SUBSCRIPTION_STATUSES = frozenset(
    [
        "past_due",
        "unpaid",
        "incomplete",
        "incomplete_expired",
        "paused",
    ]
)

PLAN_TYPE_MONTHLY = "monthly"
PLAN_TYPE_ANNUAL = "annual"
PLAN_TYPE_ONE_TIME = "one_time"

ALLOWED_PLAN_TYPE_IDS = frozenset(
    [
        PLAN_TYPE_MONTHLY,
        PLAN_TYPE_ANNUAL,
        PLAN_TYPE_ONE_TIME,
    ]
)

SUPER_ADMIN_COGNITO_GROUP = "SuperAdmin"
CORPORATION_ADMIN_COGNITO_GROUP = "CorporationAdmin"
COMPANY_ADMIN_COGNITO_GROUP = "CompanyAdmin"

ADMIN_COGNITO_GROUPS = frozenset(
    [
        SUPER_ADMIN_COGNITO_GROUP,
        CORPORATION_ADMIN_COGNITO_GROUP,
        COMPANY_ADMIN_COGNITO_GROUP,
    ]
)

CORPORATION_ADMIN_APP_USER_TYPE = "corp_admin"
INVITE_TYPE_ASSESSMENT_ONLY = "assessment only"

SUBSCRIPTION_ACCESS_DENIED_MSG = (
    "Your subscription is inactive or your payment is due. "
    "Please subscribe/complete payment to restore access."
)

SUBSCRIPTION_PLAN_FEATURE_DENIED_MSG = (
    "This feature is not available on your current plan."
)

SUBSCRIPTION_EMPLOYEE_LIMIT_MSG = (
    "Your company has reached the maximum number of active employees "
    "allowed by your plan."
)

ONE_TIME_ASSESSMENT_ALREADY_USED_MSG = (
    "Individual plan users may only take one assessment. "
    "Your assessment has already been completed."
)

ONE_TIME_COMPANY_ASSESSMENT_CREDITS_EXHAUSTED_MSG = (
    "Your company has used all purchased assessment credits."
)

INDIVIDUAL_APP_USER_TYPE = "individual"
INDIVIDUAL_PAYMENT_STATUS_PAID = "paid"

INDIVIDUAL_PAYMENT_REQUIRED_MSG = "Complete payment to activate your assessment access."
