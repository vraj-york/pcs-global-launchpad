export type YoutubeLinkType = "embed" | "watch" | "thumbnail";

export type YoutubeThumbnailQuality =
	| "maxresdefault"
	| "hqdefault"
	| "mqdefault";

export type BuildYoutubeUrlOptions = {
	autoplay?: boolean;
	quality?: YoutubeThumbnailQuality;
};
