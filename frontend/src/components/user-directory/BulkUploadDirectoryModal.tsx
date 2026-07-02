import { Download, FileText, Info, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ContentModal, DataTable, FileUploadArea } from "@/components";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { DATA_TABLE_CONFIG, USER_DIRECTORY_BULK_UPLOAD } from "@/const";
import { cn } from "@/lib/utils";
import { getKeyContactBulkImportFailedColumns } from "@/tables";
import type {
	KeyContactBulkImportTableRow,
	UserDirectoryBulkUploadModalProps,
} from "@/types";

const C = USER_DIRECTORY_BULK_UPLOAD;
const BULK_FAIL_PAGE_SIZE = DATA_TABLE_CONFIG.defaultPageSize;

const bulkImportFailedColumns = getKeyContactBulkImportFailedColumns();

export function BulkUploadDirectoryModal({
	open,
	onOpenChange,
	activeTab,
	onSubmit,
	isSubmitting,
	contactBulkImportFailures = null,
	onClearContactBulkImportFailures,
}: UserDirectoryBulkUploadModalProps) {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [validationError, setValidationError] = useState<string | null>(null);

	const failures = contactBulkImportFailures ?? [];
	const isContactsTab = activeTab === "contacts";
	const hasContactImportFailures = isContactsTab && failures.length > 0;

	const failureTableRows: KeyContactBulkImportTableRow[] = useMemo(
		() =>
			failures.map((row, index) => ({
				...row,
				id: `${row.row}-${row.email}-${index}`,
			})),
		[failures],
	);

	useEffect(() => {
		if (open) {
			setSelectedFile(null);
			setValidationError(null);
		}
	}, [open]);

	const handleFileSelected = useCallback(async (file: File) => {
		setSelectedFile(file);
	}, []);

	const handleDialogOpenChange = (next: boolean) => {
		if (!next && isSubmitting) return;
		onOpenChange(next);
	};

	const handleSubmit = async () => {
		if (!selectedFile) {
			return;
		}
		await onSubmit(selectedFile);
	};

	const handleReupload = () => {
		setSelectedFile(null);
		setValidationError(null);
		onClearContactBulkImportFailures?.();
	};

	const sampleFileHref =
		activeTab === "users" ? C.sampleFileHrefUsers : C.sampleFileHrefContacts;

	return (
		<ContentModal
			open={open}
			onOpenChange={handleDialogOpenChange}
			title={C.title}
			contentClassName={cn(
				"flex max-h-dvh w-full flex-col gap-0 overflow-hidden p-0",
				hasContactImportFailures ? "max-w-4xl" : "max-w-2xl",
				"rounded-xl border border-border ring-0",
			)}
		>
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
					<div className="flex flex-col gap-4 px-6 py-6">
						{!hasContactImportFailures ? (
							<div
								className="flex flex-col gap-4 rounded-lg bg-info-bg p-4 sm:flex-row sm:items-center sm:justify-between"
								role="note"
							>
								<div className="flex min-w-0 flex-1 gap-3">
									<Info
										className="mt-0.5 size-4 shrink-0 text-icon-info"
										aria-hidden
									/>
									<div className="min-w-0">
										<p className="text-small font-semibold text-text-foreground">
											{C.noteTitle}
										</p>
										<p className="mt-0.5 text-small text-muted-foreground">
											{C.noteDescription}
										</p>
										{isContactsTab ? (
											<p className="mt-0.5 text-small text-muted-foreground">
												{C.contactTypePresetNote}
											</p>
										) : null}
									</div>
								</div>
								<Button type="button" variant="outline" asChild>
									<a
										href={sampleFileHref}
										download
										aria-label={C.downloadSample}
									>
										<Download className="size-3.5" aria-hidden />
										{C.downloadSample}
									</a>
								</Button>
							</div>
						) : null}

						{hasContactImportFailures ? (
							<div className="flex flex-col gap-3">
								<div>
									<p className="text-small font-semibold text-text-foreground">
										{C.bulkImportFailedTitle}
									</p>
									<p className="mt-0.5 text-small text-muted-foreground">
										{C.bulkImportFailedDescription}
									</p>
								</div>
								<div className="min-w-0 overflow-x-auto">
									<DataTable<KeyContactBulkImportTableRow>
										data={failureTableRows}
										columns={bulkImportFailedColumns}
										pageSize={BULK_FAIL_PAGE_SIZE}
										tableLayout="auto"
										showPagination={
											failureTableRows.length > BULK_FAIL_PAGE_SIZE
										}
									/>
								</div>
							</div>
						) : (
							<div className="flex flex-col gap-2">
								<FileUploadArea
									onUpload={handleFileSelected}
									validationOptions={{
										maxSizeBytes: C.maxFileSizeBytes,
										allowedMimeTypes: C.allowedMimeTypes,
										allowedExtensions: C.allowedExtensions,
										messageUnsupportedFormat: C.validationUnsupported,
										messageFileTooLarge: C.validationTooLarge,
									}}
									uploadLabel={C.uploadLabel}
									uploadHint={C.uploadHint}
									accept={C.fileAccept}
									onValidationError={setValidationError}
									ariaLabel={C.filePickerAriaLabel}
									className="rounded-lg"
								/>
								{validationError ? (
									<p className="text-small text-destructive" role="alert">
										{validationError}
									</p>
								) : null}
								{selectedFile ? (
									<div className="flex items-center gap-2 rounded-md bg-card-foreground px-2 py-1">
										<FileText
											className="size-5 shrink-0 text-icon-info"
											aria-hidden
										/>
										<span className="min-w-0 truncate text-small text-link">
											{selectedFile.name}
										</span>
									</div>
								) : null}
							</div>
						)}
					</div>
				</div>
			</div>

			<div className="shrink-0 border-t border-border bg-background px-6 py-5">
				<DialogFooter className="mt-0 gap-2 sm:justify-end">
					<Button
						type="button"
						variant="outline"
						onClick={() => handleDialogOpenChange(false)}
						disabled={isSubmitting}
					>
						{C.cancel}
					</Button>
					{hasContactImportFailures ? (
						<Button
							type="button"
							onClick={handleReupload}
							disabled={isSubmitting}
							icon={Upload}
							aria-label={C.reuploadButton}
						>
							{C.reuploadButton}
						</Button>
					) : (
						<Button
							type="button"
							onClick={() => void handleSubmit()}
							disabled={!selectedFile}
							isLoading={isSubmitting}
						>
							{isSubmitting ? C.submitting : C.submit}
						</Button>
					)}
				</DialogFooter>
			</div>
		</ContentModal>
	);
}
