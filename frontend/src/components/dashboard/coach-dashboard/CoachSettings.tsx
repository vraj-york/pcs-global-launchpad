// Figma layer: "Settings - Profile Overview" — node 4:21839
/*
 * SEMANTIC ANALYSIS
 * Coach Settings page (preview). Route: /coach-settings (NEW).
 * - Tab bar: Profile Overview / Availability / Calendar Sync / Security / Privacy & Data
 *   → useState(activeTab); only Profile Overview is built in this node.
 * - Profile Overview:
 *   - Avatar column (reuses SettingsProfileAvatar): Change Avatar + Remove
 *   - "Personal Details" card: First/Last Name + Email locked (managed by org),
 *     Nickname, Work Phone (required), Cell Phone, Time Zone (Select)
 *   - "Coaching Details" card: Professional Title, Years of Experience, Bio (Textarea)
 *   - Footer: Cancel (outline) + Save & Update (primary), enabled when dirty
 */
import { Lock } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FormInput } from "@/components/common";
import {
	SettingsPrivacyDataTab,
	SettingsProfileAvatar,
} from "@/components/settings";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { COACH_SETTINGS_CONTENT, MORE_FILTERS_TIMEZONE_OPTIONS } from "@/const";
import { cn } from "@/lib/utils";
import { CoachAvailabilityTab } from "./CoachAvailabilityTab";
import { CoachCalendarSyncTab } from "./CoachCalendarSyncTab";
import { CoachSecurityTab } from "./CoachSecurityTab";

const C = COACH_SETTINGS_CONTENT;
const PD = C.personalDetails;
const CD = C.coachingDetails;

const lockedFieldRightElement = (
	<span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">
		<Lock className="size-4" aria-hidden />
	</span>
);

interface CoachProfileFormValues {
	nickname: string;
	workPhone: string;
	cellPhone: string;
	timezone: string;
	professionalTitle: string;
	yearsOfExperience: string;
	bio: string;
}

function buildInitialValues(): CoachProfileFormValues {
	return {
		nickname: C.profile.nickname,
		workPhone: C.profile.workPhone,
		cellPhone: C.profile.cellPhone,
		timezone: C.profile.timezone,
		professionalTitle: C.profile.professionalTitle,
		yearsOfExperience: C.profile.yearsOfExperience,
		bio: C.profile.bio,
	};
}

function ProfileOverviewTab() {
	const initialValues = useMemo(buildInitialValues, []);
	const [values, setValues] = useState<CoachProfileFormValues>(initialValues);
	const [workPhoneError, setWorkPhoneError] = useState<string | undefined>(
		undefined,
	);
	const [saving, setSaving] = useState(false);

	const isDirty = useMemo(
		() =>
			(Object.keys(values) as (keyof CoachProfileFormValues)[]).some(
				(key) => values[key] !== initialValues[key],
			),
		[values, initialValues],
	);

	const update =
		(key: keyof CoachProfileFormValues) =>
		(
			event: React.ChangeEvent<
				HTMLInputElement | HTMLTextAreaElement
			>,
		) => {
			setValues((prev) => ({ ...prev, [key]: event.target.value }));
		};

	const handleCancel = () => {
		setValues(initialValues);
		setWorkPhoneError(undefined);
	};

	const handleSave = () => {
		if (!values.workPhone.trim()) {
			setWorkPhoneError(C.requiredError);
			return;
		}
		setWorkPhoneError(undefined);
		setSaving(true);
		// Placeholder async action until the coach profile API is wired up.
		setTimeout(() => {
			setSaving(false);
			toast.success("Profile updated successfully.");
		}, 1000);
	};

	return (
		<div className="w-full rounded-xl border border-border bg-background">
			<div className="flex flex-col flex-wrap items-start gap-6 p-6 lg:flex-row">
				<SettingsProfileAvatar
					avatarUrl={C.profile.avatarUrl}
					firstName={C.profile.firstName}
					lastName={C.profile.lastName}
					isUploading={false}
					isRemoving={false}
					onUpload={async () => {}}
					onRemove={async () => {}}
					onValidationError={(message) => toast.error(message)}
				/>

				<div className="flex min-w-0 flex-1 flex-col gap-4">
					{/* Personal Details */}
					<div className="w-full rounded-xl border border-border bg-background">
						<div className="flex h-14 items-center border-b border-border px-4">
							<p className="text-base font-medium text-text-secondary">
								{PD.title}
							</p>
						</div>
						<div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
							<FormInput
								id="coach-settings-first-name"
								label={PD.firstName}
								tooltip={C.managedByOrgTooltip}
								readOnly
								disabled
								value={C.profile.firstName}
								className="bg-card text-muted-foreground"
								rightElement={lockedFieldRightElement}
								aria-readonly
							/>
							<FormInput
								id="coach-settings-last-name"
								label={PD.lastName}
								tooltip={C.managedByOrgTooltip}
								readOnly
								disabled
								value={C.profile.lastName}
								className="bg-card text-muted-foreground"
								rightElement={lockedFieldRightElement}
								aria-readonly
							/>
							<FormInput
								id="coach-settings-nickname"
								label={PD.nickname}
								autoComplete="nickname"
								placeholder={PD.nicknamePlaceholder}
								value={values.nickname}
								onChange={update("nickname")}
							/>
							<FormInput
								id="coach-settings-email"
								label={PD.email}
								tooltip={C.managedByOrgTooltip}
								readOnly
								disabled
								value={C.profile.email}
								className="bg-card text-muted-foreground"
								rightElement={lockedFieldRightElement}
								aria-readonly
							/>
							<FormInput
								id="coach-settings-work-phone"
								label={PD.workPhone}
								required
								type="tel"
								autoComplete="tel"
								value={values.workPhone}
								onChange={update("workPhone")}
								error={workPhoneError}
							/>
							<FormInput
								id="coach-settings-cell-phone"
								label={PD.cellPhone}
								type="tel"
								autoComplete="tel"
								value={values.cellPhone}
								onChange={update("cellPhone")}
							/>
							<Field>
								<FieldLabel className="text-small font-medium text-text-foreground">
									{PD.timezone}
								</FieldLabel>
								<Select
									value={values.timezone || undefined}
									onValueChange={(next) =>
										setValues((prev) => ({ ...prev, timezone: next }))
									}
								>
									<SelectTrigger
										id="coach-settings-timezone"
										className="h-10 w-full"
									>
										<SelectValue placeholder={PD.timezonePlaceholder} />
									</SelectTrigger>
									<SelectContent>
										{MORE_FILTERS_TIMEZONE_OPTIONS.map((o) => (
											<SelectItem key={o.value} value={o.value}>
												{o.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
						</div>
					</div>

					{/* Coaching Details */}
					<div className="w-full rounded-xl border border-border bg-background">
						<div className="flex h-14 items-center border-b border-border px-4">
							<p className="text-base font-medium text-text-secondary">
								{CD.title}
							</p>
						</div>
						<div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
							<FormInput
								id="coach-settings-professional-title"
								label={CD.professionalTitle}
								placeholder={CD.professionalTitlePlaceholder}
								value={values.professionalTitle}
								onChange={update("professionalTitle")}
							/>
							<FormInput
								id="coach-settings-years-experience"
								label={CD.yearsOfExperience}
								type="number"
								inputMode="numeric"
								placeholder={CD.yearsOfExperiencePlaceholder}
								value={values.yearsOfExperience}
								onChange={update("yearsOfExperience")}
							/>
							<div className="space-y-2 md:col-span-2">
								<Label
									htmlFor="coach-settings-bio"
									className="text-small font-medium text-text-foreground"
								>
									{CD.bio}
								</Label>
								<Textarea
									id="coach-settings-bio"
									value={values.bio}
									onChange={update("bio")}
									placeholder={CD.bioPlaceholder}
									className="min-h-[76px] resize-y rounded-lg border-border text-small text-text-foreground shadow-none"
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-6 py-5">
				<Button
					type="button"
					variant="outline"
					disabled={saving || !isDirty}
					onClick={handleCancel}
				>
					{C.cancel}
				</Button>
				<Button
					type="button"
					disabled={saving || !isDirty}
					onClick={handleSave}
				>
					{saving ? C.saving : C.save}
				</Button>
			</div>
		</div>
	);
}

export function CoachSettings() {
	const [activeTab, setActiveTab] =
		useState<(typeof C.tabs)[number]["id"]>("profile-overview");

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-6">
			<div className="flex flex-col gap-2 pt-4">
				<h1 className="text-heading-4 font-semibold text-text-foreground">
					{C.title}
				</h1>
				<p className="text-small text-text-secondary">{C.subtitle}</p>
			</div>

			<div className="flex min-h-11 items-center rounded-xl bg-card-foreground p-1">
				<nav
					className="flex flex-wrap items-center gap-4"
					aria-label="Coach settings tabs"
				>
					{C.tabs.map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							className={cn(
								"inline-flex h-9 min-h-9 cursor-pointer items-center justify-center rounded-lg border-0 px-2.5 py-1.5 text-small font-semibold transition-colors",
								activeTab === tab.id
									? "bg-background text-brand-primary"
									: "bg-transparent text-text-secondary hover:text-text-foreground",
							)}
							aria-current={activeTab === tab.id ? "page" : undefined}
							tabIndex={0}
						>
							{tab.label}
						</button>
					))}
				</nav>
			</div>

			{activeTab === "profile-overview" ? (
				<ProfileOverviewTab />
			) : activeTab === "availability" ? (
				<CoachAvailabilityTab />
			) : activeTab === "calendar-sync" ? (
				<CoachCalendarSyncTab />
			) : activeTab === "security" ? (
				<CoachSecurityTab />
			) : (
				<SettingsPrivacyDataTab />
			)}
		</div>
	);
}
