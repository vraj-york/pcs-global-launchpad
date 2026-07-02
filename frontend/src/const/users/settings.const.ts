import { Settings } from "lucide-react";
import type { SettingsTabId } from "@/types";

export const SETTINGS_PAGE_CONTENT = {
	breadcrumbTitle: "Settings",
	title: "Settings",
	subtitle: "Configure & personalized your account-based details",
	cancelButton: "Cancel",
	saveButton: "Save & Update",
	savingButton: "Saving…",
	saveSuccess: "Profile updated successfully.",
	avatarUploadSuccess: "Avatar updated successfully.",
	avatarRemoveSuccess: "Avatar removed successfully.",
	changeAvatarButton: "Change Avatar",
	removeAvatarButton: "Remove",
	avatarPickerAriaLabel: "Choose profile photo",
	avatarUploading: "Uploading…",
	avatarRemoving: "Removing…",
	cardPersonalDetails: "Personal Details",
	cardCorporationCompany: "Corporation & Company Info.",
	fieldFirstName: "First Name",
	fieldLastName: "Last Name",
	fieldNickname: "Nickname",
	fieldEmail: "Email",
	fieldWorkPhone: "Work Phone No.",
	fieldCellPhone: "Cell Phone No.",
	fieldTimezone: "Time Zone (Personal)",
	fieldAssignedCorporation: "Assigned Corporation",
	fieldAssignedCompany: "Assigned Company",
	fieldRoleName: "Role Name",
	roleNameNotAvailable: "Not available",
	managedByOrganizationTooltip: "Managed by your organization",
	loadError:
		"We couldn't load your settings. Please refresh or try again later.",
	retryButton: "Retry",
} as const;

export const SETTINGS_AVATAR_VALIDATION = {
	maxFileSizeBytes: 10 * 1024 * 1024,
	allowedMimeTypes: ["image/png", "image/jpeg"],
	allowedExtensions: [".png", ".jpg", ".jpeg"],
	fileAccept: ".png,.jpg,.jpeg",
	unsupportedType: "Use a PNG or JPG image.",
	tooLarge: "Image size must be 10MB or less.",
} as const;

export const SETTINGS_TABS: ReadonlyArray<{
	id: SettingsTabId;
	label: string;
}> = [
	{ id: "profile-overview", label: "Profile Overview" },
	{ id: "security", label: "Security" },
	{ id: "privacy-data", label: "Privacy & Data" },
] as const;

export const SETTINGS_SIDEBAR_ITEM = {
	id: "settings",
	label: "Settings",
	icon: Settings,
} as const;
