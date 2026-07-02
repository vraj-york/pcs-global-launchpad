import { ASSESSMENT_REPORT_STRESS_MANAGEMENT } from "@/const";
import type {
	DecreaseStressPrimaryCardContent,
	DecreaseStressPrimaryKey,
	DecreaseStressScoreMetrics,
	DecreaseStressSecondaryCardContent,
	DecreaseStressSecondaryKey,
	StressManagementResolvedContent,
} from "@/types";
import { readReportContentString } from "./assessmentReport.utils";

const A17 = new Set([1, 2, 3, 4, 5, 6, 7]);
const A812 = new Set([8, 9, 10, 11, 12]);

const copy = ASSESSMENT_REPORT_STRESS_MANAGEMENT;

/** Decrease-stress card selection from score breakdown metrics. */
export function selectDecreaseStressPrimaryKey(
	metrics: DecreaseStressScoreMetrics,
): DecreaseStressPrimaryKey {
	const { prblue, peblue } = metrics;
	if (prblue > 150 && peblue > 150) {
		return "ba150";
	}
	if (prblue < 150 && peblue < 150) {
		return "bb150";
	}
	return "oa150";
}

export function selectDecreaseStressSecondaryKey(
	metrics: DecreaseStressScoreMetrics,
): DecreaseStressSecondaryKey {
	const {
		professional_typical_oct: ptOct,
		personal_typical_oct: petOct,
		stressful_combo_oct: sOct,
	} = metrics;
	if (A17.has(ptOct) || (A17.has(petOct) && A812.has(sOct))) {
		return "p17812";
	}
	if (A812.has(ptOct) || (A812.has(petOct) && A17.has(sOct))) {
		return "p81217";
	}
	return "sameregion";
}

function resolveOa150Placeholders(
	text: string,
	metrics: DecreaseStressScoreMetrics,
): string {
	const aboveLabel =
		metrics.prblue > 150 ? copy.labels.professional : copy.labels.personal;
	const belowLabel =
		metrics.prblue > 150 ? copy.labels.personal : copy.labels.professional;

	let remaining = 0;
	return text.replaceAll(copy.placeholderToken, () => {
		remaining += 1;
		return remaining === 1 ? aboveLabel : belowLabel;
	});
}

function parsePrimaryCard(
	raw: string,
	key: DecreaseStressPrimaryKey,
): DecreaseStressPrimaryCardContent {
	const titleFromConst =
		copy.primaryCardTitle[key as keyof typeof copy.primaryCardTitle];
	const congratulationsMatch = raw.match(
		/^Congratulations on having (.+?)!\s*(.*)$/is,
	);

	if (congratulationsMatch && titleFromConst) {
		const body = congratulationsMatch[2]?.trim() ?? "";
		return {
			key,
			title: titleFromConst,
			lead: `${congratulationsMatch[1]}!`,
			body,
		};
	}

	if (titleFromConst) {
		const bangIndex = raw.indexOf("!");
		if (bangIndex !== -1) {
			const lead = raw
				.slice(0, bangIndex + 1)
				.replace(/^Congratulations on having\s+/i, "");
			const body = raw.slice(bangIndex + 1).trim();
			return {
				key,
				title: titleFromConst,
				lead,
				body,
			};
		}
	}

	return {
		key,
		title: titleFromConst ?? null,
		lead: null,
		body: raw,
	};
}

function parseSecondaryCard(
	raw: string,
	key: DecreaseStressSecondaryKey,
): DecreaseStressSecondaryCardContent {
	const boldPhrase = copy.secondaryBoldPhrases[key];
	const index = raw.toLowerCase().indexOf(boldPhrase.toLowerCase());

	if (index === -1) {
		return {
			key,
			boldPhrase,
			prefix: raw,
			suffix: "",
		};
	}

	return {
		key,
		boldPhrase: raw.slice(index, index + boldPhrase.length),
		prefix: raw.slice(0, index),
		suffix: raw.slice(index + boldPhrase.length),
	};
}

export function resolveDecreaseStressContent(
	content: Record<string, unknown>,
	metrics: DecreaseStressScoreMetrics,
): StressManagementResolvedContent | null {
	const primaryKey = selectDecreaseStressPrimaryKey(metrics);
	const secondaryKey = selectDecreaseStressSecondaryKey(metrics);

	let primaryRaw = readReportContentString(content, primaryKey);
	const secondaryRaw = readReportContentString(content, secondaryKey);

	if (!primaryRaw || !secondaryRaw) {
		return null;
	}

	if (primaryKey === "oa150") {
		primaryRaw = resolveOa150Placeholders(primaryRaw, metrics);
	}

	return {
		primary: parsePrimaryCard(primaryRaw, primaryKey),
		secondary: parseSecondaryCard(secondaryRaw, secondaryKey),
	};
}
