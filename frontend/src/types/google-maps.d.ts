// Minimal Google Maps Places API type definitions
export namespace GoogleMapsPlaces {
	// Address component from geocoding
	export interface GeocoderAddressComponent {
		long_name: string;
		short_name: string;
		types: string[];
	}

	// Autocomplete prediction result
	export interface AutocompletePrediction {
		description: string;
		place_id: string;
		structured_formatting?: {
			main_text: string;
			secondary_text: string;
		};
	}

	// Place details result
	export interface PlaceResult {
		address_components?: GeocoderAddressComponent[];
		formatted_address?: string;
		place_id?: string;
	}

	// Component restrictions for autocomplete
	export interface ComponentRestrictions {
		country?: string | string[];
	}

	// Autocomplete request
	export interface AutocompletionRequest {
		input: string;
		sessionToken?: AutocompleteSessionToken;
		componentRestrictions?: ComponentRestrictions;
	}

	// Place details request
	export interface PlaceDetailsRequest {
		placeId: string;
		fields?: string[];
		sessionToken?: AutocompleteSessionToken;
	}

	// Places service status enum
	export enum PlacesServiceStatus {
		OK = "OK",
		ZERO_RESULTS = "ZERO_RESULTS",
		INVALID_REQUEST = "INVALID_REQUEST",
		OVER_QUERY_LIMIT = "OVER_QUERY_LIMIT",
		REQUEST_DENIED = "REQUEST_DENIED",
		UNKNOWN_ERROR = "UNKNOWN_ERROR",
	}

	// Session token for billing optimization
	export class AutocompleteSessionToken {
		constructor();
	}

	// Autocomplete service
	export class AutocompleteService {
		constructor();
		getPlacePredictions(
			request: AutocompletionRequest,
			callback: (
				results: AutocompletePrediction[] | null,
				status: PlacesServiceStatus,
			) => void,
		): void;
	}

	// Places service
	export class PlacesService {
		constructor(attrContainer: HTMLDivElement);
		getDetails(
			request: PlaceDetailsRequest,
			callback: (
				result: PlaceResult | null,
				status: PlacesServiceStatus,
			) => void,
		): void;
	}
}

// Extend Window interface
declare global {
	interface Window {
		google?: {
			maps?: {
				places?: {
					AutocompleteService: typeof GoogleMapsPlaces.AutocompleteService;
					PlacesService: typeof GoogleMapsPlaces.PlacesService;
					AutocompleteSessionToken: typeof GoogleMapsPlaces.AutocompleteSessionToken;
					PlacesServiceStatus: typeof GoogleMapsPlaces.PlacesServiceStatus;
				};
			};
		};
	}
}
