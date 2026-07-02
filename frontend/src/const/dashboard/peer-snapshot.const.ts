export const PEER_SNAPSHOT_API_INVALID_RESPONSE_MESSAGE =
	"Invalid peer snapshot response";

export const PEER_SNAPSHOT_MEMBER_LIST_SCROLL_THRESHOLD = 10;

export const PEER_SNAPSHOT_CARD = {
	title: "Peers Snapshot",
	ariaLabel: "Peers snapshot",
	totalMembersLabel: (count: number) => `Total ${count} members`,
	membersFoundLabel: (count: number) => `${count} members found`,
	searchPlaceholder: "Search by member name",
	searchAriaLabel: "Search peers by member name",
	memberListAriaLabel: "Company peers",
	selectPeerAriaLabel: (name: string) => `View ${name} style snapshot`,
	hubAriaLabel: "View Adaptarian peers on the color wheel",
	wheelAriaLabel: "BSP color wheel showing peer behavioral styles",
	styleIndicatorAriaLabel: (styleNumber: number, title: string) =>
		`Style ${styleNumber} ${title}`,
	noStyleTitle: "Style unavailable",
	noStyleDescription:
		"This peer has not completed a behavioral assessment yet.",
	loadError: "Could not load peers snapshot. Try again.",
	retryButton: "Try again",
	emptyTitle: "No peers yet",
	emptyBody: "When teammates join your company, their styles will appear here.",
	noSearchResults: "No members match your search.",
} as const;
