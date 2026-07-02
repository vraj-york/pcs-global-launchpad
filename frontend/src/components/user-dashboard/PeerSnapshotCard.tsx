import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { WagonWheel } from "@/components/common";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
	ASSESSMENT_REPORT_ADAPTARIAN,
	ASSESSMENT_REPORT_STYLE_WHEEL_LAYOUT,
	PEER_SNAPSHOT_CARD,
	PEER_SNAPSHOT_MEMBER_LIST_SCROLL_THRESHOLD,
	wagonWheelInteractivePercent,
} from "@/const";
import { useDebounce } from "@/hooks";
import { cn, initialsFromDisplayName } from "@/lib";
import { usePeerSnapshotStore } from "@/store";
import type {
	PeerSnapshotCardProps,
	PeerSnapshotCardShellProps,
	PeerSnapshotItem,
	PeerSnapshotMemberListProps,
	PeerSnapshotWheelPanelProps,
	WagonWheelSpokeId,
} from "@/types";
import {
	collectPeerHighlightSpokes,
	filterPeersByAdaptarian,
	filterPeersBySpoke,
	formatPeerDisplayName,
	formatPeerSnapshotStyleDescription,
	getPeerSnapshotVisibleSpokes,
	getStylePillBackgroundClassFromDescription,
	getWagonWheelInteractiveFrameCenter,
	getWagonWheelInteractiveLabelPadding,
	hasAdaptarianPeers,
	isAdaptarianStyleNumber,
	resolvePeerSnapshotSelection,
	styleNumberToSpokeId,
} from "@/utils";

const styleWheelLayout = ASSESSMENT_REPORT_STYLE_WHEEL_LAYOUT;

function PeerSnapshotCardShell({
	className,
	children,
}: PeerSnapshotCardShellProps) {
	return (
		<Card
			className={cn("border-0 bg-background py-0 rounded-2xl", className)}
			aria-label={PEER_SNAPSHOT_CARD.ariaLabel}
		>
			<CardContent className="flex flex-col gap-4 p-6">{children}</CardContent>
		</Card>
	);
}

function PeerSnapshotHeader({ totalCount }: { totalCount: number }) {
	return (
		<div className="flex w-full items-center justify-between gap-4">
			<h2 className="text-heading-4 font-semibold text-text-foreground">
				{PEER_SNAPSHOT_CARD.title}
			</h2>
			<p className="shrink-0 text-small font-semibold text-link">
				{PEER_SNAPSHOT_CARD.totalMembersLabel(totalCount)}
			</p>
		</div>
	);
}

function PeerSnapshotWheelPanel({
	selectedPeer,
	peerSpokes,
	selectedSpoke,
	isAdaptarianSelected,
	hasAdaptarianPeers: showAdaptarianHub,
	onSpokeSelect,
	onHubSelect,
}: PeerSnapshotWheelPanelProps) {
	const labelPadding = getWagonWheelInteractiveLabelPadding();
	const hubCenter = getWagonWheelInteractiveFrameCenter();
	const visibleSpokes = getPeerSnapshotVisibleSpokes(
		peerSpokes,
		isAdaptarianSelected,
	);
	const adaptarianHighlightSpokes = isAdaptarianSelected
		? [...ASSESSMENT_REPORT_ADAPTARIAN.wheelHighlightSpokes]
		: null;
	const spokeId = selectedPeer
		? styleNumberToSpokeId(selectedPeer.styleNumber ?? NaN)
		: null;
	const isAdaptarian =
		selectedPeer != null &&
		isAdaptarianStyleNumber(selectedPeer.styleNumber ?? NaN);
	const hasStyle =
		selectedPeer != null &&
		selectedPeer.styleNumber != null &&
		selectedPeer.styleTitle != null;
	const pillClass = hasStyle
		? isAdaptarian
			? ASSESSMENT_REPORT_ADAPTARIAN.styleIndicatorPillClass
			: getStylePillBackgroundClassFromDescription(
					selectedPeer.styleDescription ?? "",
					spokeId,
				)
		: "bg-muted";
	const styleDescriptionText = formatPeerSnapshotStyleDescription(
		selectedPeer?.styleDescription ?? null,
	);
	const dimPeerSpokes =
		(isAdaptarianSelected && adaptarianHighlightSpokes != null) ||
		(peerSpokes.length > 1 && selectedSpoke != null);

	const handleHubKeyDown = (event: React.KeyboardEvent) => {
		if (event.key !== "Enter" && event.key !== " ") {
			return;
		}
		event.preventDefault();
		onHubSelect();
	};

	return (
		<div className="flex w-full min-w-0 flex-col items-center">
			<div className="flex w-full flex-col items-center gap-4 p-6 sm:p-12">
				<div
					className={cn(
						"relative mx-auto w-full shrink-0 overflow-visible",
						styleWheelLayout.wheelMaxWidthClass,
					)}
					style={{
						paddingTop: labelPadding.top,
						paddingRight: labelPadding.right,
						paddingBottom: labelPadding.bottom,
						paddingLeft: labelPadding.left,
					}}
				>
					<WagonWheel
						showSpokes
						showLabels
						showHub
						showOuterRing
						useInteractiveLabels
						selectedSpoke={isAdaptarianSelected ? null : selectedSpoke}
						onSpokeSelect={onSpokeSelect}
						visibleSpokes={visibleSpokes}
						highlightedSpokes={adaptarianHighlightSpokes}
						highlightedSpoke={isAdaptarianSelected ? null : selectedSpoke}
						dimUnhighlightedSpokes={dimPeerSpokes}
						className="size-full"
						ariaLabel={PEER_SNAPSHOT_CARD.wheelAriaLabel}
					/>
					{showAdaptarianHub ? (
						<button
							type="button"
							className={cn(
								"absolute z-10 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full",
								"cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
								isAdaptarianSelected && "ring-2 ring-primary",
							)}
							style={{
								left: wagonWheelInteractivePercent(hubCenter.x, "width"),
								top: wagonWheelInteractivePercent(hubCenter.y, "height"),
							}}
							aria-label={PEER_SNAPSHOT_CARD.hubAriaLabel}
							aria-pressed={isAdaptarianSelected}
							tabIndex={0}
							onClick={onHubSelect}
							onKeyDown={handleHubKeyDown}
						/>
					) : null}
				</div>

				{hasStyle ? (
					<div
						className={cn(
							"flex shrink-0 items-center justify-center rounded-full px-6 py-3",
							pillClass,
						)}
						role="group"
						aria-label={PEER_SNAPSHOT_CARD.styleIndicatorAriaLabel(
							selectedPeer.styleNumber as number,
							selectedPeer.styleTitle as string,
						)}
					>
						<span className="text-center text-heading-4 font-semibold leading-heading-4 text-light-same">
							{`${selectedPeer.styleNumber} - ${selectedPeer.styleTitle}`}
						</span>
					</div>
				) : (
					<p className="text-small font-semibold text-text-secondary">
						{PEER_SNAPSHOT_CARD.noStyleTitle}
					</p>
				)}
			</div>

			<div className="w-full min-h-28 rounded-2xl bg-info-bg p-6">
				{hasStyle && styleDescriptionText ? (
					<p className="text-regular font-normal text-text-foreground">
						{styleDescriptionText}
					</p>
				) : (
					<p className="text-regular text-text-secondary">
						{PEER_SNAPSHOT_CARD.noStyleDescription}
					</p>
				)}
			</div>
		</div>
	);
}

function PeerSnapshotMemberRow({
	peer,
	isSelected,
	onSelect,
}: {
	peer: PeerSnapshotItem;
	isSelected: boolean;
	onSelect: () => void;
}) {
	const displayName = formatPeerDisplayName(peer);

	return (
		<button
			type="button"
			onClick={onSelect}
			className={cn(
				"flex h-14 w-full shrink-0 items-center gap-3 rounded-xl px-4 text-left transition-colors",
				isSelected ? "bg-card" : "hover:bg-card",
			)}
			aria-label={PEER_SNAPSHOT_CARD.selectPeerAriaLabel(displayName)}
			aria-pressed={isSelected}
			tabIndex={0}
		>
			<Avatar className="size-10 shrink-0">
				{peer.avatar ? <AvatarImage src={peer.avatar} alt="" /> : null}
				<AvatarFallback className="bg-muted text-mini font-medium text-text-secondary">
					{initialsFromDisplayName(displayName)}
				</AvatarFallback>
			</Avatar>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<p className="truncate text-small font-medium text-text-foreground">
					{displayName}
				</p>
				{peer.email ? (
					<p className="truncate text-mini text-text-secondary">{peer.email}</p>
				) : null}
			</div>
		</button>
	);
}

function PeerSnapshotMemberList({
	peers,
	selectedPeerId,
	searchQuery,
	isSearching,
	onSearchChange,
	onPeerSelect,
}: PeerSnapshotMemberListProps) {
	const shouldScroll =
		peers.length > PEER_SNAPSHOT_MEMBER_LIST_SCROLL_THRESHOLD;

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
			<div className="flex flex-col gap-2.5">
				<p className="text-small font-semibold text-text-secondary">
					{PEER_SNAPSHOT_CARD.membersFoundLabel(peers.length)}
				</p>
				<InputGroup className="min-h-9 rounded-lg border-border bg-background">
					<InputGroupAddon align="inline-start">
						<Search className="text-icon-secondary" aria-hidden />
					</InputGroupAddon>
					<InputGroupInput
						value={searchQuery}
						onChange={(event) => onSearchChange(event.target.value)}
						placeholder={PEER_SNAPSHOT_CARD.searchPlaceholder}
						aria-label={PEER_SNAPSHOT_CARD.searchAriaLabel}
					/>
				</InputGroup>
			</div>

			<div
				className={cn(
					"flex min-h-0 flex-col gap-0.5",
					shouldScroll && "max-h-145 overflow-y-auto",
				)}
				role="list"
				aria-label={PEER_SNAPSHOT_CARD.memberListAriaLabel}
			>
				{isSearching ? (
					<div className="flex flex-col gap-2">
						<Skeleton className="h-14 w-full rounded-xl" />
						<Skeleton className="h-14 w-full rounded-xl" />
						<Skeleton className="h-14 w-full rounded-xl" />
					</div>
				) : peers.length === 0 ? (
					<p className="px-4 py-6 text-center text-small text-text-secondary">
						{PEER_SNAPSHOT_CARD.noSearchResults}
					</p>
				) : (
					peers.map((peer) => (
						<PeerSnapshotMemberRow
							key={peer.id}
							peer={peer}
							isSelected={peer.id === selectedPeerId}
							onSelect={() => onPeerSelect(peer.id)}
						/>
					))
				)}
			</div>
		</div>
	);
}

function PeerSnapshotLoadingState({ className }: PeerSnapshotCardProps) {
	return (
		<PeerSnapshotCardShell className={className}>
			<Skeleton className="h-7 w-48" />
			<div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,34rem)_1fr]">
				<div className="flex flex-col gap-4">
					<Skeleton className="mx-auto aspect-square w-full max-w-sm rounded-full" />
					<Skeleton className="h-12 w-56 self-center rounded-full" />
					<Skeleton className="min-h-28 rounded-2xl" />
				</div>
				<div className="flex flex-col gap-4">
					<Skeleton className="h-5 w-36" />
					<Skeleton className="h-9 w-full rounded-lg" />
					<Skeleton className="h-14 w-full rounded-xl" />
					<Skeleton className="h-14 w-full rounded-xl" />
					<Skeleton className="h-14 w-full rounded-xl" />
				</div>
			</div>
		</PeerSnapshotCardShell>
	);
}

function PeerSnapshotEmptyState({ className }: PeerSnapshotCardProps) {
	return (
		<PeerSnapshotCardShell className={className}>
			<PeerSnapshotHeader totalCount={0} />
			<div className="flex min-h-80 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-background p-6 text-center">
				<p className="text-regular font-semibold text-text-foreground">
					{PEER_SNAPSHOT_CARD.emptyTitle}
				</p>
				<p className="max-w-md text-small text-text-secondary">
					{PEER_SNAPSHOT_CARD.emptyBody}
				</p>
			</div>
		</PeerSnapshotCardShell>
	);
}

function PeerSnapshotErrorState({
	className,
	onRetry,
}: PeerSnapshotCardProps & { onRetry: () => void }) {
	return (
		<PeerSnapshotCardShell className={className}>
			<PeerSnapshotHeader totalCount={0} />
			<div className="flex min-h-80 flex-col items-start justify-center gap-4 rounded-2xl border border-border bg-background p-6">
				<p className="text-regular text-text-secondary">
					{PEER_SNAPSHOT_CARD.loadError}
				</p>
				<Button
					type="button"
					variant="secondary"
					size="sm"
					onClick={onRetry}
					aria-label={PEER_SNAPSHOT_CARD.retryButton}
				>
					{PEER_SNAPSHOT_CARD.retryButton}
				</Button>
			</div>
		</PeerSnapshotCardShell>
	);
}

function PeerSnapshotCardBody({ className }: PeerSnapshotCardProps) {
	const {
		peers,
		totalCount,
		searchLoading,
		searchPeers,
		searchPeerSnapshot,
		clearSearchResults,
	} = usePeerSnapshotStore();
	const [searchQuery, setSearchQuery] = useState("");
	const [isAdaptarianSelected, setIsAdaptarianSelected] = useState(false);
	const [selectedSpoke, setSelectedSpoke] = useState<WagonWheelSpokeId | null>(
		() => resolvePeerSnapshotSelection(peers).spoke,
	);
	const [selectedPeerId, setSelectedPeerId] = useState<string | null>(
		() => resolvePeerSnapshotSelection(peers).peerId,
	);
	const debouncedSearch = useDebounce(searchQuery, 250);

	const fetchedPeers = searchPeers ?? peers;
	const peerSpokes = useMemo(() => collectPeerHighlightSpokes(peers), [peers]);
	const adaptarianPeersAvailable = useMemo(
		() => hasAdaptarianPeers(fetchedPeers),
		[fetchedPeers],
	);

	const applySelection = useCallback(
		(
			peerList: PeerSnapshotItem[],
			spoke: WagonWheelSpokeId | null,
			preferredPeerId?: string | null,
		) => {
			setIsAdaptarianSelected(false);

			if (spoke == null) {
				setSelectedSpoke(null);
				setSelectedPeerId(null);
				return;
			}

			const filtered = filterPeersBySpoke(peerList, spoke);
			const peerId =
				preferredPeerId && filtered.some((peer) => peer.id === preferredPeerId)
					? preferredPeerId
					: (filtered[0]?.id ?? null);

			setSelectedSpoke(spoke);
			setSelectedPeerId(peerId);
		},
		[],
	);

	const applyAdaptarianSelection = useCallback(
		(peerList: PeerSnapshotItem[], preferredPeerId?: string | null) => {
			const filtered = filterPeersByAdaptarian(peerList);
			const peerId =
				preferredPeerId && filtered.some((peer) => peer.id === preferredPeerId)
					? preferredPeerId
					: (filtered[0]?.id ?? null);

			setIsAdaptarianSelected(true);
			setSelectedSpoke(null);
			setSelectedPeerId(peerId);
		},
		[],
	);

	useEffect(() => {
		if (debouncedSearch === "") {
			clearSearchResults();
			return;
		}

		void searchPeerSnapshot(debouncedSearch);
	}, [clearSearchResults, debouncedSearch, searchPeerSnapshot]);

	useEffect(() => {
		if (searchPeers == null) {
			return;
		}

		const nextSelection = resolvePeerSnapshotSelection(searchPeers);
		setIsAdaptarianSelected(false);
		setSelectedSpoke(nextSelection.spoke);
		setSelectedPeerId(nextSelection.peerId);
	}, [searchPeers]);

	const displayedPeers = useMemo(() => {
		if (isAdaptarianSelected) {
			return filterPeersByAdaptarian(fetchedPeers);
		}
		return filterPeersBySpoke(fetchedPeers, selectedSpoke);
	}, [fetchedPeers, isAdaptarianSelected, selectedSpoke]);

	const selectedPeer = useMemo(
		() => displayedPeers.find((peer) => peer.id === selectedPeerId) ?? null,
		[displayedPeers, selectedPeerId],
	);

	const handlePeerSelect = useCallback(
		(peerId: string) => {
			const peer = fetchedPeers.find((item) => item.id === peerId);
			if (
				peer?.styleNumber != null &&
				isAdaptarianStyleNumber(peer.styleNumber)
			) {
				applyAdaptarianSelection(fetchedPeers, peerId);
				return;
			}

			const spoke = peer ? styleNumberToSpokeId(peer.styleNumber ?? NaN) : null;
			applySelection(fetchedPeers, spoke, peerId);
		},
		[applyAdaptarianSelection, applySelection, fetchedPeers],
	);

	const handleSpokeSelect = useCallback(
		(spoke: WagonWheelSpokeId) => {
			applySelection(fetchedPeers, spoke);
		},
		[applySelection, fetchedPeers],
	);

	const handleHubSelect = useCallback(() => {
		applyAdaptarianSelection(fetchedPeers);
	}, [applyAdaptarianSelection, fetchedPeers]);

	const handleSearchChange = useCallback((value: string) => {
		setSearchQuery(value);
	}, []);

	return (
		<PeerSnapshotCardShell className={className}>
			<PeerSnapshotHeader totalCount={totalCount} />
			<div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,34rem)_1fr] lg:items-start">
				<PeerSnapshotWheelPanel
					selectedPeer={selectedPeer}
					peerSpokes={peerSpokes}
					selectedSpoke={selectedSpoke}
					isAdaptarianSelected={isAdaptarianSelected}
					hasAdaptarianPeers={adaptarianPeersAvailable}
					onSpokeSelect={handleSpokeSelect}
					onHubSelect={handleHubSelect}
				/>
				<PeerSnapshotMemberList
					peers={displayedPeers}
					selectedPeerId={selectedPeerId}
					searchQuery={searchQuery}
					isSearching={searchLoading}
					onSearchChange={handleSearchChange}
					onPeerSelect={handlePeerSelect}
				/>
			</div>
		</PeerSnapshotCardShell>
	);
}

export function PeerSnapshotCard({ className }: PeerSnapshotCardProps) {
	const { phase, fetchPeerSnapshot } = usePeerSnapshotStore();

	useEffect(() => {
		void fetchPeerSnapshot();
	}, [fetchPeerSnapshot]);

	if (phase === "loading") {
		return <PeerSnapshotLoadingState className={className} />;
	}

	if (phase === "empty") {
		return <PeerSnapshotEmptyState className={className} />;
	}

	if (phase === "error") {
		return (
			<PeerSnapshotErrorState
				className={className}
				onRetry={() => {
					void fetchPeerSnapshot();
				}}
			/>
		);
	}

	return <PeerSnapshotCardBody className={className} />;
}
