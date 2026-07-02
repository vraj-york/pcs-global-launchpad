import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

function Toaster({ ...props }: ToasterProps) {
	return (
		<Sonner
			className="toaster group"
			toastOptions={{
				classNames: {
					toast:
						"group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:relative",
					description: "group-[.toast]:text-muted-foreground",
					actionButton:
						"group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
					cancelButton:
						"group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
					success:
						"group-[.toaster]:bg-success-bg group-[.toaster]:text-success-text group-[.toaster]:border-success",
					error:
						"group-[.toaster]:bg-error-bg group-[.toaster]:text-error-text group-[.toaster]:border-destructive",
				},
			}}
			{...props}
		/>
	);
}

export { Toaster };
