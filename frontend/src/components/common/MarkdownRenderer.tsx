/**
 * Markdown renderer powered by Streamdown
 */

import { Streamdown } from "streamdown";
import type { MarkdownRendererProps } from "@/types";

export function MarkdownRenderer({
	content,
	isAnimating = false,
}: MarkdownRendererProps) {
	return (
		<div className="markdown-content text-small leading-small">
			<Streamdown
				mode={isAnimating ? "streaming" : "static"}
				isAnimating={isAnimating}
			>
				{content}
			</Streamdown>
		</div>
	);
}
