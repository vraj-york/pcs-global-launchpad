import { MapPin } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FieldValues, Path, PathValue } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AddressAutocompleteProps, AddressComponents } from "@/types";
import type { GoogleMapsPlaces } from "@/types/google-maps";

export function AddressAutocomplete<TFieldValues extends FieldValues>({
	name,
	label,
	placeholder,
	control,
	setValue,
	error,
	required,
	fieldMapping,
	className,
}: AddressAutocompleteProps<TFieldValues>) {
	const autocompleteServiceRef =
		useRef<GoogleMapsPlaces.AutocompleteService | null>(null);
	const placesServiceRef = useRef<GoogleMapsPlaces.PlacesService | null>(null);
	const sessionTokenRef =
		useRef<GoogleMapsPlaces.AutocompleteSessionToken | null>(null);

	const [predictions, setPredictions] = useState<
		GoogleMapsPlaces.AutocompletePrediction[]
	>([]);
	const [showDropdown, setShowDropdown] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const dropdownRef = useRef<HTMLUListElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Load Google Places API script dynamically
	useEffect(() => {
		const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

		if (!apiKey) {
			console.error("API key is not set");
			return;
		}

		const initGoogleServices = () => {
			const googleMaps = window.google?.maps?.places;
			if (!googleMaps) return;

			autocompleteServiceRef.current = new googleMaps.AutocompleteService();

			const mapDiv = document.createElement("div");
			placesServiceRef.current = new googleMaps.PlacesService(mapDiv);

			sessionTokenRef.current = new googleMaps.AutocompleteSessionToken();
		};

		if (window.google?.maps?.places) {
			initGoogleServices();
			return;
		}

		const existingScript = document.querySelector(
			'script[src*="maps.googleapis.com"]',
		);

		if (!existingScript) {
			const script = document.createElement("script");
			script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
			script.async = true;
			script.defer = true;
			script.onload = initGoogleServices;
			script.onerror = () => {
				console.error("Failed to load Google Maps API");
			};
			document.head.appendChild(script);
		} else {
			(existingScript as HTMLScriptElement).addEventListener(
				"load",
				initGoogleServices,
			);
		}
	}, []);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node) &&
				inputRef.current &&
				!inputRef.current.contains(event.target as Node)
			) {
				setShowDropdown(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Fetch place predictions
	const fetchPredictions = useCallback((input: string) => {
		if (!autocompleteServiceRef.current || !input.trim()) {
			setPredictions([]);
			setShowDropdown(false);
			return;
		}

		setIsLoading(true);

		autocompleteServiceRef.current.getPlacePredictions(
			{
				input: input.trim(),
				sessionToken: sessionTokenRef.current ?? undefined,
				componentRestrictions: { country: "us" },
			},
			(
				results: GoogleMapsPlaces.AutocompletePrediction[] | null,
				status: GoogleMapsPlaces.PlacesServiceStatus,
			) => {
				setIsLoading(false);

				if (status === "OK" && results) {
					setPredictions(results);
					setShowDropdown(true);
				} else {
					setPredictions([]);
					setShowDropdown(true);
				}
			},
		);
	}, []);

	// Parse address components from Google Place details
	const parseAddressComponents = useCallback(
		(
			components: GoogleMapsPlaces.GeocoderAddressComponent[],
		): AddressComponents & { addressLine: string } => {
			const getComponent = (type: string, useShort = false): string => {
				const component = components.find((comp) => comp.types.includes(type));
				return component
					? useShort
						? component.short_name
						: component.long_name
					: "";
			};

			// Build street address from street number and route
			const streetNumber = getComponent("street_number");
			const route = getComponent("route");
			const subpremise = getComponent("subpremise");

			let streetAddress = "";
			if (streetNumber && route) {
				streetAddress = `${streetNumber} ${route}`;
				if (subpremise) {
					streetAddress = `${streetAddress}, ${subpremise}`;
				}
			} else if (route) {
				streetAddress = route;
			}

			return {
				addressLine: streetAddress,
				city:
					getComponent("locality") ||
					getComponent("sublocality") ||
					getComponent("administrative_area_level_2"),
				state: getComponent("administrative_area_level_1", true),
				country: getComponent("country"),
				zip: getComponent("postal_code"),
			};
		},
		[],
	);

	// Handle place selection
	const handlePlaceSelect = useCallback(
		(prediction: GoogleMapsPlaces.AutocompletePrediction) => {
			if (!prediction?.place_id || !placesServiceRef.current) return;

			setIsLoading(true);

			placesServiceRef.current.getDetails(
				{
					placeId: prediction.place_id,
					fields: ["address_components", "formatted_address"],
					sessionToken: sessionTokenRef.current ?? undefined,
				},
				(
					placeDetails: GoogleMapsPlaces.PlaceResult | null,
					status: GoogleMapsPlaces.PlacesServiceStatus,
				) => {
					setIsLoading(false);

					if (status === "OK" && placeDetails) {
						const addressComponents = parseAddressComponents(
							placeDetails.address_components || [],
						);

						const addressLinePath =
							fieldMapping.addressLine as Path<TFieldValues>;
						setValue(
							addressLinePath,
							addressComponents.addressLine as PathValue<
								TFieldValues,
								typeof addressLinePath
							>,
							{
								shouldValidate: true,
								shouldDirty: true,
							},
						);

						if (addressComponents.city) {
							const cityPath = fieldMapping.city as Path<TFieldValues>;
							setValue(
								cityPath,
								addressComponents.city as PathValue<
									TFieldValues,
									typeof cityPath
								>,
								{
									shouldValidate: true,
									shouldDirty: true,
								},
							);
						}

						if (addressComponents.state) {
							const statePath = fieldMapping.state as Path<TFieldValues>;
							setValue(
								statePath,
								addressComponents.state as PathValue<
									TFieldValues,
									typeof statePath
								>,
								{
									shouldValidate: true,
									shouldDirty: true,
								},
							);
						}

						if (addressComponents.country) {
							const countryPath = fieldMapping.country as Path<TFieldValues>;
							setValue(
								countryPath,
								addressComponents.country as PathValue<
									TFieldValues,
									typeof countryPath
								>,
								{
									shouldValidate: true,
									shouldDirty: true,
								},
							);
						}

						if (addressComponents.zip) {
							const zipPath = fieldMapping.zip as Path<TFieldValues>;
							setValue(
								zipPath,
								addressComponents.zip as PathValue<
									TFieldValues,
									typeof zipPath
								>,
								{
									shouldValidate: true,
									shouldDirty: true,
								},
							);
						}

						// Reset session token after successful selection
						const googlePlaces = window.google?.maps?.places;
						if (googlePlaces) {
							sessionTokenRef.current =
								new googlePlaces.AutocompleteSessionToken();
						}

						setPredictions([]);
						setShowDropdown(false);
					}
				},
			);
		},
		[setValue, fieldMapping, parseAddressComponents],
	);

	return (
		<div className={cn("space-y-2", className)}>
			<Label
				htmlFor={name}
				className="text-small font-medium text-text-foreground"
			>
				{required && <span className="text-destructive">*</span>} {label}
			</Label>
			<div className="relative">
				<Controller
					name={name}
					control={control}
					render={({ field }) => (
						<Input
							{...field}
							ref={(e) => {
								field.ref(e);
								inputRef.current = e;
							}}
							id={name}
							type="text"
							placeholder={placeholder}
							autoComplete="off"
							className={cn("h-10", error && "border-destructive")}
							aria-invalid={!!error}
							onChange={(e) => {
								field.onChange(e);
								fetchPredictions(e.target.value);
							}}
							onFocus={(e) => {
								if (e.target.value.trim()) {
									fetchPredictions(e.target.value);
								}
							}}
						/>
					)}
				/>

				{showDropdown && (
					<ul
						ref={dropdownRef}
						className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg max-h-60 overflow-y-auto"
					>
						{isLoading ? (
							<li className="flex items-center gap-2 px-4 py-3 text-small text-muted-foreground">
								Loading suggestions...
							</li>
						) : predictions.length > 0 ? (
							predictions.map((prediction) => (
								<li
									key={prediction.place_id}
									className="flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-accent transition-colors border-b last:border-b-0 border-border"
									onClick={() => {
										handlePlaceSelect(prediction);
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											handlePlaceSelect(prediction);
										}
									}}
								>
									<MapPin className="size-4 text-muted-foreground flex-shrink-0" />
									<span className="text-small text-text-foreground">
										{prediction.description}
									</span>
								</li>
							))
						) : (
							<li className="flex items-center gap-2 px-4 py-3 text-small text-muted-foreground">
								No results found
							</li>
						)}
					</ul>
				)}
			</div>
			{error && <p className="text-mini text-destructive">{error}</p>}
		</div>
	);
}
