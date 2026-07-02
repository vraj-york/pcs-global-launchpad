export type SupportRequestPayload = {
	email: string;
	subject: string;
	message: string;
	attachments?: File[];
};

export type SupportRequestResponse = {
	success: boolean;
	message: string;
	data?: unknown;
};

export type SupportFormProps = {
	readOnlyEmail?: string;
	onSuccess?: () => void;
};

export type SupportLocationState = {
	from?: string;
};

export type SupportAttachmentPreview = {
	id: string;
	file: File;
	previewUrl: string;
};
