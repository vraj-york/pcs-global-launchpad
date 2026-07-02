import type {
	Control,
	FieldValues,
	Path,
	UseFormSetValue,
} from "react-hook-form";

export type AddressComponents = {
	addressLine?: string;
	city?: string;
	state?: string;
	country?: string;
	zip?: string;
};

export type AddressFieldMapping = {
	addressLine: string;
	city: string;
	state: string;
	country: string;
	zip: string;
};

export type AddressAutocompleteProps<TFieldValues extends FieldValues> = {
	name: Path<TFieldValues>;
	label: string;
	placeholder?: string;
	control: Control<TFieldValues>;
	setValue: UseFormSetValue<TFieldValues>;
	error?: string;
	required?: boolean;
	fieldMapping: AddressFieldMapping;
	className?: string;
};
