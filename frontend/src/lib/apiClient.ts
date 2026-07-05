import { fetchAuthSession } from "aws-amplify/auth";
import axios, {
	type AxiosError,
	type AxiosResponse,
	type InternalAxiosRequestConfig,
} from "axios";
import { API_CONFIG } from "@/const";
import { buildLoginUrlWithRedirect } from "./postLoginRedirect";

/**
 * API Response type
 */
export type ApiResponse<T = unknown> = {
	data: T;
	status: number;
	ok: true;
};

/**
 * API Error type
 */
export type ApiError = {
	message: string;
	status: number;
	ok: false;
};

/**
 * Get Cognito JWT string for Authorization header.
 * Uses fetchAuthSession; accessToken is a string.
 */
export async function getBearerToken(): Promise<string | undefined> {
	try {
		const session = await fetchAuthSession();
		return session.tokens?.accessToken?.toString();
	} catch {
		return undefined;
	}
}

/**
 * Axios instance with default configuration
 */
const axiosInstance = axios.create({
	baseURL: API_CONFIG.baseUrl,
	timeout: API_CONFIG.timeout,
	headers: {
		"Content-Type": "application/json",
	},
});

/**
 * Request interceptor: add Authorization Bearer token for protected APIs.
 * When sending FormData, remove Content-Type so the browser sets multipart/form-data with boundary.
 */
axiosInstance.interceptors.request.use(
	async (config: InternalAxiosRequestConfig) => {
		const token = await getBearerToken();
		if (token) {
			config.headers.set("Authorization", `Bearer ${token}`);
		}
		if (config.data instanceof FormData) {
			config.headers.delete("Content-Type");
		}
		return config;
	},
	(error) => Promise.reject(error),
);

/**
 * Response interceptor: redirect to login on 401 when the token is missing.
 * Only redirects when status is 401 and message is "Authorization token is missing".
 */
axiosInstance.interceptors.response.use(
	(response: AxiosResponse) => response,
	(error: AxiosError<{ message?: string }>) => {
		const status = error.response?.status;
		const message = error.response?.data?.message;
		if (
			status === 401 &&
			typeof message === "string" &&
			typeof window !== "undefined"
		) {
			const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
			window.location.href = buildLoginUrlWithRedirect(returnPath);
		}
		return Promise.reject(error);
	},
);

/**
 * Transforms axios response to ApiResponse
 */
function transformResponse<T>(response: AxiosResponse<T>): ApiResponse<T> {
	return {
		data: response.data,
		status: response.status,
		ok: true,
	};
}

/**
 * Transforms axios error to ApiError
 */
function transformError(
	error: AxiosError<{ message?: string | string[] }>,
): ApiError {
	const raw = error.response?.data?.message;
	let message: string;
	if (typeof raw === "string") {
		message = raw;
	} else if (Array.isArray(raw)) {
		message = raw.join(", ");
	} else {
		message = error.message || "An unexpected error occurred";
	}
	const status = error.response?.status ?? 0;

	return {
		message,
		status,
		ok: false,
	};
}

/**
 * API Client with HTTP method shortcuts
 * Using axios for HTTP requests
 */
export const apiClient = {
	get: async <T>(
		endpoint: string,
		headers?: Record<string, string>,
	): Promise<ApiResponse<T> | ApiError> => {
		const response = await axiosInstance
			.get<T>(endpoint, { headers })
			.then(transformResponse<T>)
			.catch(transformError);
		return response;
	},

	post: async <T>(
		endpoint: string,
		body?: unknown,
		headers?: Record<string, string>,
	): Promise<ApiResponse<T> | ApiError> => {
		const response = await axiosInstance
			.post<T>(endpoint, body, { headers })
			.then(transformResponse<T>)
			.catch(transformError);
		return response;
	},

	put: async <T>(
		endpoint: string,
		body?: unknown,
		headers?: Record<string, string>,
	): Promise<ApiResponse<T> | ApiError> => {
		const response = await axiosInstance
			.put<T>(endpoint, body, { headers })
			.then(transformResponse<T>)
			.catch(transformError);
		return response;
	},

	patch: async <T>(
		endpoint: string,
		body?: unknown,
		headers?: Record<string, string>,
	): Promise<ApiResponse<T> | ApiError> => {
		const response = await axiosInstance
			.patch<T>(endpoint, body, { headers })
			.then(transformResponse<T>)
			.catch(transformError);
		return response;
	},

	delete: async <T>(
		endpoint: string,
		headers?: Record<string, string>,
	): Promise<ApiResponse<T> | ApiError> => {
		const response = await axiosInstance
			.delete<T>(endpoint, { headers })
			.then(transformResponse<T>)
			.catch(transformError);
		return response;
	},

	deleteWithBody: async <T>(
		endpoint: string,
		body?: unknown,
		headers?: Record<string, string>,
	): Promise<ApiResponse<T> | ApiError> => {
		const response = await axiosInstance
			.delete<T>(endpoint, { data: body, headers })
			.then(transformResponse<T>)
			.catch(transformError);
		return response;
	},
};

/**
 * Type guard to check if response is an error
 */
export function isApiError(
	response: ApiResponse | ApiError,
): response is ApiError {
	return !response.ok;
}

/**
 * Export axios instance for advanced use cases
 */
export { axiosInstance };
