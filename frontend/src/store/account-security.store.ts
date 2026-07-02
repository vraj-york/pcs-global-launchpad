import { toast } from "sonner";
import { create } from "zustand";
import {
	getSecurityStatus as getSecurityStatusApi,
	postChangePassword as postChangePasswordApi,
	resendMfaOtp as resendMfaOtpApi,
	sendMfaOtp as sendMfaOtpApi,
	verifyMfaOtp as verifyMfaOtpApi,
} from "@/api/account-security.api";
import { SETTINGS_SECURITY_CONTENT } from "@/const";
import type {
	AccountSecurityStore,
	ChangePasswordPayload,
	VerifyMfaOtpPayload,
} from "@/types";

const C = SETTINGS_SECURITY_CONTENT;

const initialState = {
	securityStatus: null as AccountSecurityStore["securityStatus"],
	securityLoading: false,
	securityError: null as string | null,
	isChangePasswordSubmitting: false,
	isMfaOtpSending: false,
	isMfaOtpResending: false,
	isMfaVerifySubmitting: false,
};

export const useAccountSecurityStore = create<AccountSecurityStore>()(
	(set) => ({
		...initialState,

		fetchSecurityStatus: async () => {
			set({ securityLoading: true, securityError: null });
			const result = await getSecurityStatusApi();
			set({ securityLoading: false });
			if (!result.ok) {
				set({
					securityStatus: null,
					securityError: result.message,
				});
				return false;
			}
			set({
				securityStatus: result.data,
				securityError: null,
			});
			return true;
		},

		changePassword: async (payload: ChangePasswordPayload) => {
			set({ isChangePasswordSubmitting: true });
			try {
				const result = await postChangePasswordApi(payload);
				if (!result.ok) {
					toast.error(result.message);
					return false;
				}
				const message = result.message.trim() || C.passwordChangeSuccess;
				toast.success(message);
				return true;
			} finally {
				set({ isChangePasswordSubmitting: false });
			}
		},

		sendMfaOtp: async (mode) => {
			set({ isMfaOtpSending: true });
			try {
				const result = await sendMfaOtpApi(mode);
				if (!result.ok) {
					toast.error(result.message);
					return false;
				}
				const toastMessage = result.message.trim() || C.mfaOtpSentToast;
				toast.success(toastMessage);
				set((state) => ({
					securityStatus: state.securityStatus
						? { ...state.securityStatus, email: result.email }
						: { mfaEnabled: false, mfaMethod: null, email: result.email },
				}));
				return true;
			} finally {
				set({ isMfaOtpSending: false });
			}
		},

		resendMfaOtp: async (mode) => {
			set({ isMfaOtpResending: true });
			try {
				const result = await resendMfaOtpApi(mode);
				if (!result.ok) {
					toast.error(result.message);
					return false;
				}
				const toastMessage = result.message.trim() || C.mfaOtpSentToast;
				toast.success(toastMessage);
				return true;
			} finally {
				set({ isMfaOtpResending: false });
			}
		},

		verifyMfaOtp: async (mode, payload: VerifyMfaOtpPayload) => {
			set({ isMfaVerifySubmitting: true });
			try {
				const result = await verifyMfaOtpApi(mode, payload);
				if (!result.ok) {
					toast.error(result.message);
					return false;
				}
				const defaultMessage =
					mode === "enable" ? C.mfaEnabledToast : C.mfaDisabledToast;
				const toastMessage = result.message.trim() || defaultMessage;
				toast.success(toastMessage);
				const statusResult = await getSecurityStatusApi();
				if (statusResult.ok) {
					set({ securityStatus: statusResult.data, securityError: null });
				}
				return true;
			} finally {
				set({ isMfaVerifySubmitting: false });
			}
		},

		reset: () => set(initialState),
	}),
);
