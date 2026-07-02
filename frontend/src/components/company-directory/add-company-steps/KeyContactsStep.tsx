import { yupResolver } from "@hookform/resolvers/yup";
import { useMemo } from "react";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { FormStepSkeleton } from "@/components/common";
import { FormInput } from "@/components/common/FormInput";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { ADD_NEW_COMPANY_CONTENT, FORM_PLACEHOLDERS } from "@/const";
import { cn } from "@/lib/utils";
import {
	type CompanyKeyContactsSchemaType,
	companyKeyContactsSchema,
} from "@/schemas";
import { useCompanyDirectoryStore } from "@/store";
import type {
	AddCompanyKeyContactsStepProps,
	CompanyDetailData,
	KeyContactItem,
	KeyContactsSectionKey,
} from "@/types";

const c = ADD_NEW_COMPANY_CONTENT;
const sections = c.keyContacts.sections;
const f = c.fields;

const KEY_CONTACTS_ORDER: KeyContactsSectionKey[] = [
	"finance_billing_contact",
	"technical_it_lead",
	"implementation_lead",
	"hr_program_owner",
];

const emptySection = {
	available: false as const,
	firstName: "",
	lastName: "",
	nickname: "",
	jobRole: "",
	email: "",
	workPhone: "",
	cellPhone: "",
};

const defaultValuesEmpty: CompanyKeyContactsSchemaType = {
	finance_billing_contact: emptySection,
	technical_it_lead: emptySection,
	implementation_lead: emptySection,
	hr_program_owner: emptySection,
};

function getDefaultValuesFromKeyContacts(
	companyDetail: CompanyDetailData | null,
): CompanyKeyContactsSchemaType {
	if (!companyDetail?.keyContacts?.length) {
		return defaultValuesEmpty;
	}
	const keyContacts = companyDetail.keyContacts;
	const result = { ...defaultValuesEmpty };
	for (const key of KEY_CONTACTS_ORDER) {
		const contact = keyContacts.find((kc) => kc.contactType === key);
		if (contact) {
			result[key] = {
				available: true,
				firstName: contact.firstName ?? "",
				lastName: contact.lastName ?? "",
				nickname: contact.nickname ?? "",
				jobRole: contact.jobRole ?? "",
				email: contact.email ?? "",
				workPhone: contact.workPhone ?? "",
				cellPhone: contact.cellPhone ?? "",
			};
		} else {
			result[key] = { ...emptySection };
		}
	}
	return result;
}

function ContactFields({
	prefix,
	register,
	errors,
	enabled,
	emailLocked,
}: {
	prefix: KeyContactsSectionKey;
	register: ReturnType<
		typeof useForm<CompanyKeyContactsSchemaType>
	>["register"];
	errors: ReturnType<
		typeof useForm<CompanyKeyContactsSchemaType>
	>["formState"]["errors"];
	enabled: boolean;
	emailLocked: boolean;
}) {
	const sectionErrors = errors[prefix] as
		| Record<string, { message?: string }>
		| undefined;
	const err = (field: string) => sectionErrors?.[field]?.message;

	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
			<FormInput
				id={`${prefix}-firstName`}
				label={f.firstName}
				placeholder={FORM_PLACEHOLDERS.firstNameArthur}
				error={err("firstName")}
				required={enabled}
				{...register(`${prefix}.firstName`)}
			/>
			<FormInput
				id={`${prefix}-lastName`}
				label={f.lastName}
				placeholder={FORM_PLACEHOLDERS.lastNameHarold}
				error={err("lastName")}
				required={enabled}
				{...register(`${prefix}.lastName`)}
			/>
			<FormInput
				id={`${prefix}-nickname`}
				label={f.nickname}
				placeholder={FORM_PLACEHOLDERS.nicknameArold}
				error={err("nickname")}
				{...register(`${prefix}.nickname`)}
			/>
			<FormInput
				id={`${prefix}-jobRole`}
				label={f.jobRole}
				placeholder={FORM_PLACEHOLDERS.jobRoleAdministrator}
				error={err("jobRole")}
				required={enabled}
				{...register(`${prefix}.jobRole`)}
			/>
			<FormInput
				id={`${prefix}-email`}
				label={f.email}
				type="email"
				placeholder={FORM_PLACEHOLDERS.emailArthurHarold}
				error={err("email")}
				required={enabled}
				disabled={emailLocked}
				{...register(`${prefix}.email`)}
			/>
			<FormInput
				id={`${prefix}-workPhone`}
				label={f.workPhoneNo}
				placeholder={FORM_PLACEHOLDERS.phoneFormatted}
				error={err("workPhone")}
				required={enabled}
				{...register(`${prefix}.workPhone`)}
			/>
			<FormInput
				id={`${prefix}-cellPhone`}
				label={f.cellPhoneNo}
				placeholder={FORM_PLACEHOLDERS.phoneFormatted}
				error={err("cellPhone")}
				{...register(`${prefix}.cellPhone`)}
			/>
		</div>
	);
}

export function KeyContactsStep({
	companyId,
	onSuccess,
}: AddCompanyKeyContactsStepProps) {
	const { companyDetail, companyDetailLoading, submitKeyContacts } =
		useCompanyDirectoryStore();

	const formDefaultValues = useMemo(
		() => getDefaultValuesFromKeyContacts(companyDetail),
		[companyDetail],
	);

	const isEditLoading = Boolean(companyId && companyDetailLoading);
	if (isEditLoading) {
		return <FormStepSkeleton fieldCount={10} />;
	}

	return (
		<KeyContactsFormInner
			key={`key-contacts-${companyId ?? "new"}-${companyDetail?.id ?? ""}`}
			defaultValues={formDefaultValues}
			companyId={companyId}
			onSuccess={onSuccess}
			submitKeyContacts={submitKeyContacts}
		/>
	);
}

interface KeyContactsFormInnerProps {
	defaultValues: CompanyKeyContactsSchemaType;
	companyId: string | null | undefined;
	onSuccess?: () => void;
	submitKeyContacts: (
		companyId: string,
		body: { keyContacts: KeyContactItem[] },
	) => Promise<{ ok: true } | { ok: false; error: string }>;
}

function KeyContactsFormInner({
	defaultValues,
	companyId,
	onSuccess,
	submitKeyContacts,
}: KeyContactsFormInnerProps) {
	const {
		control,
		register,
		watch,
		setValue,
		handleSubmit,
		formState: { errors },
	} = useForm<CompanyKeyContactsSchemaType>({
		resolver: yupResolver(
			companyKeyContactsSchema,
		) as Resolver<CompanyKeyContactsSchemaType>,
		mode: "onChange",
		defaultValues,
	});

	const financeAvailable = watch("finance_billing_contact.available");
	const technicalAvailable = watch("technical_it_lead.available");
	const implementationLeadAvailable = watch("implementation_lead.available");
	const hrAvailable = watch("hr_program_owner.available");

	const sectionConfig: {
		key: KeyContactsSectionKey;
		available: boolean;
	}[] = useMemo(
		() => [
			{ key: "finance_billing_contact", available: financeAvailable },
			{ key: "technical_it_lead", available: technicalAvailable },
			{ key: "implementation_lead", available: implementationLeadAvailable },
			{ key: "hr_program_owner", available: hrAvailable },
		],
		[
			financeAvailable,
			technicalAvailable,
			implementationLeadAvailable,
			hrAvailable,
		],
	);

	const onSubmit = async (values: CompanyKeyContactsSchemaType) => {
		if (!companyId) return;
		const keyContacts: KeyContactItem[] = KEY_CONTACTS_ORDER.map((key) => {
			const section = values[key];
			return {
				contactType: key,
				available: section.available,
				firstName: section.firstName ?? "",
				lastName: section.lastName ?? "",
				nickname: section.nickname || undefined,
				jobRole: section.jobRole || undefined,
				email: section.email ?? "",
				workPhone: section.workPhone ?? "",
				cellPhone: section.cellPhone || undefined,
			};
		});
		const result = await submitKeyContacts(companyId, { keyContacts });
		if (result.ok) onSuccess?.();
	};

	return (
		<form
			id="add-company-key-contacts-form"
			onSubmit={handleSubmit(onSubmit)}
			className="space-y-4"
		>
			{sectionConfig.map(({ key, available }) => (
				<Collapsible
					key={key}
					open={available}
					onOpenChange={(open) =>
						setValue(`${key}.available`, open, { shouldValidate: true })
					}
				>
					<Card
						className={cn(
							"border border-border bg-background !pt-0",
							!available && "!pb-0",
						)}
						size="sm"
					>
						<CardHeader
							className={cn("p-4", available && "border-b border-border")}
						>
							<CardTitle className="text-base font-medium text-text-secondary">
								{sections[key]}
							</CardTitle>
							<CardAction className="self-center shrink-0">
								<Controller
									name={`${key}.available`}
									control={control}
									render={({ field }) => (
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
											aria-label={`Toggle ${sections[key]}`}
										/>
									)}
								/>
							</CardAction>
						</CardHeader>
						<CollapsibleContent>
							<CardContent>
								<ContactFields
									prefix={key}
									register={register}
									errors={errors}
									enabled={available}
									emailLocked={Boolean(defaultValues[key]?.email?.trim())}
								/>
							</CardContent>
						</CollapsibleContent>
					</Card>
				</Collapsible>
			))}
		</form>
	);
}
