import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AddContactContent } from "@/components";
import {
	ADD_CONTACT_PAGE,
	buildUserDirectoryListingSearch,
	parseUserDirectoryTabFromSearch,
	ROUTES,
	USER_DIRECTORY_PAGE_CONTENT,
} from "@/const";
import { AppLayout } from "@/layout";

export function AddContactPage() {
	const [searchParams] = useSearchParams();
	const breadcrumbs = useMemo(() => {
		const listingSearch = buildUserDirectoryListingSearch(
			parseUserDirectoryTabFromSearch(searchParams),
		);
		const directoryPath =
			listingSearch.length > 0
				? `${ROUTES.userDirectory.root}?${listingSearch}`
				: ROUTES.userDirectory.root;
		const contactPageQuery = searchParams.toString();
		const addContactPath =
			contactPageQuery.length > 0
				? `${ROUTES.userDirectory.addContact}?${contactPageQuery}`
				: ROUTES.userDirectory.addContact;
		return [
			{
				label: USER_DIRECTORY_PAGE_CONTENT.breadcrumbsTitle,
				path: directoryPath,
			},
			{
				label: ADD_CONTACT_PAGE.breadcrumbCurrent,
				path: addContactPath,
			},
		];
	}, [searchParams]);

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<h1 className="text-heading-4 font-semibold text-text-foreground">
				{ADD_CONTACT_PAGE.title}
			</h1>
			<p className="text-small text-text-secondary">
				{ADD_CONTACT_PAGE.subtitle}
			</p>
			<AddContactContent />
		</AppLayout>
	);
}
