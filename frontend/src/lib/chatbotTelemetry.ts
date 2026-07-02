/**
 * Optional follow-up chip telemetry. Not wired by default — no events are sent
 * until the app calls `setFollowUpChipTelemetryHandler`.
 */
import type {
	FollowUpChipClickPayload,
	FollowUpTelemetryHandler,
} from "@/types";

let handler: FollowUpTelemetryHandler | undefined;

export function setFollowUpChipTelemetryHandler(
	next: FollowUpTelemetryHandler | undefined,
): void {
	handler = next;
}

export function logFollowUpChipClick(payload: FollowUpChipClickPayload): void {
	handler?.(payload);
}
