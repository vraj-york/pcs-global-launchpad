import {
	API_ENDPOINTS,
	GROWTH_SPARK_API_INVALID_RESPONSE_MESSAGE,
} from "@/const";
import { apiClient, isApiError } from "@/lib/apiClient";
import type { GrowthSparkData } from "@/types";

export async function getMyGrowthSpark() {
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data?: GrowthSparkData;
	}>(API_ENDPOINTS.users.growthSpark);

	if (isApiError(result)) {
		return result;
	}

	const body = result.data;
	if (!body?.success || body.data === undefined) {
		return {
			ok: false as const,
			message: body?.message ?? GROWTH_SPARK_API_INVALID_RESPONSE_MESSAGE,
			status: result.status,
		};
	}

	return { ok: true as const, data: body.data, status: result.status };
}
