/** GET /users/me/peer-mentions — autocomplete row. */
export type PeerMentionListItem = {
	id: string;
	type: "person";
	displayName: string;
	email: string | null;
	jobRole: string | null;
};

export type PeerMentionsListData = {
	peers: PeerMentionListItem[];
};

/** Structured mention sent to the chatbot with each message. */
export type ChatbotPeerMention = {
	type: "person";
	id: string;
	label: string;
};
