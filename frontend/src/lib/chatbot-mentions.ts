import { CHATBOT_PEER_MENTION_MAX } from "@/const";
import type { ChatbotPeerMention } from "@/types";

export function mentionToken(label: string): string {
	return `@${label}`;
}

/** Keep only mentions whose @label token still appears in the composer text. */
export function syncMentionsWithText(
	text: string,
	mentions: ChatbotPeerMention[],
): ChatbotPeerMention[] {
	const tokenCounts = new Map<string, number>();
	for (const mention of mentions) {
		const token = mentionToken(mention.label);
		if (tokenCounts.has(token)) continue;

		let count = 0;
		let cursor = 0;
		while (cursor < text.length) {
			const idx = text.indexOf(token, cursor);
			if (idx === -1) break;
			const next = text[idx + token.length];
			if (!next || /\s/.test(next)) {
				count += 1;
				cursor = idx + token.length;
				continue;
			}
			cursor = idx + 1;
		}
		tokenCounts.set(token, count);
	}

	return mentions.filter((mention) => {
		const token = mentionToken(mention.label);
		const remaining = tokenCounts.get(token) ?? 0;
		if (remaining <= 0) return false;
		tokenCounts.set(token, remaining - 1);
		return true;
	});
}

export function canAddMention(mentions: ChatbotPeerMention[]): boolean {
	return mentions.length < CHATBOT_PEER_MENTION_MAX;
}

export function initialsFromDisplayName(displayName: string): string {
	const parts = displayName.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}
