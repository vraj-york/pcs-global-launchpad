export type QuadrantPaint = {
	color: string;
	fillA: number;
	glowA: number;
};

export type BehavioralNode = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	radius: number;
	baseRadius: number;
	quadrant: number;
};

export type BehavioralNodesPalette = {
	quadrants: QuadrantPaint[];
	lightColor: string;
};
