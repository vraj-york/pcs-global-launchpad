export type RichTextPart = {
	text: string;
	bold: boolean;
};

export type RichTextParagraphProps = {
	parts: RichTextPart[];
	className?: string;
};
