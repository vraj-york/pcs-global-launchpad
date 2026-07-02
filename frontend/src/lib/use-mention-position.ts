import { useCallback, useState } from "react";

function findAtIndexForCurrentWord(
	text: string,
	caret: number,
	triggers: string[] = ["@"],
) {
	let bestTrigger: string | null = null;
	let bestPosition = -1;

	for (const trigger of triggers) {
		let cursor = caret - 1;
		while (cursor >= 0) {
			const triggerPos = text.lastIndexOf(trigger, cursor);
			if (triggerPos === -1) break;

			const prefix = text[triggerPos - 1];
			const isBoundary = triggerPos === 0 || /\s/.test(prefix ?? "");
			const hasLineBreak = text
				.slice(triggerPos + trigger.length, caret)
				.includes("\n");

			if (isBoundary && !hasLineBreak && triggerPos > bestPosition) {
				bestPosition = triggerPos;
				bestTrigger = trigger;
				break;
			}

			cursor = triggerPos - 1;
		}
	}

	return { position: bestPosition, trigger: bestTrigger };
}

export function getCaretClientRectForIndex(
	textarea: HTMLTextAreaElement,
	index: number,
) {
	const style = window.getComputedStyle(textarea);
	const div = document.createElement("div");
	document.body.appendChild(div);

	const propertiesToCopy = [
		"boxSizing",
		"width",
		"height",
		"overflowX",
		"overflowY",
		"borderLeftWidth",
		"borderRightWidth",
		"borderTopWidth",
		"borderBottomWidth",
		"paddingTop",
		"paddingRight",
		"paddingBottom",
		"paddingLeft",
		"fontStyle",
		"fontVariant",
		"fontWeight",
		"fontStretch",
		"fontSize",
		"fontSizeAdjust",
		"lineHeight",
		"fontFamily",
		"textAlign",
		"textTransform",
		"textIndent",
		"textDecoration",
		"letterSpacing",
		"wordSpacing",
		"tabSize",
		"MozTabSize",
		"whiteSpace",
	] as const;

	const toCssProp = (prop: (typeof propertiesToCopy)[number]) => {
		if (prop.startsWith("Moz")) {
			return `-moz-${prop.slice(3)}`.replace(
				/[A-Z]/g,
				(m) => `-${m.toLowerCase()}`,
			);
		}
		return prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
	};

	div.style.position = "absolute";
	div.style.visibility = "hidden";
	div.style.whiteSpace = "pre-wrap";
	div.style.wordWrap = "break-word";
	div.style.overflow = "hidden";

	for (const prop of propertiesToCopy) {
		const cssProp = toCssProp(prop);
		const value = style.getPropertyValue(cssProp);
		if (value) {
			div.style.setProperty(cssProp, value);
		}
	}

	const rect = textarea.getBoundingClientRect();
	const borderX =
		parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
	div.style.width = `${rect.width - borderX}px`;
	div.scrollTop = textarea.scrollTop;
	div.scrollLeft = textarea.scrollLeft;

	const value = textarea.value;
	const before = value.substring(0, index);
	const after = value.substring(index);

	const esc = (s: string) =>
		s
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/\n/g, "<br/>")
			.replace(/ {2}/g, " &nbsp;");

	div.innerHTML = `${esc(before)}<span id="caret-marker">|</span>${esc(after)}`;

	const taRect = textarea.getBoundingClientRect();
	div.style.left = `${taRect.left + window.scrollX}px`;
	div.style.top = `${taRect.top + window.scrollY}px`;
	div.style.zIndex = "-1";

	const marker = div.querySelector("#caret-marker") as HTMLSpanElement | null;
	const markerRect = marker?.getBoundingClientRect();
	div.remove();

	if (!markerRect) return null;

	return {
		top: markerRect.top,
		left: markerRect.left,
		bottom: markerRect.bottom,
		right: markerRect.right,
		height: markerRect.height,
		width: markerRect.width,
	};
}

export function useMentionPosition(
	textareaRef: React.RefObject<HTMLTextAreaElement | null>,
	triggers: string[] = ["@"],
) {
	const [popupPos, setPopupPos] = useState<{
		top: number;
		left: number;
	} | null>(null);
	const [query, setQuery] = useState("");
	const [currentTrigger, setCurrentTrigger] = useState<string | null>(null);

	const update = useCallback(() => {
		const ta = textareaRef.current;
		if (!ta) return;

		const caret = ta.selectionStart ?? 0;
		const value = ta.value;
		const { position: atIndex, trigger } = findAtIndexForCurrentWord(
			value,
			caret,
			triggers,
		);

		if (atIndex === -1 || !trigger) {
			setPopupPos(null);
			setQuery("");
			setCurrentTrigger(null);
			return;
		}

		const currentWord = value.slice(atIndex + trigger.length, caret);
		if (currentWord.includes("\n")) {
			setPopupPos(null);
			setQuery("");
			setCurrentTrigger(null);
			return;
		}

		const rect = getCaretClientRectForIndex(ta, atIndex);
		if (!rect) {
			setPopupPos(null);
			setQuery("");
			setCurrentTrigger(null);
			return;
		}

		setPopupPos({
			top: rect.bottom + 4 + window.scrollY,
			left: rect.left + window.scrollX,
		});
		setQuery(currentWord);
		setCurrentTrigger(trigger);
	}, [textareaRef, triggers]);

	const clear = useCallback(() => {
		setPopupPos(null);
		setQuery("");
		setCurrentTrigger(null);
	}, []);

	return { popupPos, query, currentTrigger, update, clear };
}
