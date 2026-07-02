import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/button";

const meta = {
	title: "UI/Button",
	component: Button,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: [
				"default",
				"outline",
				"secondary",
				"ghost",
				"destructive",
				"link",
			],
			description: "The visual style of the button",
		},
		size: {
			control: "select",
			options: [
				"default",
				"xs",
				"sm",
				"lg",
				"icon",
				"icon-xs",
				"icon-sm",
				"icon-lg",
			],
			description: "The size of the button",
		},
		disabled: {
			control: "boolean",
			description: "Whether the button is disabled",
		},
		asChild: {
			control: "boolean",
			description: "Render as child element using Slot",
		},
	},
	args: {
		children: "Button",
	},
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		variant: "default",
	},
};

export const Outline: Story = {
	args: {
		variant: "outline",
	},
};

export const Secondary: Story = {
	args: {
		variant: "secondary",
	},
};

export const Ghost: Story = {
	args: {
		variant: "ghost",
	},
};

export const Destructive: Story = {
	args: {
		variant: "destructive",
	},
};

export const Link: Story = {
	args: {
		variant: "link",
	},
};

export const Small: Story = {
	args: {
		size: "sm",
	},
};

export const ExtraSmall: Story = {
	args: {
		size: "xs",
	},
};

export const Large: Story = {
	args: {
		size: "lg",
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
	},
};
