import type { DemoPersona, DemoPersonaId } from "./demoPersonas";
import { DEMO_PERSONAS } from "./demoPersonas";

const STORAGE_KEY = "launchpad-demo-persona";

export function getDemoPersona(): DemoPersona {
	if (typeof sessionStorage === "undefined") {
		return DEMO_PERSONAS.superadmin;
	}
	const raw = sessionStorage.getItem(STORAGE_KEY) as DemoPersonaId | null;
	if (raw && raw in DEMO_PERSONAS) {
		return DEMO_PERSONAS[raw];
	}
	return DEMO_PERSONAS.superadmin;
}

export function setDemoPersona(id: DemoPersonaId): DemoPersona {
	const persona = DEMO_PERSONAS[id];
	if (typeof sessionStorage !== "undefined") {
		sessionStorage.setItem(STORAGE_KEY, id);
	}
	return persona;
}

export function clearDemoPersona(): void {
	if (typeof sessionStorage !== "undefined") {
		sessionStorage.removeItem(STORAGE_KEY);
	}
}
