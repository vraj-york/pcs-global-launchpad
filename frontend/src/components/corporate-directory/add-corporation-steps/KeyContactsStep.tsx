import { yupResolver } from "@hookform/resolvers/yup";
import { Info } from "lucide-react";
import { useEffect, useMemo } from "react";
import type { Resolver } from "react-hook-form";
import { Controller, useForm, useWatch } from "react-hook-form";
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
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { ADD_NEW_CORPORATION_CONTENT, FORM_PLACEHOLDERS } from "@/const";
import { cn } from "@/lib/utils";
import { type KeyContactsSchemaType, keyContactsSchema } from "@/schemas";
import { useCorporationsStore } from "@/store";
import type { KeyContactsStepProps } from "@/types";

const defaultValues: KeyContactsSchemaType = {
	complianceOn: true,
	firstName: "",
	lastName: "",
	nickname: "",
	jobRole: "",
	email: "",
	workPhone: "",
	cellPhone: "",
};

function KeyContactsFormInner({
	onSuccess,
}: Pick<KeyContactsStepProps, "corporationDetail" | "onSuccess">) {
	const { corporationDetail, updateKeyContact } = useCorporationsStore();

	const formDefaultValues = useMemo((): KeyContactsSchemaType => {
		const contact = corporationDetail?.appKeyContacts?.find(
			(c) => c.contactType === "legal_compliance_contact",
		);
		if (!contact) {
			return { ...defaultValues, complianceOn: false };
		}
		const hasData = !!(
			contact.firstName != null ||
			contact.lastName != null ||
			contact.jobRole ||
			contact.email ||
			contact.workPhone
		);
		return {
			complianceOn: hasData,
			firstName: contact.firstName ?? "",
			lastName: contact.lastName ?? "",
			nickname: contact.nickname ?? "",
			jobRole: contact.jobRole ?? "",
			email: contact.email ?? "",
			workPhone: contact.workPhone ?? "",
			cellPhone: contact.cellPhone ?? "",
		};
	}, [corporationDetail]);

	const {
		control,
		register,
		handleSubmit,
		reset,
		setValue,
		formState: { errors },
	} = useForm<KeyContactsSchemaType>({
		resolver: yupResolver(keyContactsSchema) as Resolver<KeyContactsSchemaType>,
		mode: "onChange",
		defaultValues: formDefaultValues,
	});

	const complianceOn = useWatch({
		control,
		name: "complianceOn",
		defaultValue: true,
	});

	useEffect(() => {
		reset(formDefaultValues);
	}, [formDefaultValues, reset]);

	const complianceEmailLocked = Boolean(formDefaultValues.email?.trim());

	const onSubmit = async (values: KeyContactsSchemaType) => {
		const corpId = corporationDetail?.id;
		if (!corpId) return;

		const isOn = values.complianceOn;
		const result = await updateKeyContact(corpId, {
			complianceContact: isOn,
			firstName: isOn ? (values.firstName ?? "").trim() : "",
			lastName: isOn ? (values.lastName ?? "").trim() : "",
			nickname: isOn ? (values.nickname ?? "").trim() : "",
			jobRole: isOn ? (values.jobRole ?? "").trim() : "",
			email: isOn ? (values.email ?? "").trim() : "",
			workPhone: isOn ? (values.workPhone ?? "").trim() : "",
			cellPhone: isOn ? (values.cellPhone ?? "").trim() : "",
		});

		if (result?.ok === false) return;
		onSuccess?.();
	};

	return (
		<form
			id="key-contacts-form"
			onSubmit={handleSubmit(onSubmit)}
			className="space-y-4"
		>
			<Collapsible
				open={complianceOn}
				onOpenChange={(open) =>
					setValue("complianceOn", open, { shouldValidate: true })
				}
			>
				<Card
					className={cn(
						"border border-border bg-background !pt-0",
						!complianceOn && "!pb-0",
					)}
					size="sm"
				>
					<CardHeader
						className={cn("p-4", complianceOn && "border-b border-border")}
					>
						<CardTitle className="flex items-center gap-2 text-base font-medium text-text-secondary">
							Compliance Contact
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										type="button"
										aria-label="compliance-info"
										className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:text-text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									>
										<Info className="size-3.5 text-icon-info" />
									</button>
								</TooltipTrigger>
								<TooltipContent sideOffset={6} className="max-w-xs">
									{ADD_NEW_CORPORATION_CONTENT.referenceOnlyTooltip}
								</TooltipContent>
							</Tooltip>
						</CardTitle>
						<CardAction className="self-center shrink-0">
							<Controller
								name="complianceOn"
								control={control}
								render={({ field }) => (
									<Switch
										checked={field.value}
										onCheckedChange={field.onChange}
									/>
								)}
							/>
						</CardAction>
					</CardHeader>

					<CollapsibleContent>
						<CardContent>
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<FormInput
									id="compliance-first-name"
									label={ADD_NEW_CORPORATION_CONTENT.fields.firstName}
									placeholder={FORM_PLACEHOLDERS.firstNameMike}
									error={errors.firstName?.message}
									required={complianceOn}
									{...register("firstName")}
								/>
								<FormInput
									id="compliance-last-name"
									label={ADD_NEW_CORPORATION_CONTENT.fields.lastName}
									placeholder={FORM_PLACEHOLDERS.lastNameDavis}
									error={errors.lastName?.message}
									required={complianceOn}
									{...register("lastName")}
								/>
								<FormInput
									id="compliance-nickname"
									label={ADD_NEW_CORPORATION_CONTENT.fields.nickname}
									placeholder={FORM_PLACEHOLDERS.nicknameMd}
									error={errors.nickname?.message}
									required={false}
									{...register("nickname")}
								/>
								<FormInput
									id="compliance-jobRole"
									label={ADD_NEW_CORPORATION_CONTENT.fields.role}
									placeholder={FORM_PLACEHOLDERS.jobRoleCeo}
									error={errors.jobRole?.message}
									required={false}
									{...register("jobRole")}
								/>
								<FormInput
									id="compliance-email"
									label={ADD_NEW_CORPORATION_CONTENT.fields.email}
									placeholder={FORM_PLACEHOLDERS.emailMikeDavis}
									error={errors.email?.message}
									required={complianceOn}
									disabled={complianceEmailLocked}
									{...register("email")}
								/>
								<FormInput
									id="compliance-work-phone"
									label={ADD_NEW_CORPORATION_CONTENT.fields.workPhoneNo}
									placeholder={FORM_PLACEHOLDERS.phoneSpaced}
									error={errors.workPhone?.message}
									required={complianceOn}
									{...register("workPhone")}
								/>
								<FormInput
									id="compliance-cell-phone"
									label={ADD_NEW_CORPORATION_CONTENT.fields.cellPhoneNo}
									placeholder={FORM_PLACEHOLDERS.phoneSpaced}
									error={errors.cellPhone?.message}
									required={false}
									{...register("cellPhone")}
								/>
							</div>
						</CardContent>
					</CollapsibleContent>
				</Card>
			</Collapsible>
		</form>
	);
}

export function KeyContactsStep({
	corporationDetail,
	onSuccess,
	isLoadingDetail,
}: KeyContactsStepProps) {
	if (isLoadingDetail && !corporationDetail) {
		return (
			<p className="text-small text-muted-foreground">
				{ADD_NEW_CORPORATION_CONTENT.loadingDetail}
			</p>
		);
	}
	return (
		<KeyContactsFormInner
			key={corporationDetail?.id ?? "new"}
			corporationDetail={corporationDetail ?? undefined}
			onSuccess={onSuccess}
		/>
	);
}

export default KeyContactsStep;
