import { API_ENDPOINTS } from "@/const";
import { apiClient, isApiError } from "@/lib/apiClient";
import type {
	InviteUserPayload,
	ListUsersParams,
	ManageOnboardingStepPayload,
	MeAnalyticsContextData,
	PatchMyProfilePayload,
	PatchUserPayload,
	PeerMentionsListData,
	PeerSnapshotData,
	SubscriptionAccessData,
	UserDetails,
	UserDirectoryListItem,
	UserProfile,
	UsersListApiData,
} from "@/types";

function appendCsvParam(
	search: URLSearchParams,
	key: string,
	values: string[] | undefined,
) {
	if (values && values.length > 0) {
		search.set(key, values.join(","));
	}
}

/**
 * Current user subscription access context.
 * GET /users/me/subscription-access — always accessible regardless of subscription status.
 */
export async function getSubscriptionAccess() {
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data?: SubscriptionAccessData;
	}>(API_ENDPOINTS.users.userSubscriptionAccess);
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.success || body.data === undefined) {
		return {
			ok: false as const,
			message: body?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return { ok: true as const, data: body.data, status: result.status };
}

/**
 * Current user profile for consent / FTUE review.
 * GET /users/me/profile — bearer auth; body `{ success, message, data }`.
 */
export async function getUserProfile() {
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data?: UserProfile;
	}>(API_ENDPOINTS.users.userProfile);
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.success) {
		return {
			ok: false as const,
			message: body?.message ?? "Invalid response",
			status: result.status,
		};
	}
	if (body.data === undefined) {
		return {
			ok: false as const,
			message: "Invalid response",
			status: result.status,
		};
	}
	return { ok: true as const, data: body.data, status: result.status };
}

/**
 * Update current user profile (nickname, work phone, cell phone, timezone).
 * PATCH /users/me/profile — bearer auth; body `{ success, message }`.
 */
export async function patchMyProfile(payload: PatchMyProfilePayload) {
	const result = await apiClient.patch<{
		success: boolean;
		message: string;
	}>(API_ENDPOINTS.users.userProfile, payload);
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.success) {
		return {
			ok: false as const,
			message: body?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return {
		ok: true as const,
		message: typeof body.message === "string" ? body.message : "",
		status: result.status,
	};
}

/**
 * Upload current user avatar.
 * PATCH /users/me/avatar — multipart field `avatar` (PNG/JPG, max 10 MB).
 */
export async function patchMyAvatar(file: File) {
	const formData = new FormData();
	formData.append("avatar", file);
	const result = await apiClient.patch<{
		success: boolean;
		message: string;
		data?: { avatar: string };
	}>(API_ENDPOINTS.users.userAvatar, formData);
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.success) {
		return {
			ok: false as const,
			message: body?.message ?? "Invalid response",
			status: result.status,
		};
	}
	if (body.data?.avatar === undefined) {
		return {
			ok: false as const,
			message: "Invalid response",
			status: result.status,
		};
	}
	return {
		ok: true as const,
		data: body.data,
		message: typeof body.message === "string" ? body.message : "",
		status: result.status,
	};
}

/**
 * Delete current user avatar.
 * DELETE /users/me/avatar
 */
export async function deleteMyAvatar() {
	const result = await apiClient.delete<{
		success: boolean;
		message: string;
		data?: { avatar: null };
	}>(API_ENDPOINTS.users.userAvatar);
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.success) {
		return {
			ok: false as const,
			message: body?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return {
		ok: true as const,
		message: typeof body.message === "string" ? body.message : "",
		status: result.status,
	};
}

/**
 * Update current user's onboarding steps.
 * PATCH /users/me/onboarding-steps — body `{ type: "consent" | "intro_video" }`
 */
export async function patchUserOnboardingSteps(
	payload: ManageOnboardingStepPayload,
) {
	const result = await apiClient.patch<{
		success: boolean;
		message: string;
	}>(API_ENDPOINTS.users.userOnboardingSteps, payload);
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.success) {
		return {
			ok: false as const,
			message: body?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return {
		ok: true as const,
		message: typeof body.message === "string" ? body.message : "",
		status: result.status,
	};
}

/**
 * Fetch user directory list with pagination, sorting, and filters.
 * GET /users?page=&limit=&status=&categoryId=&corporationIds=&companyIds=&timezones=&sortBy=&sortOrder=&search=
 */
export async function getUsers(params: ListUsersParams) {
	const {
		page,
		limit,
		sortBy,
		sortOrder,
		status,
		categoryId,
		corporationIds,
		companyIds,
		timezones,
		search: searchQuery,
	} = params;
	const search = new URLSearchParams({
		page: String(page),
		limit: String(limit),
	});
	if (sortBy) search.set("sortBy", sortBy);
	if (sortOrder) search.set("sortOrder", sortOrder);
	if (status?.trim()) search.set("status", status.trim().toLowerCase());
	if (categoryId?.trim()) search.set("categoryId", categoryId.trim());
	appendCsvParam(search, "corporationIds", corporationIds);
	appendCsvParam(search, "companyIds", companyIds);
	appendCsvParam(search, "timezones", timezones);
	if (searchQuery?.trim()) search.set("search", searchQuery.trim());
	const url = `${API_ENDPOINTS.users.root}?${search.toString()}`;
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data: UsersListApiData;
	}>(url);
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!data)
		return { ok: false as const, message: "Invalid response", status: 0 };
	const items: UserDirectoryListItem[] = data.items.map((item) => ({
		...item,
		id: item.cognitoSub,
	}));
	return {
		ok: true as const,
		data: {
			items,
			total: data.pagination.total,
			page: data.pagination.page,
			limit: data.pagination.pageSize,
			totalPages: data.pagination.totalPages,
		},
	};
}

/**
 * Single user profile for directory detail view.
 * GET /users/:id
 */
export async function getUserById(userId: string) {
	const url = API_ENDPOINTS.users.byId(userId);
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data: UserDetails;
	}>(url);
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!data)
		return { ok: false as const, message: "Invalid response", status: 0 };
	return { ok: true as const, data };
}

/**
 * Update user profile fields.
 * PATCH /users/:id
 */
export async function patchUser(userId: string, payload: PatchUserPayload) {
	const url = API_ENDPOINTS.users.byId(userId);
	const result = await apiClient.patch<{
		success: boolean;
		message: string;
		data?: UserDetails;
	}>(url, payload);
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.success) {
		return {
			ok: false as const,
			message: body?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return { ok: true as const };
}

/**
 * Block or unblock a user.
 * PATCH /users/:id/block — body `{ "blocked": boolean }`
 */
export async function patchUserBlock(userId: string, blocked: boolean) {
	const url = API_ENDPOINTS.users.block(userId);
	const result = await apiClient.patch<{
		success: boolean;
		message: string;
	}>(url, { blocked });
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.success) {
		return {
			ok: false as const,
			message: body?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return { ok: true as const };
}

/**
 * Permanently delete a user.
 * DELETE /users/:id
 */
export async function deleteUser(userId: string) {
	const url = API_ENDPOINTS.users.byId(userId);
	const result = await apiClient.delete<{
		success: boolean;
		message: string;
	}>(url);
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.success) {
		return {
			ok: false as const,
			message: body?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return { ok: true as const };
}

/**
 * Cancel a pending user invitation.
 * PATCH /users/:id/invitation/cancel — no body
 */
export async function patchCancelUserInvitation(userId: string) {
	const url = API_ENDPOINTS.users.invitationCancel(userId);
	const result = await apiClient.patch<{
		success: boolean;
		message: string;
	}>(url);
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.success) {
		return {
			ok: false as const,
			message: body?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return { ok: true as const };
}

/**
 * Resend a pending or expired user invitation email.
 * POST /users/:id/invitation/resend — no body
 */
export async function postResendUserInvitation(userId: string) {
	const url = API_ENDPOINTS.users.invitationResend(userId);
	const result = await apiClient.post<{
		success: boolean;
		message: string;
	}>(url);
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.success) {
		return {
			ok: false as const,
			message: body?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return { ok: true as const };
}

/**
 * GET /users/me/peer-mentions — autocomplete for chatbot @mentions.
 */
export async function listPeerMentions(query?: string) {
	const search = new URLSearchParams();
	const trimmed = query?.trim();
	if (trimmed) {
		search.set("query", trimmed);
	}
	const qs = search.toString();
	const url = qs
		? `${API_ENDPOINTS.users.peerMentions}?${qs}`
		: API_ENDPOINTS.users.peerMentions;
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data?: PeerMentionsListData;
	}>(url);
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.success || body.data === undefined) {
		return {
			ok: false as const,
			message:
				typeof body?.message === "string"
					? body.message
					: "Invalid peer mentions response",
			status: result.status,
		};
	}
	return { ok: true as const, data: body.data, status: result.status };
}

/**
 * GET /users/me/peer-snapshot — dashboard peers with overall BSP style metadata.
 */
export async function getMyPeerSnapshot(query?: string) {
	const search = new URLSearchParams();
	const trimmed = query?.trim();
	if (trimmed) {
		search.set("query", trimmed);
	}
	const qs = search.toString();
	const url = qs
		? `${API_ENDPOINTS.users.peerSnapshot}?${qs}`
		: API_ENDPOINTS.users.peerSnapshot;
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data?: PeerSnapshotData;
	}>(url);
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.success || body.data === undefined) {
		return {
			ok: false as const,
			message:
				typeof body?.message === "string"
					? body.message
					: "Invalid peer snapshot response",
			status: result.status,
		};
	}
	return { ok: true as const, data: body.data, status: result.status };
}

/**
 * GET /users/me/analytics-context — tenant context for PostHog groups (no PII).
 */
export async function getMeAnalyticsContext() {
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data?: MeAnalyticsContextData;
	}>(API_ENDPOINTS.users.meAnalyticsContext);
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.success || body.data === undefined) {
		return {
			ok: false as const,
			message:
				typeof body?.message === "string"
					? body.message
					: "Invalid analytics context response",
			status: result.status,
		};
	}
	return { ok: true as const, data: body.data, status: result.status };
}

/**
 * Invite a new user.
 * POST /users/invite
 */
export async function inviteUser(payload: InviteUserPayload) {
	const url = API_ENDPOINTS.users.invite;
	const result = await apiClient.post<{
		success: boolean;
		message: string;
		data?: unknown;
	}>(url, payload);
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.success) {
		return {
			ok: false as const,
			message: body?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return {
		ok: true as const,
		message: typeof body.message === "string" ? body.message : "",
	};
}

/**
 * Bulk invite users from CSV.
 * POST /users/invite/bulk — multipart/form-data, field name `file`.
 */
export async function bulkInviteUsers(file: File) {
	const formData = new FormData();
	formData.append("file", file);
	const url = API_ENDPOINTS.users.inviteBulk;
	const result = await apiClient.post<{
		success: boolean;
		message: string;
	}>(url, formData);
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.success) {
		return {
			ok: false as const,
			message: body?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return {
		ok: true as const,
		message: typeof body.message === "string" ? body.message : "",
	};
}
