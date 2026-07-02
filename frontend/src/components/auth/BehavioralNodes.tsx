import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import {
	BEHAVIORAL_NODES_FILL_ALPHA,
	BEHAVIORAL_NODES_GLOW_ALPHA,
	BEHAVIORAL_NODES_QUADRANT_BG_CLASSES,
} from "@/const";
import type {
	BehavioralNode,
	BehavioralNodesPalette,
	QuadrantPaint,
} from "@/types";

/**
 * Reads colors directly from hidden DOM elements.
 *
 * Why this approach?
 * - Keeps canvas colors synced with Tailwind theme tokens
 * - Avoids hardcoding colors in JS
 * - Automatically supports dark/light theme switching
 */
function readPalette(root: HTMLElement | null): BehavioralNodesPalette | null {
	if (!root) return null;

	const bgEls = root.querySelectorAll<HTMLElement>("[data-q-bg]");
	const lightEl = root.querySelector<HTMLElement>("[data-light]");

	if (bgEls.length !== 4 || !lightEl) return null;

	const quadrants: QuadrantPaint[] = [];

	for (let i = 0; i < 4; i++) {
		const color = getComputedStyle(bgEls[i]).backgroundColor;

		if (!color || color === "transparent") return null;

		quadrants.push({
			color,

			/**
			 * Controls node visibility/intensity.
			 * Higher value = more solid nodes
			 */
			fillA: BEHAVIORAL_NODES_FILL_ALPHA[i],

			/**
			 * Controls glow visibility when hovering nearby.
			 * Higher value = stronger glow effect
			 */
			glowA: BEHAVIORAL_NODES_GLOW_ALPHA[i],
		});
	}

	const lightColor = getComputedStyle(lightEl).backgroundColor;

	if (!lightColor || lightColor === "transparent") return null;

	return { quadrants, lightColor };
}

export function BehavioralNodes() {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	/**
	 * Hidden div used only for reading Tailwind-generated colors.
	 */
	const swatchRef = useRef<HTMLDivElement>(null);

	/**
	 * Stores current mouse position.
	 * Default is off-screen so no hover effect is active initially.
	 */
	const mouseRef = useRef({ x: -1000, y: -1000 });

	/**
	 * Mutable animation data.
	 *
	 * Using ref instead of state avoids React re-renders
	 * on every animation frame.
	 */
	const nodesRef = useRef<BehavioralNode[]>([]);

	/**
	 * requestAnimationFrame id
	 * Used for cleanup on unmount.
	 */
	const animRef = useRef(0);

	/**
	 * Stores previous canvas size.
	 *
	 * Helps detect major resizes so nodes can be regenerated
	 * instead of stretched awkwardly.
	 */
	const prevSizeRef = useRef({ w: 0, h: 0 });

	/**
	 * Cached color palette.
	 */
	const paletteRef = useRef<BehavioralNodesPalette | null>(null);

	/**
	 * Reactive canvas dimensions.
	 */
	const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

	/**
	 * Generates initial node positions + movement properties.
	 */
	const initNodes = useCallback((w: number, h: number) => {
		if (!paletteRef.current || w <= 0 || h <= 0) return;

		const nodes: BehavioralNode[] = [];

		/**
		 * TOTAL NODE COUNT
		 *
		 * Increase:
		 * - denser network
		 * - more CPU usage
		 *
		 * Decrease:
		 * - cleaner look
		 * - better performance
		 */
		for (let i = 0; i < 60; i++) {
			/**
			 * Each node belongs to 1 of 4 color quadrants.
			 */
			const quadrant = i % 4;

			/**
			 * Base spawn positions per quadrant.
			 *
			 * Change these values to move clusters around.
			 */
			const cx = quadrant < 2 ? w * 0.25 : w * 0.5;
			const cy = quadrant % 2 === 0 ? h * 0.25 : h * 0.7;

			/**
			 * Controls how far nodes spread from cluster center.
			 *
			 * Larger value:
			 * - wider clusters
			 *
			 * Smaller value:
			 * - tighter groups
			 */
			const spread = Math.min(w, h) * 0.4;

			/**
			 * Base node size.
			 *
			 * Increase:
			 * - larger particles
			 *
			 * Decrease:
			 * - more subtle effect
			 */
			const baseRadius = 5 + Math.random() * 3;

			nodes.push({
				x: cx + (Math.random() - 0.5) * spread,
				y: cy + (Math.random() - 0.5) * spread,

				/**
				 * Node movement speed.
				 *
				 * Increase:
				 * - more energetic motion
				 *
				 * Decrease:
				 * - calmer floating effect
				 */
				vx: (Math.random() - 0.5) * 0.4,
				vy: (Math.random() - 0.5) * 0.4,

				radius: baseRadius,
				baseRadius,
				quadrant,
			});
		}

		nodesRef.current = nodes;
	}, []);

	/**
	 * Initializes nodes once palette + dimensions are ready.
	 */
	const syncNodesIfReady = useCallback(() => {
		const canvas = canvasRef.current;
		const parent = canvas?.parentElement;

		if (!parent || !paletteRef.current) return;

		const { width, height } = parent.getBoundingClientRect();

		if (width <= 0 || height <= 0) return;

		initNodes(width, height);

		prevSizeRef.current = { w: width, h: height };
	}, [initNodes]);

	/**
	 * Read theme colors immediately after layout.
	 */
	useLayoutEffect(() => {
		const p = readPalette(swatchRef.current);

		if (p) paletteRef.current = p;

		syncNodesIfReady();
	}, [syncNodesIfReady]);

	/**
	 * Rebuild nodes when canvas dimensions change.
	 */
	useEffect(() => {
		const { w, h } = dimensions;

		if (w === 0 || h === 0 || !paletteRef.current) return;

		initNodes(w, h);

		prevSizeRef.current = { w, h };
	}, [dimensions.w, dimensions.h, initNodes]);

	/**
	 * Handles canvas resizing + DPR scaling.
	 */
	useEffect(() => {
		const canvas = canvasRef.current;

		if (!canvas) return;

		const parent = canvas.parentElement;

		if (!parent) return;

		const resize = () => {
			const rect = parent.getBoundingClientRect();

			/**
			 * Device pixel ratio scaling.
			 *
			 * Makes canvas sharp on Retina displays.
			 */
			const dpr = window.devicePixelRatio || 1;

			canvas.width = rect.width * dpr;
			canvas.height = rect.height * dpr;

			canvas.style.width = `${rect.width}px`;
			canvas.style.height = `${rect.height}px`;

			const ctx = canvas.getContext("2d");

			if (ctx) ctx.scale(dpr, dpr);

			setDimensions({
				w: rect.width,
				h: rect.height,
			});

			const { w: pw, h: ph } = prevSizeRef.current;

			/**
			 * If resize is large enough,
			 * regenerate nodes completely.
			 */
			const jump =
				nodesRef.current.length === 0 ||
				Math.abs(rect.width - pw) > 50 ||
				Math.abs(rect.height - ph) > 50;

			if (jump && paletteRef.current) {
				initNodes(rect.width, rect.height);

				prevSizeRef.current = {
					w: rect.width,
					h: rect.height,
				};
			}
		};

		resize();

		window.addEventListener("resize", resize);

		return () => window.removeEventListener("resize", resize);
	}, [initNodes]);

	/**
	 * Main animation loop.
	 */
	useEffect(() => {
		const canvas = canvasRef.current;

		if (!canvas || dimensions.w === 0) return;

		const ctx = canvas.getContext("2d");

		if (!ctx) return;

		const { w, h } = dimensions;

		/**
		 * Maximum distance for node connections.
		 *
		 * Increase:
		 * - more connecting lines
		 *
		 * Decrease:
		 * - fewer connections
		 */
		const connectionDist = Math.min(w, h) * 0.18;

		/**
		 * Mouse interaction radius.
		 *
		 * Increase:
		 * - hover affects more nodes
		 *
		 * Decrease:
		 * - more precise interaction
		 */
		const mouseDist = 70;

		const animate = () => {
			/**
			 * Clears previous frame.
			 */
			ctx.clearRect(0, 0, w, h);

			const palette = paletteRef.current;

			if (!palette) {
				animRef.current = requestAnimationFrame(animate);
				return;
			}

			const { quadrants, lightColor } = palette;

			const nodes = nodesRef.current;
			const mouse = mouseRef.current;

			/**
			 * UPDATE NODE POSITIONS
			 */
			for (const node of nodes) {
				node.x += node.vx;
				node.y += node.vy;

				/**
				 * Bounce off edges.
				 */
				if (node.x < 20 || node.x > w - 20) node.vx *= -1;
				if (node.y < 20 || node.y > h - 20) node.vy *= -1;

				/**
				 * Mouse proximity effect.
				 */
				const dist = Math.hypot(mouse.x - node.x, mouse.y - node.y);

				/**
				 * Hover growth intensity.
				 */
				if (dist < mouseDist) {
					node.radius = node.baseRadius + (1 - dist / mouseDist) * 4;
				} else {
					/**
					 * Smoothly shrink back to original size.
					 *
					 * Lower value:
					 * - slower easing
					 *
					 * Higher value:
					 * - snappier animation
					 */
					node.radius += (node.baseRadius - node.radius) * 0.05;
				}
			}

			/**
			 * DRAW CONNECTION LINES
			 */
			for (let i = 0; i < nodes.length; i++) {
				for (let j = i + 1; j < nodes.length; j++) {
					const a = nodes[i];
					const b = nodes[j];

					const dist = Math.hypot(a.x - b.x, a.y - b.y);

					if (dist >= connectionDist) continue;

					/**
					 * Opacity based on distance.
					 *
					 * Closer nodes = brighter lines.
					 */
					const lineT = (1 - dist / connectionDist) * 0.5;

					ctx.beginPath();
					ctx.moveTo(a.x, a.y);
					ctx.lineTo(b.x, b.y);

					/**
					 * Same quadrant:
					 * use quadrant color
					 *
					 * Different quadrant:
					 * use neutral light color
					 */
					if (a.quadrant === b.quadrant) {
						ctx.strokeStyle = quadrants[a.quadrant].color;

						ctx.globalAlpha = lineT;
					} else {
						ctx.strokeStyle = lightColor;

						ctx.globalAlpha = lineT * 0.5;
					}

					/**
					 * Connection line thickness.
					 */
					ctx.lineWidth = 3;

					ctx.stroke();

					ctx.globalAlpha = 1;
				}
			}

			/**
			 * DRAW NODES
			 */
			for (const node of nodes) {
				const qp = quadrants[node.quadrant];

				/**
				 * Draw glow only while enlarged by mouse.
				 */
				if (node.radius > node.baseRadius + 1) {
					ctx.beginPath();

					/**
					 * Glow size multiplier.
					 */
					ctx.arc(node.x, node.y, node.radius * 3, 0, Math.PI * 2);

					ctx.fillStyle = qp.color;

					ctx.globalAlpha = qp.glowA;

					ctx.fill();

					ctx.globalAlpha = 1;
				}

				/**
				 * Main node circle.
				 */
				ctx.beginPath();

				ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

				ctx.fillStyle = qp.color;

				ctx.globalAlpha = qp.fillA;

				ctx.fill();

				ctx.globalAlpha = 1;
			}

			animRef.current = requestAnimationFrame(animate);
		};

		animRef.current = requestAnimationFrame(animate);

		return () => cancelAnimationFrame(animRef.current);
	}, [dimensions]);

	/**
	 * Updates mouse coordinates for interaction effects.
	 */
	const handleMouseMove = (e: React.MouseEvent) => {
		const rect = canvasRef.current?.getBoundingClientRect();

		if (!rect) return;

		mouseRef.current = {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
		};
	};

	/**
	 * Reset mouse position when cursor leaves canvas.
	 */
	const handleMouseLeave = () => {
		mouseRef.current = {
			x: -1000,
			y: -1000,
		};
	};

	return (
		<div className="absolute inset-0">
			{/* Hidden Tailwind color swatches */}
			<div
				ref={swatchRef}
				className="pointer-events-none absolute left-0 top-0 z-0 size-px overflow-hidden opacity-0"
				aria-hidden
			>
				{BEHAVIORAL_NODES_QUADRANT_BG_CLASSES.map((cls) => (
					<div key={cls} data-q-bg className={cls} />
				))}

				<div data-light className="bg-light-same" />
			</div>

			{/* Animated particle canvas */}
			<canvas
				ref={canvasRef}
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
				className="absolute inset-0 z-10 size-full cursor-default"
				aria-hidden
			/>
		</div>
	);
}
