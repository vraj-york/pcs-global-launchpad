import { describe, expect, it } from "vitest";
import { ROLES_PAGE_CONTENT } from "@/const";
import { roleFormSchema } from "@/schemas/role.schema";

describe("roleFormSchema", () => {
	it("requires at least one submodule id", async () => {
		await expect(
			roleFormSchema.validate({
				name: "Manager",
				categoryId: "cat-1",
				description: "Role description",
				isPrivate: false,
				isExternal: false,
				submoduleIds: [],
			}),
		).rejects.toThrow(ROLES_PAGE_CONTENT.atLeastOneSubmodule);
	});

	it("accepts payload with submodule ids", async () => {
		const result = await roleFormSchema.validate({
			name: "Manager",
			categoryId: "cat-1",
			description: "Role description",
			isPrivate: false,
			isExternal: false,
			submoduleIds: ["sub-1"],
		});

		expect(result.submoduleIds).toEqual(["sub-1"]);
	});
});
