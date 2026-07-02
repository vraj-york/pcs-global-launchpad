"""Subscription enforcement constants — aligned with backend subscription.constants.ts."""

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

SUPER_ADMIN_COGNITO_GROUP = "superadmin"

SUBSCRIPTION_ACCESS_DENIED_MSG = (
    "Your subscription is inactive or your payment is due. "
    "Please subscribe/complete payment to restore access."
)

SUBSCRIPTION_PLAN_FEATURE_DENIED_MSG = "This feature is not available on your current plan."

SUBSCRIPTION_EMPLOYEE_LIMIT_MSG = (
    "Your company has reached the maximum number of active employees " "allowed by your plan."
)

CHATBOT_AUTH_REQUIRED_MSG = "Authentication required."
