import type { UserProfile } from "./user.types";

export type SettingsTabId = "profile-overview" | "security" | "privacy-data";

export type SettingsProfileAvatarProps = {
	avatarUrl: string | null;
	firstName: string;
	lastName: string;
	isUploading: boolean;
	isRemoving: boolean;
	onUpload: (file: File) => Promise<void>;
	onRemove: () => Promise<void>;
	onValidationError: (message: string) => void;
};

export type SettingsProfileOverviewFormProps = {
	profile: UserProfile;
	showCorporationCompanySection: boolean;
};

export type SettingsProfileOverviewTabProps = {
	profileLoading: boolean;
	profileError: string | null;
	onRetryLoad: () => void;
};
