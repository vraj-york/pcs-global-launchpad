import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { FORM_PLACEHOLDERS, PROMO_CODES_PAGE_CONTENT } from "@/const";
import type { PromoCodeFormAssignmentFieldsProps } from "@/types";

const C = PROMO_CODES_PAGE_CONTENT;

export function PromoCodeFormAssignmentFields({
	errors,
	setValue,
	watch,
	corporations,
	corpsLoading,
	activeCompaniesLoading,
	companyChoices,
	limitToAssignment,
	corporationId,
}: PromoCodeFormAssignmentFieldsProps) {
	return (
		<>
			<div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
				<div className="flex w-full flex-col gap-2 sm:min-w-0 sm:max-w-[calc(50%-8px)]">
					<Label
						htmlFor="corporation"
						className="text-small font-medium text-text-foreground"
					>
						{C.form.corporation}
					</Label>
					<Select
						disabled={corpsLoading}
						value={watch("corporationId") || "all"}
						onValueChange={(v) => {
							const newValue = v === "all" ? "" : v;
							if (newValue?.trim()) {
								setValue("companyId", "", {
									shouldValidate: false,
								});
								setValue("limitToAssignment", true, {
									shouldValidate: false,
								});
								setValue("corporationId", newValue, {
									shouldValidate: true,
								});
							} else {
								setValue("limitToAssignment", false, {
									shouldValidate: false,
								});
								setValue("companyId", "", {
									shouldValidate: false,
								});
								setValue("corporationId", "", {
									shouldValidate: true,
								});
							}
						}}
					>
						<SelectTrigger
							id="corporation"
							className="h-9 min-h-9 w-full rounded-lg border border-border bg-background py-2 pl-3 pr-2 text-sm shadow-xs outline-none focus-visible:border-border focus-visible:ring-0"
						>
							<SelectValue placeholder={C.form.allCorporations} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">{C.form.allCorporations}</SelectItem>
							{corporations.map((c) => (
								<SelectItem key={c.id} value={c.id}>
									{c.legalName}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errors.corporationId ? (
						<p className="text-mini text-destructive">
							{errors.corporationId.message}
						</p>
					) : null}
				</div>
				<div className="flex w-full flex-col gap-2 sm:min-w-0 sm:max-w-[calc(50%-8px)]">
					<Label
						htmlFor="company"
						className="text-small font-medium text-text-foreground"
					>
						{C.form.company}
					</Label>
					<Select
						disabled={activeCompaniesLoading}
						value={watch("companyId") || "all"}
						onValueChange={(v) => {
							const newValue = v === "all" ? "" : v;
							setValue("companyId", newValue, {
								shouldValidate: true,
							});
							if (newValue?.trim() || watch("corporationId")?.trim()) {
								setValue("limitToAssignment", true);
							} else if (!newValue?.trim() && !watch("corporationId")?.trim()) {
								setValue("limitToAssignment", false);
							}
						}}
					>
						<SelectTrigger
							id="company"
							className="h-9 min-h-9 w-full rounded-lg border border-border bg-background py-2 pl-3 pr-2 text-sm shadow-xs outline-none focus-visible:border-border focus-visible:ring-0"
						>
							<SelectValue placeholder={C.form.allCompanies} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">{C.form.allCompanies}</SelectItem>
							{!activeCompaniesLoading &&
							corporationId?.trim() &&
							companyChoices.length === 0 ? (
								<div className="px-2 py-3 text-center text-small text-muted-foreground">
									{FORM_PLACEHOLDERS.noActiveCompanies}
								</div>
							) : (
								companyChoices.map((co) => (
									<SelectItem key={co.id} value={co.id}>
										{co.legalName}
									</SelectItem>
								))
							)}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="flex items-start gap-3">
				<Checkbox
					id="limit-assignment"
					checked={limitToAssignment}
					onCheckedChange={(v) => {
						const on = v === true;
						setValue("limitToAssignment", on, {
							shouldValidate: true,
						});
						if (!on) {
							setValue("corporationId", "");
							setValue("companyId", "");
						}
					}}
					disabled={
						!watch("corporationId")?.trim() && !watch("companyId")?.trim()
					}
				/>
				<Label
					htmlFor="limit-assignment"
					className="cursor-pointer text-sm font-normal leading-snug text-foreground"
				>
					{C.form.limitCheckbox}
				</Label>
			</div>
		</>
	);
}
