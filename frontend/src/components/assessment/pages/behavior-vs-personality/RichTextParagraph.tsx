import type { RichTextParagraphProps } from "@/types";

export function RichTextParagraph({
	parts,
	className,
}: RichTextParagraphProps) {
	if (parts.length === 0) {
		return null;
	}

	return (
		<p className={className}>
			{parts.map((part, index) =>
				part.bold ? (
					<span
						key={`rich-text-part-${index}`}
						className="font-semibold text-foreground"
					>
						{part.text}
					</span>
				) : (
					<span key={`rich-text-part-${index}`}>{part.text}</span>
				),
			)}
		</p>
	);
}
