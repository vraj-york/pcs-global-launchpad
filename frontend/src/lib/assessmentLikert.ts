/**
 * Likert rules for BSP assessment: four statements per question; exactly one
 * row scores 1 and one row 10; the other two are in 2–9. Only 1 and 10 are
 * blocked on other rows when already taken. Duplicated 2–9 scores are not
 * disabled; the UI shows a validation message instead. All four values must
 * be unique when valid.
 */
export const LIKERT_MIN = 1;
export const LIKERT_MAX = 10;
export const LIKERT_SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** True when `value` (1 or 10 only) is already chosen on a different line. */
/** True when at least two filled rows share the same score (incomplete or complete). */
export function hasDuplicateSelectionAmongFilled(
	selections: readonly (number | null)[],
): boolean {
	return getDuplicateFilledValues(selections).size > 0;
}

/** Scores selected on two or more rows (among filled rows only). */
export function getDuplicateFilledValues(
	selections: readonly (number | null)[],
): Set<number> {
	const counts = new Map<number, number>();
	for (const s of selections) {
		if (s === null) {
			continue;
		}
		counts.set(s, (counts.get(s) ?? 0) + 1);
	}
	const dupes = new Set<number>();
	for (const [value, count] of counts) {
		if (count > 1) {
			dupes.add(value);
		}
	}
	return dupes;
}

export function isLikertRowScoreDisabled(
	selections: readonly (number | null)[],
	rowIndex: number,
	value: number,
): boolean {
	if (value !== 1 && value !== 10) {
		return false;
	}
	return selections.some(
		(sel, i) => i !== rowIndex && sel !== null && sel === value,
	);
}

export function isValidLikertSelection(
	selections: readonly (number | null)[],
): boolean {
	if (selections.length !== 4 || selections.some((s) => s === null)) {
		return false;
	}
	const values = selections as number[];
	if (new Set(values).size !== values.length) {
		return false;
	}
	const count1 = values.filter((v) => v === 1).length;
	const count10 = values.filter((v) => v === 10).length;
	if (count1 !== 1 || count10 !== 1) {
		return false;
	}
	const middle = values.filter((v) => v !== 1 && v !== 10);
	if (middle.length !== 2 || !middle.every((n) => n >= 2 && n <= 9)) {
		return false;
	}
	return true;
}
