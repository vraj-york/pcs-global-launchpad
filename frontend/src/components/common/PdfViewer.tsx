import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDF_VIEWER } from "@/const";
import { cn } from "@/lib/utils";
import type { PdfViewerProps } from "@/types";
import { AppLoader } from "./AppLoader";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PdfViewer({
	file,
	className,
	errorLabel = PDF_VIEWER.renderError,
}: PdfViewerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [numPages, setNumPages] = useState(0);
	const [pageWidth, setPageWidth] = useState<number | undefined>();

	useEffect(() => {
		setNumPages(0);
	}, [file]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const updateWidth = () => {
			setPageWidth(container.clientWidth);
		};

		updateWidth();

		const observer = new ResizeObserver(updateWidth);
		observer.observe(container);

		return () => observer.disconnect();
	}, []);

	const handleLoadSuccess = ({
		numPages: nextNumPages,
	}: {
		numPages: number;
	}) => {
		setNumPages(nextNumPages);
	};

	return (
		<div
			ref={containerRef}
			className={cn("size-full overflow-auto bg-background", className)}
		>
			<Document
				file={file}
				onLoadSuccess={handleLoadSuccess}
				loading={<AppLoader showMessage className="size-full py-8" />}
				error={
					<div className="flex size-full items-center justify-center px-4 py-8 text-center">
						<p className="text-small text-destructive">{errorLabel}</p>
					</div>
				}
			>
				{Array.from({ length: numPages }, (_, index) => (
					<Page
						key={`page-${index + 1}`}
						pageNumber={index + 1}
						width={pageWidth}
						renderTextLayer={false}
						renderAnnotationLayer={false}
						className="mx-auto"
					/>
				))}
			</Document>
		</div>
	);
}
