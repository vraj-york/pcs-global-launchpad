import { toast } from "sonner";
import { create } from "zustand";
import {
	resendDataDownloadOtp as resendDataDownloadOtpApi,
	sendDataDownloadOtp as sendDataDownloadOtpApi,
	verifyDataDownloadOtp as verifyDataDownloadOtpApi,
} from "@/api";
import { SETTINGS_PRIVACY_CONTENT } from "@/const";
import type { PrivacyDataStore, VerifyDataDownloadOtpPayload } from "@/types";

const C = SETTINGS_PRIVACY_CONTENT;

const initialState = {
	isDataDownloadOtpSending: false,
	isDataDownloadOtpResending: false,
	isDataDownloadVerifySubmitting: false,
};

export const usePrivacyDataStore = create<PrivacyDataStore>()((set) => ({
	...initialState,

	sendDataDownloadOtp: async () => {
		set({ isDataDownloadOtpSending: true });
		try {
			const result = await sendDataDownloadOtpApi();
			if (!result.ok) {
				toast.error(result.message);
				return false;
			}
			const toastMessage = result.message.trim() || C.otpSentToast;
			toast.success(toastMessage);
			return true;
		} finally {
			set({ isDataDownloadOtpSending: false });
		}
	},

	resendDataDownloadOtp: async () => {
		set({ isDataDownloadOtpResending: true });
		try {
			const result = await resendDataDownloadOtpApi();
			if (!result.ok) {
				toast.error(result.message);
				return false;
			}
			const toastMessage = result.message.trim() || C.otpSentToast;
			toast.success(toastMessage);
			return true;
		} finally {
			set({ isDataDownloadOtpResending: false });
		}
	},

	verifyDataDownloadOtp: async (payload: VerifyDataDownloadOtpPayload) => {
		set({ isDataDownloadVerifySubmitting: true });
		try {
			const result = await verifyDataDownloadOtpApi(payload);
			if (!result.ok) {
				toast.error(result.message);
				return false;
			}
			return true;
		} finally {
			set({ isDataDownloadVerifySubmitting: false });
		}
	},

	reset: () => set(initialState),
}));
