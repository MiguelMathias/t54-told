import type { Settings } from './types';

type Point2d = {
	x: number;
	y: number;
};

type Point3d = Point2d & {
	z: number;
};

type Point4d = Point3d & {
	w: number;
};

function generateLineFromTwoPoints(...points: [Point3d, Point3d]) {
	const p1 = points[0];
	const p2 = points[1];
	// Use x or y depending on which changes
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;

	if (dx !== 0) {
		const m = (p2.z - p1.z) / dx;
		const b = p1.z - m * p1.x;
		const f = (x: number, _y: number) => m * x + b;
		f.toString = () => `z = ${m} * x ${b >= 0 ? '+ ' + b : '- ' + -b}`;
		f.dependentVar = 'x';
		return f;
	} else if (dy !== 0) {
		const m = (p2.z - p1.z) / dy;
		const b = p1.z - m * p1.y;
		const f = (_x: number, y: number) => m * y + b;
		f.toString = () => `z = ${m} * y ${b >= 0 ? '+ ' + b : '- ' + -b}`;
		f.dependentVar = 'y';
		return f;
	} else {
		throw new Error('Insufficient variation to define a function: x and y are constant.');
	}
}

function generateLineFromTwoPoints2d(...points: [Point2d, Point2d]) {
	const p1 = points[0];
	const p2 = points[1];

	if (p1.x === p2.x) {
		// Vertical line: x = c
		const xVal = p1.x;
		const fn = (x: number) => {
			throw new Error(`Cannot compute y from x on a vertical line x = ${xVal}`);
		};
		fn.toString = () => `x = ${xVal}`;
		return fn;
	} else {
		const m = (p2.y - p1.y) / (p2.x - p1.x);
		const b = p1.y - m * p1.x;
		const fn = (x: number) => m * x + b;
		fn.toString = () => `y = ${m}x + ${b}`;
		return fn;
	}
}

const planeFromPoints = (...points: [Point3d, Point3d, Point3d]) => {
	const A = points[0];
	const B = points[1];
	const C = points[2];

	// Check for duplicate points
	if (isPointsEqual(A, B, C)) {
		const func = (_x: number, _y: number) => A.z;
		func.toString = () => `z = ${A.z}`;
		return func;
	}
	if (isPointsEqual(A, B)) return generateLineFromTwoPoints(C, A);
	if (isPointsEqual(A, C)) return generateLineFromTwoPoints(B, A);
	if (isPointsEqual(B, C)) return generateLineFromTwoPoints(A, B);

	// Create vectors AB and AC
	const AB = {
		x: B.x - A.x,
		y: B.y - A.y,
		z: B.z - A.z
	};
	const AC = {
		x: C.x - A.x,
		y: C.y - A.y,
		z: C.z - A.z
	};

	// Cross product (normal vector)
	const normal = {
		x: AB.y * AC.z - AB.z * AC.y,
		y: AB.z * AC.x - AB.x * AC.z,
		z: AB.x * AC.y - AB.y * AC.x
	};

	const A_ = normal.x;
	const B_ = normal.y;
	const C_ = normal.z;
	const D = -(A_ * A.x + B_ * A.y + C_ * A.z);

	if (C_ === 0) {
		throw new Error('Plane is vertical — cannot solve for z.');
	}

	// Return function z = f(x, y)
	const func = (x: number, y: number) => (-A_ * x - B_ * y - D) / C_;
	func.toString = () => {
		const format = (n: number) => (n >= 0 ? `+ ${n}` : `- ${-n}`);
		return `z = ${format(-A_ / C_)} * x ${format(-B_ / C_)} * y ${format(-D / C_)}`;
	};

	return func;
};

/* const createPlaneFunction = (...points: [Point4d, Point4d, Point4d, Point4d]) => {
	if (points.length !== 4) {
		throw new Error('You must provide exactly 4 points.')
	}

	// Convert to matrix A and vector b
	const A = points.map((p) => [p.x, p.y, p.z, 1])
	const b = points.map((p) => p.w)

	// Gaussian elimination
	for (let i = 0; i < 4; i++) {
		// Pivot
		let maxRow = i
		for (let j = i + 1; j < 4; j++) {
			if (Math.abs(A[j][i]) > Math.abs(A[maxRow][i])) {
				maxRow = j
			}
		}
		;[A[i], A[maxRow]] = [A[maxRow], A[i]]
		;[b[i], b[maxRow]] = [b[maxRow], b[i]]

		// Eliminate
		for (let j = i + 1; j < 4; j++) {
			const factor = A[j][i] / A[i][i]
			for (let k = i; k < 4; k++) {
				A[j][k] -= factor * A[i][k]
			}
			b[j] -= factor * b[i]
		}
	}

	// Back-substitution
	const x = Array(4).fill(0)
	for (let i = 3; i >= 0; i--) {
		let sum = b[i]
		for (let j = i + 1; j < 4; j++) {
			sum -= A[i][j] * x[j]
		}
		x[i] = sum / A[i][i]
	}

	const [Acoef, Bcoef, Ccoef, Dcoef] = x

	// Return the function f(x, y, z)
	const f = (x: number, y: number, z: number) => Acoef * x + Bcoef * y + Ccoef * z + Dcoef

	// Debug-friendly string version
	f.toString = () => `f(x, y, z) = ${Acoef.toFixed(4)}x + ${Bcoef.toFixed(4)}y + ${Ccoef.toFixed(4)}z + ${Dcoef.toFixed(4)}`

	return f
} */

/* const findClosest33dPoints2d = (points: Point3d[], target: Point2d): [Point3d, Point3d, Point3d] => {
	if (points.length < 3) {
		throw new Error('Need at least 3 points in the list.')
	}

	// Compute Euclidean distance and sort
	const sorted = points
		.map((p) => ({
			point: p,
			distance: Math.sqrt((p.x - target.x) ** 2 + (p.y - target.y) ** 2),
		}))
		.sort((a, b) => a.distance - b.distance)

	// Return just the point objects
	const closest3 = sorted.slice(0, 3).map((entry) => entry.point)

	if (closest3.every((p) => p.x === closest3[0].x)) closest3[2] = sorted.find((p) => p.point.x !== closest3[0].x)!.point

	if (closest3.every((p) => p.y === closest3[0].y)) closest3[2] = sorted.find((p) => p.point.y !== closest3[0].y)!.point

	return closest3 as [Point3d, Point3d, Point3d]
} */

/* const findClosest44dPoints3d = (points: Point4d[], target: Point3d) => {
	if (points.length < 4) {
		throw new Error('Need at least 3 points in the list.')
	}

	// Compute Euclidean distance and sort
	const sorted = points
		.map((p) => ({
			point: p,
			distance: Math.sqrt((p.x - target.x) ** 2 + (p.y - target.y) ** 2 + (p.z - target.z) ** 2),
		}))
		.sort((a, b) => a.distance - b.distance)

	// Return just the point objects
	const closest4 = sorted.slice(0, 4).map((entry) => entry.point)

	return closest4
} */

function isPointInTriangle(p: Point2d, a: Point2d, b: Point2d, c: Point2d) {
	const sign = (p1: Point2d, p2: Point2d, p3: Point2d) =>
		(p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);

	const d1 = sign(p, a, b);
	const d2 = sign(p, b, c);
	const d3 = sign(p, c, a);

	const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
	const hasPos = d1 > 0 || d2 > 0 || d3 > 0;

	return !(hasNeg && hasPos);
}

function triangleArea(a: Point2d, b: Point2d, c: Point2d) {
	return 0.5 * Math.abs(a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
}

function findSmallestInscribingTriangle(
	points: Point3d[],
	target: Point2d
): [Point3d, Point3d, Point3d] | null {
	const n = points.length;
	let smallestTriangle = null;
	let minArea = Infinity;

	for (let i = 0; i < n - 2; i++) {
		for (let j = i + 1; j < n - 1; j++) {
			for (let k = j + 1; k < n; k++) {
				const a = points[i],
					b = points[j],
					c = points[k];

				if (isPointInTriangle(target, a, b, c)) {
					const area = triangleArea(a, b, c);
					if (area < minArea) {
						minArea = area;
						smallestTriangle = [a, b, c];
					}
				}
			}
		}
	}

	return smallestTriangle as [Point3d, Point3d, Point3d] | null;
}

const isPointsEqual = (...points: Point3d[]) => {
	if (points.length < 2) return true;
	const first = points[0];
	for (let i = 1; i < points.length; i++) {
		const point = points[i];
		if (point.x !== first.x || point.y !== first.y || point.z !== first.z) return false;
	}
	return true;
};

const findThreePoints = (
	points: Point3d[],
	target: Point2d
): [Point3d, Point3d, Point3d] | null => {
	//console.log('target', target);
	const closestXAbove = points
		.filter((p) => p.x >= target.x)
		.sort((a, b) => a.x - b.x)
		.map((p) => ({
			point: p,
			distance: Math.sqrt((p.x - target.x) ** 2 + (p.y - target.y) ** 2)
		}))
		.sort((a, b) => a.distance - b.distance);
	const closestXBelow = points
		.filter((p) => p.x <= target.x)
		.sort((a, b) => b.x - a.x)
		.map((p) => ({
			point: p,
			distance: Math.sqrt((p.x - target.x) ** 2 + (p.y - target.y) ** 2)
		}))
		.sort((a, b) => a.distance - b.distance);
	const closestYAbove = points
		.filter((p) => p.y >= target.y)
		.sort((a, b) => a.y - b.y)
		.map((p) => ({
			point: p,
			distance: Math.sqrt((p.x - target.x) ** 2 + (p.y - target.y) ** 2)
		}))
		.sort((a, b) => a.distance - b.distance);
	const closestYBelow = points
		.filter((p) => p.y <= target.y)
		.sort((a, b) => b.y - a.y)
		.map((p) => ({
			point: p,
			distance: Math.sqrt((p.x - target.x) ** 2 + (p.y - target.y) ** 2)
		}))
		.sort((a, b) => a.distance - b.distance);
	const closest = points
		.map((p) => ({
			point: p,
			distance: Math.sqrt((p.x - target.x) ** 2 + (p.y - target.y) ** 2)
		}))
		.sort((a, b) => a.distance - b.distance);

	//console.log('Closest X Above:', closestXAbove[0]);
	//console.log('Closest X Below:', closestXBelow[0]);
	//console.log('Closest Y Above:', closestYAbove[0]);
	//console.log('Closest Y Below:', closestYBelow[0]);

	//console.log(closest)
	//console.log(closest.find((p) => isPointInTriangle(target, closestYAbove[0].point, closestYBelow[0].point, p.point))?.point)
	return [
		closestYAbove[0].point,
		closestYBelow[0].point,
		closest.find(
			(p) =>
				isPointInTriangle(target, closestYAbove[0].point, closestYBelow[0].point, p.point) /* &&
				!isPointsEqual(closestYAbove[0].point, p.point) &&
				!isPointsEqual(closestYBelow[0].point, p.point) */
		)?.point
	] as [Point3d, Point3d, Point3d] | null;
};

export const computeWindComponents = (
	runwayHeadingDeg: number,
	windDirectionDeg: number,
	windSpeed: number
) => {
	// Convert angles to radians
	const runwayRad = (runwayHeadingDeg * Math.PI) / 180;
	const windRad = (windDirectionDeg * Math.PI) / 180;

	// Calculate wind angle relative to runway
	const angle = windRad - runwayRad;

	// Component calculations
	const headwind = windSpeed * Math.cos(angle);
	const crosswind = windSpeed * Math.sin(angle);

	return {
		headwind: parseFloat(headwind.toFixed(2)),
		crosswind: parseFloat(crosswind.toFixed(2)), // + = from right, - = from left
		crosswindSpeed: Math.abs(+crosswind.toFixed(2)),
		tailwind: headwind < 0 ? Math.abs(+headwind.toFixed(2)) : 0,
		isTailwind: headwind < 0,
		crosswindDirection: crosswind >= 0 ? 'from right' : 'from left'
	};
};

const computer = (pointsSet: Point3d[][], ...inputs: number[]) => {
	try {
		let prevRes: null | number = null;
		let inputsIndex = 0;
		let index = 0;
		for (const points of pointsSet) {
			index++;
			const x = inputs[inputsIndex++];
			const y: number = prevRes !== null ? prevRes : inputs[inputsIndex++];
			const threePointsForPlane = findThreePoints(points, { x, y });
			//console.log('Inscribing points:', threePointsForPlane);
			if (!threePointsForPlane) {
				throw new Error('No valid triangle found for the given points.');
			}
			const func = planeFromPoints(...threePointsForPlane);
			//console.log('Plane function:', func.toString());
			prevRes = func(x, y);
			//console.log(`Result for step ${index}:`, prevRes);
		}
		return prevRes;
	} catch (error) {
		//console.error(error);
	}
};

export const accelStopFlapsUpDry = (
	oat: number,
	pa: number,
	weight: number,
	rwySlope: number,
	wind: number,
	v1vrRatio: number
) => {
	const pointsStep1 = [
		{ x: -42.5, y: 14000, z: 6000 },
		{ x: -2.5, y: 14000, z: 7600 },
		{ x: 24, y: 14000, z: 9700 },
		{ x: -38, y: 12000, z: 5500 },
		{ x: 8, y: 12000, z: 7100 },
		{ x: 28, y: 12000, z: 8600 },
		{ x: -35, y: 10000, z: 5100 },
		{ x: 15, y: 10000, z: 6500 },
		{ x: 32, y: 10000, z: 7700 },
		{ x: -31, y: 8000, z: 4700 },
		{ x: 22, y: 8000, z: 6100 },
		{ x: 36, y: 8000, z: 6900 },
		{ x: -27, y: 6000, z: 4300 },
		{ x: 28, y: 6000, z: 5700 },
		{ x: 40, y: 6000, z: 6300 },
		{ x: -23, y: 4000, z: 4100 },
		{ x: 34, y: 4000, z: 5300 },
		{ x: 44, y: 4000, z: 5700 },
		{ x: -19, y: 2000, z: 3800 },
		{ x: 40, y: 2000, z: 4900 },
		{ x: 47, y: 2000, z: 5300 },
		{ x: -15, y: 0, z: 3500 },
		{ x: 45, y: 0, z: 4600 },
		{ x: 52, y: 0, z: 4800 },
		{ x: -13, y: -1000, z: 3400 },
		{ x: 48, y: -1000, z: 4400 },
		{ x: 54, y: -1000, z: 4600 }
	] as Point3d[];

	const pointsStep2 = [
		{ x: 12500, y: 10000, z: 10000 },
		{ x: 12300, y: 10000, z: 9800 },
		{ x: 9000, y: 10000, z: 7900 },
		{ x: 12500, y: 9000, z: 9000 },
		{ x: 12300, y: 9000, z: 8800 },
		{ x: 9000, y: 9000, z: 7200 },
		{ x: 12500, y: 8000, z: 12300 },
		{ x: 12300, y: 8000, z: 7800 },
		{ x: 9000, y: 8000, z: 6600 },
		{ x: 12500, y: 7000, z: 7000 },
		{ x: 12300, y: 7000, z: 6800 },
		{ x: 9000, y: 7000, z: 5800 },
		{ x: 12500, y: 6000, z: 6000 },
		{ x: 12300, y: 6000, z: 5800 },
		{ x: 9000, y: 6000, z: 5100 },
		{ x: 12500, y: 5000, z: 5000 },
		{ x: 12350, y: 5000, z: 4900 },
		{ x: 9000, y: 5000, z: 4300 },
		{ x: 12500, y: 4000, z: 4000 },
		{ x: 12350, y: 4000, z: 3900 },
		{ x: 9000, y: 4000, z: 3500 },
		{ x: 12500, y: 3000, z: 3000 },
		{ x: 12400, y: 3000, z: 2900 },
		{ x: 9000, y: 3000, z: 2700 }
	] as Point3d[];

	const pointsStep3 = [
		{ x: -2, y: 2000, z: 2100 },
		{ x: 0, y: 2000, z: 2000 },
		{ x: 2, y: 2000, z: 1800 },
		{ x: -2, y: 3000, z: 3100 },
		{ x: 0, y: 3000, z: 3000 },
		{ x: 2, y: 3000, z: 2900 },
		{ x: -2, y: 4000, z: 4100 },
		{ x: 0, y: 4000, z: 4000 },
		{ x: 2, y: 4000, z: 4000 },
		{ x: -2, y: 5000, z: 5100 },
		{ x: 0, y: 5000, z: 5000 },
		{ x: 2, y: 5000, z: 5100 },
		{ x: -2, y: 6000, z: 6075 },
		{ x: 0, y: 6000, z: 6000 },
		{ x: 2, y: 6000, z: 6150 },
		{ x: -2, y: 7000, z: 7000 },
		{ x: 0, y: 7000, z: 7000 },
		{ x: 2, y: 7000, z: 7300 },
		{ x: -2, y: 8000, z: 7750 },
		{ x: 0, y: 8000, z: 8000 },
		{ x: 2, y: 8000, z: 8400 },
		{ x: -2, y: 9000, z: 8650 },
		{ x: 0, y: 9000, z: 9000 },
		{ x: 2, y: 9000, z: 9600 },
		{ x: -2, y: 10000, z: 9400 },
		{ x: 0, y: 10000, z: 10000 },
		{ x: 2, y: 10000, z: 10800 }
	] as Point3d[];

	const pointsStep4 = [
		{ x: -10, y: 2000, z: 2700 },
		{ x: 0, y: 2000, z: 2000 },
		{ x: 30, y: 2000, z: 1400 },
		{ x: -10, y: 3000, z: 3900 },
		{ x: 0, y: 3000, z: 3000 },
		{ x: 30, y: 3000, z: 2200 },
		{ x: -10, y: 4000, z: 5200 },
		{ x: 0, y: 4000, z: 4000 },
		{ x: 30, y: 4000, z: 3100 },
		{ x: -10, y: 5000, z: 6300 },
		{ x: 0, y: 5000, z: 5000 },
		{ x: 30, y: 5000, z: 3900 },
		{ x: -10, y: 6000, z: 7500 },
		{ x: 0, y: 6000, z: 6000 },
		{ x: 30, y: 6000, z: 4750 },
		{ x: -10, y: 7000, z: 8700 },
		{ x: 0, y: 7000, z: 7000 },
		{ x: 30, y: 7000, z: 5600 },
		{ x: -10, y: 8000, z: 9800 },
		{ x: 0, y: 8000, z: 8000 },
		{ x: 30, y: 8000, z: 6450 },
		{ x: -10, y: 9000, z: 10950 },
		{ x: 0, y: 9000, z: 9000 },
		{ x: 30, y: 9000, z: 7250 },
		{ x: -10, y: 10000, z: 12100 },
		{ x: 0, y: 10000, z: 10000 },
		{ x: 30, y: 10000, z: 8050 },
		{ x: -10, y: 11000, z: 13200 },
		{ x: 0, y: 11000, z: 11000 },
		{ x: 30, y: 11000, z: 8850 }
	] as Point3d[];

	const pointsStep5 = [
		{ x: 1, y: 2000, z: 2000 },
		{ x: 0.85, y: 2000, z: 1400 },
		{ x: 1, y: 3000, z: 3000 },
		{ x: 0.85, y: 3000, z: 2200 },
		{ x: 1, y: 4000, z: 4000 },
		{ x: 0.85, y: 4000, z: 3050 },
		{ x: 1, y: 5000, z: 5000 },
		{ x: 0.85, y: 5000, z: 3775 },
		{ x: 1, y: 6000, z: 6000 },
		{ x: 0.85, y: 6000, z: 4500 },
		{ x: 1, y: 7000, z: 7000 },
		{ x: 0.85, y: 7000, z: 5200 },
		{ x: 1, y: 8000, z: 8000 },
		{ x: 0.85, y: 8000, z: 5950 },
		{ x: 1, y: 9000, z: 9000 },
		{ x: 0.85, y: 9000, z: 6700 },
		{ x: 1, y: 10000, z: 10000 },
		{ x: 0.85, y: 10000, z: 7300 },
		{ x: 1, y: 11000, z: 11000 },
		{ x: 0.85, y: 11000, z: 7950 },
		{ x: 1, y: 12000, z: 12000 },
		{ x: 0.85, y: 12000, z: 8600 },
		{ x: 1, y: 13000, z: 13000 },
		{ x: 0.85, y: 13000, z: 9200 }
	] as Point3d[];

	return computer(
		[pointsStep1, pointsStep2, pointsStep3, pointsStep4, pointsStep5],
		oat,
		pa,
		weight,
		rwySlope,
		wind,
		v1vrRatio
	);
};

export const accelStopFlapsUpWet = (
	oat: number,
	pa: number,
	weight: number,
	rwySlope: number,
	wind: number,
	v1vrRatio: number
) => {
	const pointsStep1 = [
		{ x: -42.5, y: 14000, z: 8750 },
		{ x: -2.5, y: 14000, z: 10800 },
		{ x: 22, y: 14000, z: 13700 },
		{ x: -39, y: 12000, z: 7950 },
		{ x: 5, y: 12000, z: 10200 },
		{ x: 27, y: 12000, z: 12200 },
		{ x: -35, y: 10000, z: 7400 },
		{ x: 14, y: 10000, z: 9400 },
		{ x: 32, y: 10000, z: 10950 },
		{ x: -31, y: 8000, z: 6900 },
		{ x: 21, y: 8000, z: 8800 },
		{ x: 36, y: 8000, z: 10000 },
		{ x: -27, y: 6000, z: 6400 },
		{ x: 28, y: 6000, z: 8200 },
		{ x: 40, y: 6000, z: 9000 },
		{ x: -23, y: 4000, z: 6000 },
		{ x: 34, y: 4000, z: 7650 },
		{ x: 44, y: 4000, z: 8250 },
		{ x: -19, y: 2000, z: 5600 },
		{ x: 40, y: 2000, z: 7200 },
		{ x: 47, y: 2000, z: 7600 },
		{ x: -15, y: 0, z: 5200 },
		{ x: 45, y: 0, z: 6750 },
		{ x: 52, y: 0, z: 7050 },
		{ x: -13, y: -1000, z: 5050 },
		{ x: 48, y: -1000, z: 6500 },
		{ x: 54, y: -1000, z: 6600 }
	] as Point3d[];

	const pointsStep2 = [
		{ x: 12500, y: 13000, z: 13000 },
		{ x: 12300, y: 13000, z: 12600 },
		{ x: 9000, y: 13000, z: 10900 },
		{ x: 12500, y: 12000, z: 12000 },
		{ x: 12300, y: 12000, z: 11600 },
		{ x: 9000, y: 12000, z: 10100 },
		{ x: 12500, y: 11000, z: 11000 },
		{ x: 12300, y: 11000, z: 10700 },
		{ x: 9000, y: 11000, z: 9350 },
		{ x: 12500, y: 10000, z: 10000 },
		{ x: 12300, y: 10000, z: 9750 },
		{ x: 9000, y: 10000, z: 8600 },
		{ x: 12500, y: 9000, z: 9000 },
		{ x: 12350, y: 9000, z: 8800 },
		{ x: 9000, y: 9000, z: 7800 },
		{ x: 12500, y: 8000, z: 8000 },
		{ x: 12350, y: 8000, z: 7800 },
		{ x: 9000, y: 8000, z: 7000 },
		{ x: 12500, y: 7000, z: 7000 },
		{ x: 12400, y: 7000, z: 6800 },
		{ x: 9000, y: 7000, z: 6200 },
		{ x: 12500, y: 6000, z: 6000 },
		{ x: 12400, y: 6000, z: 5800 },
		{ x: 9000, y: 6000, z: 5400 },
		{ x: 12500, y: 5000, z: 5000 },
		{ x: 12400, y: 5000, z: 4850 },
		{ x: 9000, y: 5000, z: 4500 }
	] as Point3d[];

	const pointsStep3 = [
		{ x: -2, y: 4000, z: 4450 },
		{ x: 0, y: 4000, z: 4000 },
		{ x: 2, y: 4000, z: 3650 },
		{ x: -2, y: 5000, z: 5600 },
		{ x: 0, y: 5000, z: 5000 },
		{ x: 2, y: 5000, z: 4650 },
		{ x: -2, y: 6000, z: 6700 },
		{ x: 0, y: 6000, z: 6000 },
		{ x: 2, y: 6000, z: 5650 },
		{ x: -2, y: 7000, z: 7800 },
		{ x: 0, y: 7000, z: 7000 },
		{ x: 2, y: 7000, z: 6650 },
		{ x: -2, y: 8000, z: 8800 },
		{ x: 0, y: 8000, z: 8000 },
		{ x: 2, y: 8000, z: 7650 },
		{ x: -2, y: 9000, z: 9900 },
		{ x: 0, y: 9000, z: 9000 },
		{ x: 2, y: 9000, z: 8600 },
		{ x: -2, y: 10000, z: 10900 },
		{ x: 0, y: 10000, z: 10000 },
		{ x: 2, y: 10000, z: 9600 },
		{ x: -2, y: 11000, z: 11800 },
		{ x: 0, y: 11000, z: 11000 },
		{ x: 2, y: 11000, z: 10600 },
		{ x: -2, y: 12000, z: 12700 },
		{ x: 0, y: 12000, z: 12000 },
		{ x: 2, y: 12000, z: 11600 },
		{ x: -2, y: 13000, z: 13600 },
		{ x: 0, y: 13000, z: 13000 },
		{ x: 2, y: 13000, z: 12600 },
		{ x: 0, y: 14000, z: 14000 },
		{ x: 2, y: 14000, z: 13600 }
	] as Point3d[];

	const pointsStep4 = [
		{ x: -10, y: 4000, z: 5300 },
		{ x: 0, y: 4000, z: 4000 },
		{ x: 30, y: 4000, z: 2900 },
		{ x: -10, y: 5000, z: 6600 },
		{ x: 0, y: 5000, z: 5000 },
		{ x: 30, y: 5000, z: 3700 },
		{ x: -10, y: 6000, z: 7800 },
		{ x: 0, y: 6000, z: 6000 },
		{ x: 30, y: 6000, z: 4600 },
		{ x: -10, y: 7000, z: 9000 },
		{ x: 0, y: 7000, z: 7000 },
		{ x: 30, y: 7000, z: 5400 },
		{ x: -10, y: 8000, z: 10150 },
		{ x: 0, y: 8000, z: 8000 },
		{ x: 30, y: 8000, z: 6250 },
		{ x: -10, y: 9000, z: 11300 },
		{ x: 0, y: 9000, z: 9000 },
		{ x: 30, y: 9000, z: 7150 },
		{ x: -10, y: 10000, z: 12500 },
		{ x: 0, y: 10000, z: 10000 },
		{ x: 30, y: 10000, z: 8000 },
		{ x: -10, y: 11000, z: 13600 },
		{ x: 0, y: 11000, z: 11000 },
		{ x: 30, y: 11000, z: 8800 },
		{ x: -7, y: 12000, z: 14000 },
		{ x: 0, y: 12000, z: 12000 },
		{ x: 30, y: 12000, z: 9600 },
		{ x: -3, y: 13000, z: 14000 },
		{ x: 0, y: 13000, z: 13000 },
		{ x: 30, y: 13000, z: 10400 },
		{ x: 0, y: 140000, z: 14000 },
		{ x: 30, y: 14000, z: 11200 }
	] as Point3d[];

	const pointsStep5 = [
		{ x: 1, y: 3000, z: 3000 },
		{ x: 0.85, y: 3000, z: 1950 },
		{ x: 1, y: 4000, z: 4000 },
		{ x: 0.85, y: 4000, z: 2700 },
		{ x: 1, y: 5000, z: 5000 },
		{ x: 0.85, y: 5000, z: 3600 },
		{ x: 1, y: 6000, z: 6000 },
		{ x: 0.85, y: 6000, z: 4550 },
		{ x: 1, y: 7000, z: 7000 },
		{ x: 0.85, y: 7000, z: 5300 },
		{ x: 1, y: 8000, z: 8000 },
		{ x: 0.85, y: 8000, z: 6050 },
		{ x: 1, y: 9000, z: 9000 },
		{ x: 0.85, y: 9000, z: 6800 },
		{ x: 1, y: 10000, z: 10000 },
		{ x: 0.85, y: 10000, z: 7500 },
		{ x: 1, y: 11000, z: 11000 },
		{ x: 0.85, y: 11000, z: 8250 },
		{ x: 1, y: 12000, z: 12000 },
		{ x: 0.85, y: 12000, z: 9000 },
		{ x: 1, y: 13000, z: 13000 },
		{ x: 0.85, y: 13000, z: 9700 },
		{ x: 1, y: 14000, z: 14000 },
		{ x: 0.85, y: 14000, z: 10400 }
	] as Point3d[];

	return computer(
		[pointsStep1, pointsStep2, pointsStep3, pointsStep4, pointsStep5],
		oat,
		pa,
		weight,
		rwySlope,
		wind,
		v1vrRatio
	);
};

export const accelGoFlapsUpLessThan10KPA = (
	oat: number,
	pa: number,
	weight: number,
	rwySlope: number,
	wind: number,
	v1vrRatio: number
) => {
	const pointsStep1 = [
		{ x: -14, y: -1000, z: 3350 },
		{ x: 50, y: -1000, z: 4800 },
		{ x: 54, y: -1000, z: 5200 },
		{ x: -15, y: 0, z: 3500 },
		{ x: 43, y: 0, z: 4900 },
		{ x: 52, y: 0, z: 5950 },
		{ x: -19, y: 2000, z: 3800 },
		{ x: 37, y: 2000, z: 5400 },
		{ x: 47, y: 2000, z: 6800 },
		{ x: -23, y: 4000, z: 4200 },
		{ x: 31, y: 4000, z: 5900 },
		{ x: 44, y: 4000, z: 7900 },
		{ x: -27, y: 6000, z: 4600 },
		{ x: 25, y: 6000, z: 6500 },
		{ x: 40, y: 6000, z: 9400 },
		{ x: -31, y: 8000, z: 5100 },
		{ x: 19, y: 8000, z: 7200 },
		{ x: 36, y: 8000, z: 11600 },
		{ x: -35, y: 10000, z: 5650 },
		{ x: 12, y: 10000, z: 8000 },
		{ x: 32, y: 10000, z: 14900 }
	] as Point3d[];

	const pointsStep2 = [
		{ x: 12500, y: 3000, z: 3000 },
		{ x: 11300, y: 3000, z: 2200 },
		{ x: 9000, y: 3000, z: 1600 },
		{ x: 12500, y: 4000, z: 4000 },
		{ x: 11300, y: 4000, z: 2900 },
		{ x: 9000, y: 4000, z: 2100 },
		{ x: 12500, y: 5000, z: 5000 },
		{ x: 11300, y: 5000, z: 3600 },
		{ x: 9000, y: 5000, z: 2600 },
		{ x: 12500, y: 6000, z: 6000 },
		{ x: 11300, y: 6000, z: 4200 },
		{ x: 9000, y: 6000, z: 3100 },
		{ x: 12500, y: 7000, z: 7000 },
		{ x: 11300, y: 7000, z: 4900 },
		{ x: 9000, y: 6000, z: 3600 },
		{ x: 12500, y: 8000, z: 8000 },
		{ x: 11300, y: 8000, z: 5600 },
		{ x: 9000, y: 6000, z: 4000 },
		{ x: 12500, y: 9000, z: 9000 },
		{ x: 11300, y: 9000, z: 6200 },
		{ x: 9000, y: 6000, z: 4450 },
		{ x: 12500, y: 10000, z: 10000 },
		{ x: 11300, y: 10000, z: 6850 },
		{ x: 9000, y: 6000, z: 4900 },
		{ x: 12500, y: 11000, z: 11000 },
		{ x: 11300, y: 11000, z: 7400 },
		{ x: 9000, y: 6000, z: 5300 },
		{ x: 12500, y: 12000, z: 12000 },
		{ x: 11300, y: 12000, z: 8000 },
		{ x: 9000, y: 6000, z: 5700 },
		{ x: 12500, y: 13000, z: 13000 },
		{ x: 11300, y: 13000, z: 8500 },
		{ x: 9000, y: 6000, z: 6050 },
		{ x: 12500, y: 14000, z: 14000 },
		{ x: 11300, y: 14000, z: 9000 },
		{ x: 9000, y: 6000, z: 6350 }
	] as Point3d[];

	const pointsStep3 = [
		{ x: -2, y: 2000, z: 1800 },
		{ x: 0, y: 2000, z: 2000 },
		{ x: 2, y: 2000, z: 2300 },
		{ x: -2, y: 3000, z: 2600 },
		{ x: 0, y: 3000, z: 3000 },
		{ x: 2, y: 3000, z: 3750 },
		{ x: -2, y: 4000, z: 3400 },
		{ x: 0, y: 4000, z: 4000 },
		{ x: 2, y: 4000, z: 5200 },
		{ x: -2, y: 5000, z: 4200 },
		{ x: 0, y: 5000, z: 5000 },
		{ x: 2, y: 5000, z: 7200 },
		{ x: -2, y: 6000, z: 4800 },
		{ x: 0, y: 6000, z: 6000 },
		{ x: 2, y: 6000, z: 9500 },
		{ x: -2, y: 7000, z: 5500 },
		{ x: 0, y: 7000, z: 7000 },
		{ x: 2, y: 7000, z: 13500 },
		{ x: -2, y: 8000, z: 6200 },
		{ x: 0, y: 8000, z: 8000 },
		{ x: 1.5, y: 8000, z: 14000 },
		{ x: -2, y: 9000, z: 6800 },
		{ x: 0, y: 9000, z: 9000 },
		{ x: 1.25, y: 9000, z: 14000 },
		{ x: -2, y: 10000, z: 7400 },
		{ x: 0, y: 10000, z: 10000 },
		{ x: 0.85, y: 10000, z: 14000 },
		{ x: -2, y: 11000, z: 7900 },
		{ x: 0, y: 11000, z: 11000 },
		{ x: 0.6, y: 11000, z: 14000 },
		{ x: -2, y: 12000, z: 8300 },
		{ x: 0, y: 12000, z: 12000 },
		{ x: 0.4, y: 12000, z: 14000 },
		{ x: -2, y: 13000, z: 8700 },
		{ x: 0, y: 13000, z: 13000 },
		{ x: 0.2, y: 13000, z: 14000 },
		{ x: -2, y: 14000, z: 9100 },
		{ x: 0, y: 14000, z: 14000 }
	] as Point3d[];

	const pointsStep4 = [
		{ x: -10, y: 1000, z: 1600 },
		{ x: 0, y: 1000, z: 1000 },
		{ x: -10, y: 2000, z: 2500 },
		{ x: 0, y: 2000, z: 2000 },
		{ x: 30, y: 2000, z: 1600 },
		{ x: -10, y: 3000, z: 3700 },
		{ x: 0, y: 3000, z: 3000 },
		{ x: 30, y: 3000, z: 2450 },
		{ x: -10, y: 4000, z: 4850 },
		{ x: 0, y: 4000, z: 4000 },
		{ x: 30, y: 4000, z: 3300 },
		{ x: -10, y: 5000, z: 6000 },
		{ x: 0, y: 5000, z: 5000 },
		{ x: 30, y: 5000, z: 4200 },
		{ x: -10, y: 6000, z: 7100 },
		{ x: 0, y: 6000, z: 6000 },
		{ x: 30, y: 6000, z: 5100 },
		{ x: -10, y: 7000, z: 8300 },
		{ x: 0, y: 7000, z: 7000 },
		{ x: 30, y: 7000, z: 5900 },
		{ x: -10, y: 8000, z: 9400 },
		{ x: 0, y: 8000, z: 8000 },
		{ x: 30, y: 8000, z: 6800 },
		{ x: -10, y: 9000, z: 10500 },
		{ x: 0, y: 9000, z: 10000 },
		{ x: 30, y: 10000, z: 7700 },
		{ x: -10, y: 10000, z: 11700 },
		{ x: 0, y: 10000, z: 10000 },
		{ x: 30, y: 10000, z: 8600 },
		{ x: -10, y: 11000, z: 12800 },
		{ x: 0, y: 11000, z: 11000 },
		{ x: 30, y: 11000, z: 9500 },
		{ x: -10, y: 12000, z: 13900 },
		{ x: 0, y: 12000, z: 12000 },
		{ x: 30, y: 12000, z: 10400 },
		{ x: -10, y: 13000, z: 15000 },
		{ x: 0, y: 13000, z: 13000 },
		{ x: 30, y: 13000, z: 11200 },
		{ x: -5, y: 14000, z: 15000 },
		{ x: 0, y: 14000, z: 14000 },
		{ x: 30, y: 14000, z: 12200 }
	] as Point3d[];

	const pointsStep5 = [
		{ x: 1, y: 1000, z: 1000 },
		{ x: 0.85, y: 1000, z: 1250 },
		{ x: 1, y: 2000, z: 2000 },
		{ x: 0.85, y: 2000, z: 2900 },
		{ x: 1, y: 3000, z: 3000 },
		{ x: 0.85, y: 3000, z: 4600 },
		{ x: 1, y: 4000, z: 4000 },
		{ x: 0.85, y: 4000, z: 6300 },
		{ x: 1, y: 5000, z: 5000 },
		{ x: 0.85, y: 5000, z: 8200 },
		{ x: 1, y: 6000, z: 6000 },
		{ x: 0.85, y: 6000, z: 10100 },
		{ x: 1, y: 7000, z: 7000 },
		{ x: 0.85, y: 7000, z: 12000 },
		{ x: 1, y: 8000, z: 8000 },
		{ x: 0.85, y: 8000, z: 13900 },
		{ x: 1, y: 9000, z: 9000 },
		{ x: 0.875, y: 9000, z: 15000 },
		{ x: 1, y: 10000, z: 10000 },
		{ x: 0.92, y: 10000, z: 15000 },
		{ x: 1, y: 11000, z: 11000 },
		{ x: 0.952, y: 11000, z: 15000 },
		{ x: 1, y: 12000, z: 12000 },
		{ x: 0.972, y: 12000, z: 15000 },
		{ x: 1, y: 13000, z: 13000 },
		{ x: 0.983, y: 13000, z: 15000 },
		{ x: 1, y: 14000, z: 14000 },
		{ x: 0.99, y: 14000, z: 15000 }
	] as Point3d[];

	return computer(
		[pointsStep1, pointsStep2, pointsStep3, pointsStep4, pointsStep5],
		oat,
		pa,
		weight,
		rwySlope,
		wind,
		v1vrRatio
	);
};

export const accelGoFlapsUpGreaterThan10KPA = (
	oat: number,
	pa: number,
	weight: number,
	rwySlope: number,
	wind: number,
	v1vrRatio: number
) => {
	const pointsStep1 = [
		{ x: -35, y: 10000, z: 2900 },
		{ x: 12, y: 10000, z: 4000 },
		{ x: 32, y: 10000, z: 6300 },
		{ x: -37, y: 11000, z: 3100 },
		{ x: 9, y: 11000, z: 4200 },
		{ x: 30, y: 11000, z: 6900 },
		{ x: -39, y: 12000, z: 3300 },
		{ x: 6, y: 12000, z: 4500 },
		{ x: 28, y: 12000, z: 7700 },
		{ x: -41, y: 13000, z: 3500 },
		{ x: 3, y: 13000, z: 4700 },
		{ x: 26, y: 13000, z: 8700 },
		{ x: -43, y: 14000, z: 3700 },
		{ x: -1, y: 14000, z: 5000 },
		{ x: 24, y: 14000, z: 10500 }
	] as Point3d[];

	const pointsStep2 = [
		{ x: 9000, y: 2000, z: 2000 },
		{ x: 11300, y: 2000, z: 2600 },
		{ x: 12500, y: 2000, z: 3800 },
		{ x: 9000, y: 3000, z: 3000 },
		{ x: 11300, y: 3000, z: 4100 },
		{ x: 12500, y: 3000, z: 5800 },
		{ x: 9000, y: 4000, z: 4000 },
		{ x: 11300, y: 4000, z: 5550 },
		{ x: 12500, y: 4000, z: 8100 },
		{ x: 9000, y: 5000, z: 5000 },
		{ x: 11300, y: 5000, z: 6900 },
		{ x: 12500, y: 5000, z: 10550 },
		{ x: 9000, y: 6000, z: 6000 },
		{ x: 11300, y: 6000, z: 8600 },
		{ x: 12500, y: 6000, z: 13700 },
		{ x: 9000, y: 7000, z: 7000 },
		{ x: 11300, y: 7000, z: 10400 },
		{ x: 12100, y: 7000, z: 15000 },
		{ x: 9000, y: 8000, z: 8000 },
		{ x: 11300, y: 7000, z: 12300 },
		{ x: 11700, y: 8000, z: 15000 },
		{ x: 9000, y: 9000, z: 9000 },
		{ x: 11300, y: 8000, z: 14800 },
		{ x: 11300, y: 9000, z: 15000 },
		{ x: 9000, y: 10000, z: 10000 },
		{ x: 10800, y: 10000, z: 15000 },
		{ x: 9000, y: 11000, z: 11000 },
		{ x: 10350, y: 11000, z: 15000 }
	] as Point3d[];

	const pointsStep3 = [
		{ x: -2, y: 2000, z: 1800 },
		{ x: 0, y: 2000, z: 2000 },
		{ x: 2, y: 2000, z: 2300 },
		{ x: -2, y: 3000, z: 2600 },
		{ x: 0, y: 3000, z: 3000 },
		{ x: 2, y: 3000, z: 3700 },
		{ x: -2, y: 4000, z: 3400 },
		{ x: 0, y: 4000, z: 4000 },
		{ x: 2, y: 4000, z: 5200 },
		{ x: -2, y: 5000, z: 4200 },
		{ x: 0, y: 5000, z: 5000 },
		{ x: 2, y: 5000, z: 7200 },
		{ x: -2, y: 6000, z: 4800 },
		{ x: 0, y: 6000, z: 6000 },
		{ x: 2, y: 6000, z: 9500 },
		{ x: -2, y: 7000, z: 5500 },
		{ x: 0, y: 7000, z: 7000 },
		{ x: 2, y: 7000, z: 13200 },
		{ x: -2, y: 8000, z: 6200 },
		{ x: 0, y: 8000, z: 8000 },
		{ x: 1.5, y: 8000, z: 14000 },
		{ x: -2, y: 9000, z: 6800 },
		{ x: 0, y: 9000, z: 9000 },
		{ x: 1.2, y: 9000, z: 14000 },
		{ x: -2, y: 10000, z: 7200 },
		{ x: 0, y: 10000, z: 10000 },
		{ x: 0.8, y: 10000, z: 14000 },
		{ x: -2, y: 11000, z: 7800 },
		{ x: 0, y: 11000, z: 11000 },
		{ x: 0.55, y: 11000, z: 14000 },
		{ x: -2, y: 12000, z: 8300 },
		{ x: 0, y: 12000, z: 12000 },
		{ x: 0.25, y: 12000, z: 14000 },
		{ x: -2, y: 13000, z: 8700 },
		{ x: 0, y: 13000, z: 13000 },
		{ x: 0.1, y: 13000, z: 14000 },
		{ x: -2, y: 14000, z: 9050 },
		{ x: 0, y: 14000, z: 14000 }
	] as Point3d[];

	const pointsStep4 = [
		{ x: -10, y: 1000, z: 1300 },
		{ x: 0, y: 1000, z: 1000 },
		{ x: -10, y: 2000, z: 2450 },
		{ x: 0, y: 2000, z: 2000 },
		{ x: 30, y: 2000, z: 1600 },
		{ x: -10, y: 3000, z: 3600 },
		{ x: 0, y: 3000, z: 3000 },
		{ x: 30, y: 3000, z: 2400 },
		{ x: -10, y: 4000, z: 4800 },
		{ x: 0, y: 4000, z: 4000 },
		{ x: 30, y: 4000, z: 3300 },
		{ x: -10, y: 5000, z: 5950 },
		{ x: 0, y: 5000, z: 5000 },
		{ x: 30, y: 5000, z: 4200 },
		{ x: -10, y: 6000, z: 7100 },
		{ x: 0, y: 6000, z: 6000 },
		{ x: 30, y: 6000, z: 5050 },
		{ x: -10, y: 7000, z: 8200 },
		{ x: 0, y: 7000, z: 7000 },
		{ x: 30, y: 7000, z: 5950 },
		{ x: -10, y: 8000, z: 9400 },
		{ x: 0, y: 8000, z: 8000 },
		{ x: 30, y: 8000, z: 6800 },
		{ x: -10, y: 9000, z: 10500 },
		{ x: 0, y: 9000, z: 9000 },
		{ x: 30, y: 9000, z: 7700 },
		{ x: -10, y: 10000, z: 11600 },
		{ x: 0, y: 10000, z: 10000 },
		{ x: 30, y: 10000, z: 8600 },
		{ x: -10, y: 11000, z: 12750 },
		{ x: 0, y: 11000, z: 11000 },
		{ x: 30, y: 11000, z: 9500 },
		{ x: -10, y: 12000, z: 13900 },
		{ x: 0, y: 12000, z: 12000 },
		{ x: 30, y: 12000, z: 10400 },
		{ x: -10, y: 13000, z: 15000 },
		{ x: 0, y: 13000, z: 13000 },
		{ x: 30, y: 13000, z: 11200 },
		{ x: -5, y: 14000, z: 15000 },
		{ x: 0, y: 14000, z: 14000 },
		{ x: 30, y: 14000, z: 12100 }
	] as Point3d[];

	const pointsStep5 = [
		{ x: 1, y: 1000, z: 1000 },
		{ x: 0.85, y: 1000, z: 1250 },
		{ x: 1, y: 2000, z: 2000 },
		{ x: 0.85, y: 2000, z: 2900 },
		{ x: 1, y: 3000, z: 3000 },
		{ x: 0.85, y: 3000, z: 4600 },
		{ x: 1, y: 4000, z: 4000 },
		{ x: 0.85, y: 4000, z: 6350 },
		{ x: 1, y: 5000, z: 5000 },
		{ x: 0.85, y: 5000, z: 8150 },
		{ x: 1, y: 6000, z: 6000 },
		{ x: 0.85, y: 6000, z: 10050 },
		{ x: 1, y: 7000, z: 7000 },
		{ x: 0.85, y: 7000, z: 12000 },
		{ x: 1, y: 8000, z: 8000 },
		{ x: 0.85, y: 8000, z: 13900 },
		{ x: 1, y: 9000, z: 9000 },
		{ x: 0.87, y: 9000, z: 15000 },
		{ x: 1, y: 10000, z: 10000 },
		{ x: 0.925, y: 10000, z: 15000 },
		{ x: 1, y: 11000, z: 11000 },
		{ x: 0.957, y: 11000, z: 15000 },
		{ x: 1, y: 12000, z: 12000 },
		{ x: 0.975, y: 12000, z: 15000 },
		{ x: 1, y: 13000, z: 13000 },
		{ x: 0.988, y: 13000, z: 15000 },
		{ x: 1, y: 14000, z: 14000 },
		{ x: 0.995, y: 14000, z: 15000 }
	] as Point3d[];

	return computer(
		[pointsStep1, pointsStep2, pointsStep3, pointsStep4, pointsStep5],
		oat,
		pa,
		weight,
		rwySlope,
		wind,
		v1vrRatio
	);
};

export const accelStopFlapsApproachDry = (
	oat: number,
	pa: number,
	weight: number,
	rwySlope: number,
	wind: number,
	v1vrRatio: number
) => {
	const pointsStep1 = [
		{ x: -12.5, y: -1000, z: 3150 },
		{ x: 46, y: -1000, z: 4000 },
		{ x: 54, y: -1000, z: 4200 },
		{ x: -15, y: 0, z: 3200 },
		{ x: 45, y: 0, z: 4200 },
		{ x: 52, y: 0, z: 4400 },
		{ x: -19, y: 2000, z: 3450 },
		{ x: 40, y: 2000, z: 4500 },
		{ x: 48, y: 2000, z: 4800 },
		{ x: -23, y: 4000, z: 3700 },
		{ x: 33, y: 4000, z: 4800 },
		{ x: 44, y: 4000, z: 5200 },
		{ x: -27, y: 6000, z: 4000 },
		{ x: 28, y: 6000, z: 5200 },
		{ x: 40, y: 6000, z: 5800 },
		{ x: -30, y: 8000, z: 4250 },
		{ x: 21, y: 8000, z: 5500 },
		{ x: 36, y: 8000, z: 6300 },
		{ x: -35, y: 10000, z: 4600 },
		{ x: 15, y: 10000, z: 6000 },
		{ x: 32, y: 10000, z: 7000 },
		{ x: -40, y: 12000, z: 5000 },
		{ x: 5, y: 12000, z: 6400 },
		{ x: 28, y: 12000, z: 7800 },
		{ x: -44, y: 14000, z: 5450 },
		{ x: -2.5, y: 14000, z: 6900 },
		{ x: 24, y: 14000, z: 8900 }
	] as Point3d[];

	const pointsStep2 = [
		{ x: 12500, y: 3000, z: 3000 },
		{ x: 9000, y: 3000, z: 2700 },
		{ x: 12500, y: 4000, z: 4000 },
		{ x: 9000, y: 4000, z: 3500 },
		{ x: 12500, y: 5000, z: 5000 },
		{ x: 9000, y: 5000, z: 4300 },
		{ x: 12500, y: 6000, z: 6000 },
		{ x: 9000, y: 6000, z: 5100 },
		{ x: 12500, y: 7000, z: 7000 },
		{ x: 9000, y: 7000, z: 5800 },
		{ x: 12500, y: 8000, z: 8000 },
		{ x: 9000, y: 8000, z: 6600 },
		{ x: 12500, y: 9000, z: 9000 },
		{ x: 9000, y: 9000, z: 7300 }
	] as Point3d[];

	const pointsStep3 = [
		{ x: -2, y: 2000, z: 2100 },
		{ x: 0, y: 2000, z: 2000 },
		{ x: 2, y: 2000, z: 1900 },
		{ x: -2, y: 3000, z: 3100 },
		{ x: 0, y: 3000, z: 3000 },
		{ x: 2, y: 3000, z: 2950 },
		{ x: -2, y: 4000, z: 4100 },
		{ x: 0, y: 4000, z: 4000 },
		{ x: 2, y: 4000, z: 4050 },
		{ x: -2, y: 5000, z: 5100 },
		{ x: 0, y: 5000, z: 5000 },
		{ x: 2, y: 5000, z: 5100 },
		{ x: -2, y: 6000, z: 6050 },
		{ x: 0, y: 6000, z: 6000 },
		{ x: 2, y: 6000, z: 6100 },
		{ x: -2, y: 7000, z: 6950 },
		{ x: 0, y: 7000, z: 7000 },
		{ x: 2, y: 7000, z: 7300 },
		{ x: -2, y: 8000, z: 7700 },
		{ x: 0, y: 8000, z: 8000 },
		{ x: 2, y: 8000, z: 8500 },
		{ x: -2, y: 9000, z: 8500 },
		{ x: 0, y: 9000, z: 9000 },
		{ x: 2, y: 9000, z: 9650 }
	] as Point3d[];

	const pointsStep4 = [
		{ x: -10, y: 2000, z: 2750 },
		{ x: 0, y: 2000, z: 2000 },
		{ x: 30, y: 2000, z: 1400 },
		{ x: -10, y: 3000, z: 3950 },
		{ x: 0, y: 3000, z: 3000 },
		{ x: 30, y: 3000, z: 2200 },
		{ x: -10, y: 4000, z: 5200 },
		{ x: 0, y: 4000, z: 4000 },
		{ x: 30, y: 4000, z: 3050 },
		{ x: -10, y: 5000, z: 6350 },
		{ x: 0, y: 5000, z: 5000 },
		{ x: 30, y: 5000, z: 3900 },
		{ x: -10, y: 6000, z: 7500 },
		{ x: 0, y: 6000, z: 6000 },
		{ x: 30, y: 6000, z: 4750 },
		{ x: -10, y: 7000, z: 8650 },
		{ x: 0, y: 7000, z: 7000 },
		{ x: 30, y: 7000, z: 5600 },
		{ x: -10, y: 8000, z: 9800 },
		{ x: 0, y: 8000, z: 8000 },
		{ x: 30, y: 8000, z: 6400 },
		{ x: -10, y: 9000, z: 11000 },
		{ x: 0, y: 9000, z: 9000 },
		{ x: 30, y: 9000, z: 7200 },
		{ x: -10, y: 10000, z: 12150 },
		{ x: 0, y: 10000, z: 10000 },
		{ x: 30, y: 10000, z: 8000 }
	] as Point3d[];

	const pointsStep5 = [
		{ x: 1, y: 1000, z: 1000 },
		{ x: 0.85, y: 1000, z: 500 },
		{ x: 1, y: 2000, z: 2000 },
		{ x: 0.85, y: 2000, z: 1600 },
		{ x: 1, y: 3000, z: 3000 },
		{ x: 0.85, y: 3000, z: 2200 },
		{ x: 1, y: 4000, z: 4000 },
		{ x: 0.85, y: 4000, z: 3050 },
		{ x: 1, y: 5000, z: 5000 },
		{ x: 0.85, y: 5000, z: 3800 },
		{ x: 1, y: 6000, z: 6000 },
		{ x: 0.85, y: 6000, z: 4500 },
		{ x: 1, y: 7000, z: 7000 },
		{ x: 0.85, y: 7000, z: 5200 },
		{ x: 1, y: 8000, z: 8000 },
		{ x: 0.85, y: 8000, z: 5900 },
		{ x: 1, y: 9000, z: 9000 },
		{ x: 0.85, y: 9000, z: 6600 },
		{ x: 1, y: 10000, z: 10000 },
		{ x: 0.85, y: 10000, z: 7200 },
		{ x: 1, y: 11000, z: 11000 },
		{ x: 0.85, y: 11000, z: 7850 },
		{ x: 1, y: 12000, z: 12000 },
		{ x: 0.85, y: 12000, z: 8500 }
	] as Point3d[];

	return computer(
		[pointsStep1, pointsStep2, pointsStep3, pointsStep4, pointsStep5],
		oat,
		pa,
		weight,
		rwySlope,
		wind,
		v1vrRatio
	);
};

export const accelStopFlapsApproachWet = (
	oat: number,
	pa: number,
	weight: number,
	rwySlope: number,
	wind: number,
	v1vrRatio: number
) => {
	const pointsStep1 = [
		{ x: -12.5, y: -1000, z: 4700 },
		{ x: 48, y: -1000, z: 5900 },
		{ x: 54, y: -1000, z: 6100 },
		{ x: -15, y: 0, z: 4800 },
		{ x: 44, y: 0, z: 6100 },
		{ x: 52, y: 0, z: 6400 },
		{ x: -20, y: 2000, z: 5200 },
		{ x: 40, y: 2000, z: 6550 },
		{ x: 48, y: 2000, z: 7000 },
		{ x: -24, y: 4000, z: 5500 },
		{ x: 32, y: 4000, z: 7000 },
		{ x: 44, y: 4000, z: 7550 },
		{ x: -28, y: 6000, z: 5800 },
		{ x: 28, y: 6000, z: 7500 },
		{ x: 40, y: 6000, z: 8300 },
		{ x: -32, y: 8000, z: 6300 },
		{ x: 22, y: 8000, z: 8000 },
		{ x: 36, y: 8000, z: 9050 },
		{ x: -35, y: 10000, z: 6800 },
		{ x: 16, y: 10000, z: 8700 },
		{ x: 31, y: 10000, z: 10000 },
		{ x: -39, y: 12000, z: 7300 },
		{ x: 6, y: 12000, z: 9150 },
		{ x: 28, y: 12000, z: 11050 },
		{ x: -44, y: 14000, z: 7950 },
		{ x: 0, y: 14000, z: 9900 },
		{ x: 25, y: 14000, z: 12500 }
	] as Point3d[];

	const pointsStep2 = [
		{ x: 12500, y: 4000, z: 4000 },
		{ x: 9000, y: 4000, z: 3700 },
		{ x: 12500, y: 5000, z: 5000 },
		{ x: 9000, y: 5000, z: 4600 },
		{ x: 12500, y: 6000, z: 6000 },
		{ x: 9000, y: 6000, z: 5400 },
		{ x: 12500, y: 7000, z: 7000 },
		{ x: 9000, y: 7000, z: 6250 },
		{ x: 12500, y: 8000, z: 8000 },
		{ x: 9000, y: 8000, z: 7100 },
		{ x: 12500, y: 9000, z: 9000 },
		{ x: 9000, y: 9000, z: 7900 },
		{ x: 12500, y: 10000, z: 10000 },
		{ x: 9000, y: 10000, z: 8650 },
		{ x: 12500, y: 11000, z: 11000 },
		{ x: 9000, y: 11000, z: 9400 },
		{ x: 12500, y: 12000, z: 12000 },
		{ x: 9000, y: 12000, z: 10200 }
	] as Point3d[];

	const pointsStep3 = [
		{ x: -2, y: 4000, z: 4500 },
		{ x: 0, y: 4000, z: 4000 },
		{ x: 2, y: 4000, z: 3700 },
		{ x: -2, y: 5000, z: 5600 },
		{ x: 0, y: 5000, z: 5000 },
		{ x: 2, y: 5000, z: 4700 },
		{ x: -2, y: 6000, z: 6650 },
		{ x: 0, y: 6000, z: 6000 },
		{ x: 2, y: 6000, z: 5700 },
		{ x: -2, y: 7000, z: 7700 },
		{ x: 0, y: 7000, z: 7000 },
		{ x: 2, y: 7000, z: 6700 },
		{ x: -2, y: 8000, z: 8800 },
		{ x: 0, y: 8000, z: 8000 },
		{ x: 2, y: 8000, z: 7700 },
		{ x: -2, y: 9000, z: 9800 },
		{ x: 0, y: 9000, z: 9000 },
		{ x: 2, y: 9000, z: 8800 },
		{ x: -2, y: 10000, z: 10750 },
		{ x: 0, y: 10000, z: 10000 },
		{ x: 2, y: 10000, z: 9800 },
		{ x: -2, y: 11000, z: 11600 },
		{ x: 0, y: 11000, z: 11000 },
		{ x: 2, y: 11000, z: 10800 },
		{ x: -2, y: 12000, z: 12500 },
		{ x: 0, y: 12000, z: 12000 },
		{ x: 2, y: 12000, z: 11850 }
	] as Point3d[];

	const pointsStep4 = [
		{ x: -10, y: 3000, z: 3950 },
		{ x: 0, y: 3000, z: 3000 },
		{ x: 30, y: 3000, z: 2000 },
		{ x: -10, y: 4000, z: 5300 },
		{ x: 0, y: 4000, z: 4000 },
		{ x: 30, y: 4000, z: 2850 },
		{ x: -10, y: 5000, z: 6700 },
		{ x: 0, y: 5000, z: 5000 },
		{ x: 30, y: 5000, z: 3700 },
		{ x: -10, y: 6000, z: 7900 },
		{ x: 0, y: 6000, z: 6000 },
		{ x: 30, y: 6000, z: 4550 },
		{ x: -10, y: 7000, z: 9000 },
		{ x: 0, y: 7000, z: 7000 },
		{ x: 30, y: 7000, z: 5400 },
		{ x: -10, y: 8000, z: 10200 },
		{ x: 0, y: 8000, z: 8000 },
		{ x: 30, y: 8000, z: 6300 },
		{ x: -10, y: 9000, z: 11400 },
		{ x: 0, y: 9000, z: 9000 },
		{ x: 30, y: 9000, z: 7100 },
		{ x: -10, y: 10000, z: 12500 },
		{ x: 0, y: 10000, z: 10000 },
		{ x: 30, y: 10000, z: 7900 },
		{ x: -10, y: 11000, z: 13600 },
		{ x: 0, y: 11000, z: 11000 },
		{ x: 30, y: 11000, z: 8700 },
		{ x: -7, y: 12000, z: 14000 },
		{ x: 0, y: 12000, z: 12000 },
		{ x: 30, y: 12000, z: 9500 },
		{ x: -3, y: 13000, z: 14000 },
		{ x: 0, y: 13000, z: 13000 },
		{ x: 30, y: 13000, z: 10300 }
	] as Point3d[];

	const pointsStep5 = [
		{ x: 1, y: 2000, z: 2000 },
		{ x: 0.85, y: 2000, z: 1200 },
		{ x: 1, y: 3000, z: 3000 },
		{ x: 0.85, y: 3000, z: 2050 },
		{ x: 1, y: 4000, z: 4000 },
		{ x: 0.85, y: 4000, z: 2900 },
		{ x: 1, y: 5000, z: 5000 },
		{ x: 0.85, y: 5000, z: 3600 },
		{ x: 1, y: 6000, z: 6000 },
		{ x: 0.85, y: 6000, z: 4600 },
		{ x: 1, y: 7000, z: 7000 },
		{ x: 0.85, y: 7000, z: 5200 },
		{ x: 1, y: 8000, z: 8000 },
		{ x: 0.85, y: 8000, z: 6050 },
		{ x: 1, y: 9000, z: 9000 },
		{ x: 0.85, y: 9000, z: 6800 },
		{ x: 1, y: 10000, z: 10000 },
		{ x: 0.85, y: 10000, z: 7500 },
		{ x: 1, y: 11000, z: 11000 },
		{ x: 0.85, y: 11000, z: 8250 },
		{ x: 1, y: 12000, z: 12000 },
		{ x: 0.85, y: 12000, z: 9000 },
		{ x: 1, y: 13000, z: 13000 },
		{ x: 0.85, y: 13000, z: 9700 },
		{ x: 1, y: 14000, z: 14000 },
		{ x: 0.85, y: 14000, z: 10200 }
	] as Point3d[];

	return computer(
		[pointsStep1, pointsStep2, pointsStep3, pointsStep4, pointsStep5],
		oat,
		pa,
		weight,
		rwySlope,
		wind,
		v1vrRatio
	);
};

export const accelGoFlapsApproachLessThan10KPA = (
	oat: number,
	pa: number,
	weight: number,
	rwySlope: number,
	wind: number,
	v1vrRatio: number
) => {
	const pointsStep1 = [
		{ x: -14, y: -1000, z: 3000 },
		{ x: 50, y: -1000, z: 4350 },
		{ x: 54, y: -1000, z: 4800 },
		{ x: -15, y: 0, z: 3100 },
		{ x: 44, y: 0, z: 4400 },
		{ x: 52, y: 0, z: 5700 },
		{ x: -20, y: 2000, z: 3400 },
		{ x: 36, y: 2000, z: 4850 },
		{ x: 47, y: 2000, z: 6800 },
		{ x: -24, y: 4000, z: 3800 },
		{ x: 31, y: 4000, z: 5400 },
		{ x: 44, y: 4000, z: 8400 },
		{ x: -27, y: 6000, z: 4200 },
		{ x: 25, y: 6000, z: 6050 },
		{ x: 40, y: 6000, z: 12700 },
		{ x: -32, y: 8000, z: 4600 },
		{ x: 20, y: 8000, z: 6900 },
		{ x: 32, y: 8000, z: 15000 },
		{ x: -35, y: 10000, z: 5200 },
		{ x: 12, y: 10000, z: 7800 },
		{ x: 24, y: 10000, z: 15000 }
	] as Point3d[];

	const pointsStep2 = [
		{ x: 12500, y: 3000, z: 3000 },
		{ x: 11750, y: 3000, z: 2700 },
		{ x: 9000, y: 3000, z: 1800 },
		{ x: 12500, y: 4000, z: 4000 },
		{ x: 11750, y: 4000, z: 3500 },
		{ x: 9000, y: 4000, z: 2400 },
		{ x: 12500, y: 5000, z: 5000 },
		{ x: 11750, y: 5000, z: 4400 },
		{ x: 9000, y: 5000, z: 2800 },
		{ x: 12500, y: 6000, z: 6000 },
		{ x: 11750, y: 6000, z: 5150 },
		{ x: 9000, y: 6000, z: 3400 },
		{ x: 12500, y: 7000, z: 7000 },
		{ x: 11750, y: 7000, z: 5900 },
		{ x: 9000, y: 7000, z: 3800 },
		{ x: 12500, y: 8000, z: 8000 },
		{ x: 11750, y: 8000, z: 6600 },
		{ x: 9000, y: 8000, z: 4300 },
		{ x: 12500, y: 9000, z: 9000 },
		{ x: 11750, y: 9000, z: 7300 },
		{ x: 9000, y: 9000, z: 4650 },
		{ x: 12500, y: 10000, z: 10000 },
		{ x: 11750, y: 10000, z: 8000 },
		{ x: 9000, y: 10000, z: 5000 },
		{ x: 12500, y: 11000, z: 11000 },
		{ x: 11750, y: 11000, z: 8400 },
		{ x: 9000, y: 11000, z: 5100 },
		{ x: 12500, y: 12000, z: 12000 },
		{ x: 11750, y: 12000, z: 8900 },
		{ x: 9000, y: 12000, z: 5200 },
		{ x: 12500, y: 13000, z: 13000 },
		{ x: 11750, y: 13000, z: 9200 },
		{ x: 9000, y: 13000, z: 5450 },
		{ x: 12500, y: 14000, z: 14000 },
		{ x: 11750, y: 14000, z: 9500 },
		{ x: 9000, y: 14000, z: 5600 }
	] as Point3d[];

	const pointsStep3 = [
		{ x: -2, y: 2000, z: 1750 },
		{ x: 0, y: 2000, z: 2000 },
		{ x: 2, y: 2000, z: 2400 },
		{ x: -2, y: 3000, z: 2500 },
		{ x: 0, y: 3000, z: 3000 },
		{ x: 2, y: 3000, z: 4000 },
		{ x: -2, y: 4000, z: 3200 },
		{ x: 0, y: 4000, z: 4000 },
		{ x: 2, y: 4000, z: 6200 },
		{ x: -2, y: 5000, z: 4000 },
		{ x: 0, y: 5000, z: 5000 },
		{ x: 2, y: 5000, z: 10200 },
		{ x: -2, y: 6000, z: 4700 },
		{ x: 0, y: 6000, z: 6000 },
		{ x: 1.5, y: 6000, z: 12400 },
		{ x: -2, y: 7000, z: 5300 },
		{ x: 0, y: 7000, z: 7000 },
		{ x: 1, y: 7000, z: 12800 },
		{ x: -2, y: 8000, z: 5800 },
		{ x: 0, y: 8000, z: 8000 },
		{ x: 0.7, y: 8000, z: 13200 },
		{ x: -2, y: 9000, z: 6200 },
		{ x: 0, y: 9000, z: 9000 },
		{ x: 0.5, y: 9000, z: 13400 },
		{ x: -2, y: 10000, z: 6600 },
		{ x: 0, y: 10000, z: 10000 },
		{ x: 0.25, y: 10000, z: 13600 },
		{ x: -2, y: 11000, z: 7200 },
		{ x: 0, y: 11000, z: 11000 },
		{ x: -2, y: 12000, z: 7600 },
		{ x: 0, y: 12000, z: 12000 }
	] as Point3d[];

	const pointsStep4 = [
		{ x: -10, y: 1000, z: 1300 },
		{ x: 0, y: 1000, z: 1000 },
		{ x: -10, y: 2000, z: 2500 },
		{ x: 0, y: 2000, z: 2000 },
		{ x: 30, y: 2000, z: 1600 },
		{ x: -10, y: 3000, z: 3650 },
		{ x: 0, y: 3000, z: 3000 },
		{ x: 30, y: 3000, z: 2400 },
		{ x: -10, y: 4000, z: 5800 },
		{ x: 0, y: 4000, z: 4000 },
		{ x: 30, y: 4000, z: 3300 },
		{ x: -10, y: 5000, z: 6000 },
		{ x: 0, y: 5000, z: 5000 },
		{ x: 30, y: 5000, z: 4200 },
		{ x: -10, y: 6000, z: 7100 },
		{ x: 0, y: 6000, z: 6000 },
		{ x: 30, y: 6000, z: 5050 },
		{ x: -10, y: 7000, z: 8250 },
		{ x: 0, y: 7000, z: 7000 },
		{ x: 30, y: 7000, z: 5900 },
		{ x: -10, y: 8000, z: 9400 },
		{ x: 0, y: 8000, z: 8000 },
		{ x: 30, y: 8000, z: 6800 },
		{ x: -10, y: 9000, z: 10600 },
		{ x: 0, y: 9000, z: 9000 },
		{ x: 30, y: 9000, z: 7700 },
		{ x: -10, y: 10000, z: 11700 },
		{ x: 0, y: 10000, z: 10000 },
		{ x: 30, y: 10000, z: 8550 },
		{ x: -10, y: 11000, z: 12900 },
		{ x: 0, y: 11000, z: 11000 },
		{ x: 30, y: 11000, z: 9450 },
		{ x: -10, y: 12000, z: 14050 },
		{ x: 0, y: 12000, z: 12000 },
		{ x: 30, y: 12000, z: 10300 },
		{ x: -8.5, y: 13000, z: 15000 },
		{ x: 0, y: 13000, z: 13000 },
		{ x: 30, y: 13000, z: 11200 },
		{ x: -4, y: 14000, z: 15000 },
		{ x: 0, y: 14000, z: 14000 },
		{ x: 30, y: 14000, z: 12050 }
	] as Point3d[];

	const pointsStep5 = [
		{ x: 1, y: 1000, z: 1000 },
		{ x: 0.85, y: 1000, z: 1200 },
		{ x: 1, y: 2000, z: 2000 },
		{ x: 0.85, y: 2000, z: 2800 },
		{ x: 1, y: 3000, z: 3000 },
		{ x: 0.85, y: 3000, z: 4400 },
		{ x: 1, y: 4000, z: 4000 },
		{ x: 0.85, y: 4000, z: 6050 },
		{ x: 1, y: 5000, z: 5000 },
		{ x: 0.85, y: 5000, z: 7700 },
		{ x: 1, y: 6000, z: 6000 },
		{ x: 0.85, y: 6000, z: 9350 },
		{ x: 1, y: 7000, z: 7000 },
		{ x: 0.85, y: 7000, z: 11000 },
		{ x: 1, y: 8000, z: 8000 },
		{ x: 0.85, y: 8000, z: 12600 },
		{ x: 1, y: 9000, z: 9000 },
		{ x: 0.85, y: 9000, z: 14200 },
		{ x: 1, y: 10000, z: 10000 },
		{ x: 0.879, y: 10000, z: 15000 },
		{ x: 1, y: 11000, z: 11000 },
		{ x: 0.92, y: 11000, z: 15000 },
		{ x: 1, y: 12000, z: 12000 },
		{ x: 0.96, y: 12000, z: 15000 },
		{ x: 1, y: 13000, z: 13000 },
		{ x: 0.972, y: 13000, z: 15000 },
		{ x: 1, y: 14000, z: 14000 },
		{ x: 0.988, y: 14000, z: 15000 }
	] as Point3d[];

	return computer(
		[pointsStep1, pointsStep2, pointsStep3, pointsStep4, pointsStep5],
		oat,
		pa,
		weight,
		rwySlope,
		wind,
		v1vrRatio
	);
};

export const accelGoFlapsApproachGreaterThan10KPA = (
	oat: number,
	pa: number,
	weight: number,
	rwySlope: number,
	wind: number,
	v1vrRatio: number
) => {
	const pointsStep1 = [
		{ x: -35, y: 10000, z: 3000 },
		{ x: 12.5, y: 10000, z: 4200 },
		{ x: 32, y: 10000, z: 6700 },
		{ x: -36, y: 11000, z: 3100 },
		{ x: 10, y: 11000, z: 4500 },
		{ x: 31, y: 11000, z: 7600 },
		{ x: -38, y: 12000, z: 3350 },
		{ x: 5, y: 12000, z: 4700 },
		{ x: 28, y: 12000, z: 8600 },
		{ x: -41, y: 13000, z: 3600 },
		{ x: 1.5, y: 13000, z: 4900 },
		{ x: 26, y: 13000, z: 10100 },
		{ x: -44, y: 14000, z: 3800 },
		{ x: -1, y: 14000, z: 5200 },
		{ x: 22, y: 14000, z: 11400 }
	] as Point3d[];

	const pointsStep2 = [
		{ x: 9000, y: 2000, z: 2000 },
		{ x: 12500, y: 2000, z: 3300 },
		{ x: 9000, y: 3000, z: 3000 },
		{ x: 12500, y: 3000, z: 5300 },
		{ x: 9000, y: 4000, z: 4000 },
		{ x: 11500, y: 4000, z: 6000 },
		{ x: 12500, y: 4000, z: 7700 },
		{ x: 9000, y: 5000, z: 5000 },
		{ x: 11700, y: 5000, z: 8600 },
		{ x: 12500, y: 5000, z: 13950 },
		{ x: 9000, y: 6000, z: 6000 },
		{ x: 11300, y: 6000, z: 10000 },
		{ x: 11900, y: 6000, z: 15000 },
		{ x: 9000, y: 7000, z: 7000 },
		{ x: 10800, y: 7000, z: 10600 },
		{ x: 11400, y: 7000, z: 15000 },
		{ x: 9000, y: 8000, z: 8000 },
		{ x: 10300, y: 8000, z: 11000 },
		{ x: 10900, y: 8000, z: 15000 },
		{ x: 9000, y: 9000, z: 9000 },
		{ x: 10000, y: 9000, z: 11800 },
		{ x: 10600, y: 9000, z: 15000 },
		{ x: 9000, y: 10000, z: 10000 },
		{ x: 9800, y: 10000, z: 12600 },
		{ x: 10400, y: 10000, z: 15000 },
		{ x: 9000, y: 11000, z: 11000 },
		{ x: 9500, y: 11000, z: 12900 },
		{ x: 9875, y: 11000, z: 15000 },
		{ x: 9000, y: 12000, z: 12000 },
		{ x: 9350, y: 12000, z: 13600 },
		{ x: 9600, y: 12000, z: 15000 },
		{ x: 9000, y: 13000, z: 13000 },
		{ x: 9400, y: 13000, z: 15000 }
	] as Point3d[];

	const pointsStep3 = [
		{ x: -2, y: 2000, z: 1800 },
		{ x: 0, y: 2000, z: 2000 },
		{ x: 2, y: 2000, z: 2400 },
		{ x: -2, y: 3000, z: 2500 },
		{ x: 0, y: 3000, z: 3000 },
		{ x: 2, y: 3000, z: 4000 },
		{ x: -2, y: 4000, z: 3100 },
		{ x: 0, y: 4000, z: 4000 },
		{ x: 2, y: 4000, z: 6200 },
		{ x: -2, y: 5000, z: 4000 },
		{ x: 0, y: 5000, z: 5000 },
		{ x: 2, y: 5000, z: 10200 },
		{ x: -2, y: 6000, z: 4800 },
		{ x: 0, y: 6000, z: 6000 },
		{ x: 1.5, y: 6000, z: 12400 },
		{ x: -2, y: 7000, z: 5300 },
		{ x: 0, y: 7000, z: 7000 },
		{ x: 1, y: 7000, z: 12800 },
		{ x: -2, y: 8000, z: 5750 },
		{ x: 0, y: 8000, z: 8000 },
		{ x: 0.7, y: 8000, z: 13200 },
		{ x: -2, y: 9000, z: 6200 },
		{ x: 0, y: 9000, z: 9000 },
		{ x: 0.5, y: 9000, z: 13500 },
		{ x: -2, y: 10000, z: 6600 },
		{ x: 0, y: 10000, z: 10000 },
		{ x: 0.3, y: 10000, z: 13600 },
		{ x: -2, y: 11000, z: 7200 },
		{ x: 0, y: 11000, z: 11000 },
		{ x: -2, y: 12000, z: 7600 },
		{ x: 0, y: 12000, z: 12000 }
	] as Point3d[];

	const pointsStep4 = [
		{ x: -10, y: 1000, z: 1300 },
		{ x: 0, y: 1000, z: 1000 },
		{ x: -10, y: 2000, z: 2500 },
		{ x: 0, y: 2000, z: 2000 },
		{ x: 30, y: 2000, z: 1600 },
		{ x: -10, y: 3000, z: 3650 },
		{ x: 0, y: 3000, z: 3000 },
		{ x: 30, y: 3000, z: 2400 },
		{ x: -10, y: 4000, z: 4800 },
		{ x: 0, y: 4000, z: 4000 },
		{ x: 30, y: 4000, z: 3300 },
		{ x: -10, y: 5000, z: 6000 },
		{ x: 0, y: 5000, z: 5000 },
		{ x: 30, y: 5000, z: 4200 },
		{ x: -10, y: 6000, z: 7150 },
		{ x: 0, y: 6000, z: 6000 },
		{ x: 30, y: 6000, z: 5050 },
		{ x: -10, y: 7000, z: 8300 },
		{ x: 0, y: 7000, z: 7000 },
		{ x: 30, y: 7000, z: 5900 },
		{ x: -10, y: 8000, z: 9400 },
		{ x: 0, y: 8000, z: 8000 },
		{ x: 30, y: 8000, z: 6800 },
		{ x: -10, y: 9000, z: 10600 },
		{ x: 0, y: 9000, z: 9000 },
		{ x: 30, y: 9000, z: 7700 },
		{ x: -10, y: 10000, z: 11700 },
		{ x: 0, y: 10000, z: 10000 },
		{ x: 30, y: 10000, z: 8600 },
		{ x: -10, y: 11000, z: 12900 },
		{ x: 0, y: 11000, z: 11000 },
		{ x: 30, y: 11000, z: 9400 },
		{ x: -10, y: 12000, z: 14050 },
		{ x: 0, y: 12000, z: 12000 },
		{ x: 30, y: 12000, z: 10300 },
		{ x: -8.5, y: 13000, z: 15000 },
		{ x: 0, y: 13000, z: 13000 },
		{ x: 30, y: 13000, z: 11200 },
		{ x: -4, y: 14000, z: 14050 },
		{ x: 0, y: 14000, z: 14000 },
		{ x: 30, y: 14000, z: 12050 }
	] as Point3d[];

	const pointsStep5 = [
		{ x: 1, y: 1000, z: 1000 },
		{ x: 0.85, y: 1000, z: 1200 },
		{ x: 1, y: 2000, z: 2000 },
		{ x: 0.85, y: 2000, z: 2800 },
		{ x: 1, y: 3000, z: 3000 },
		{ x: 0.85, y: 3000, z: 4400 },
		{ x: 1, y: 4000, z: 4000 },
		{ x: 0.85, y: 4000, z: 6000 },
		{ x: 1, y: 5000, z: 5000 },
		{ x: 0.85, y: 5000, z: 7700 },
		{ x: 1, y: 6000, z: 6000 },
		{ x: 0.85, y: 6000, z: 9350 },
		{ x: 1, y: 7000, z: 7000 },
		{ x: 0.85, y: 7000, z: 11000 },
		{ x: 1, y: 8000, z: 8000 },
		{ x: 0.85, y: 8000, z: 12600 },
		{ x: 1, y: 9000, z: 9000 },
		{ x: 0.85, y: 9000, z: 14200 },
		{ x: 1, y: 10000, z: 10000 },
		{ x: 0.879, y: 10000, z: 15000 },
		{ x: 1, y: 11000, z: 11000 },
		{ x: 0.92, y: 11000, z: 15000 },
		{ x: 1, y: 12000, z: 12000 },
		{ x: 0.96, y: 12000, z: 15000 },
		{ x: 1, y: 13000, z: 13000 },
		{ x: 0.97, y: 13000, z: 15000 },
		{ x: 1, y: 14000, z: 14000 },
		{ x: 0.988, y: 14000, z: 15000 }
	] as Point3d[];

	return computer(
		[pointsStep1, pointsStep2, pointsStep3, pointsStep4, pointsStep5],
		oat,
		pa,
		weight,
		rwySlope,
		wind,
		v1vrRatio
	);
};

export const landingDistanceNoRevFlapsDownDry = (
	oat: number,
	pa: number,
	weight: number,
	rwySlope: number,
	wind: number,
	obstacleHeight: number = 50
) => {
	const pointsStep1 = [
		{ x: -15, y: 0, z: 2550 },
		{ x: 52, y: 0, z: 3200 },
		{ x: -19.5, y: 2000, z: 2700 },
		{ x: 48, y: 2000, z: 3450 },
		{ x: -23, y: 4000, z: 2850 },
		{ x: 44, y: 4000, z: 3650 },
		{ x: -28, y: 6000, z: 3050 },
		{ x: 40, y: 6000, z: 3900 },
		{ x: -31, y: 8000, z: 3200 },
		{ x: 37, y: 8000, z: 4200 },
		{ x: -35, y: 10000, z: 3400 },
		{ x: 32, y: 10000, z: 4500 }
	] as Point3d[];

	const pointsStep2 = [
		{ x: 12500, y: 2500, z: 2500 },
		{ x: 9000, y: 2500, z: 2000 },
		{ x: 12500, y: 2750, z: 2750 },
		{ x: 9000, y: 2750, z: 2200 },
		{ x: 12500, y: 3000, z: 3000 },
		{ x: 9000, y: 3000, z: 2400 },
		{ x: 12500, y: 3250, z: 3250 },
		{ x: 9000, y: 3250, z: 2600 },
		{ x: 12500, y: 3500, z: 3500 },
		{ x: 9000, y: 3500, z: 2800 },
		{ x: 12500, y: 3750, z: 3750 },
		{ x: 9000, y: 3750, z: 2950 },
		{ x: 12500, y: 4000, z: 4000 },
		{ x: 9000, y: 4000, z: 3150 },
		{ x: 12500, y: 4250, z: 4250 },
		{ x: 9000, y: 4250, z: 3300 },
		{ x: 12500, y: 4500, z: 4500 },
		{ x: 9000, y: 4500, z: 3500 }
	] as Point3d[];

	const pointsStep3 = [
		{ x: 2, y: 2000, z: 1800 },
		{ x: 0, y: 2000, z: 2000 },
		{ x: -2, y: 2000, z: 2300 },
		{ x: 2, y: 2400, z: 2150 },
		{ x: 0, y: 2400, z: 2400 },
		{ x: -2, y: 2400, z: 2750 },
		{ x: 2, y: 2800, z: 2500 },
		{ x: 0, y: 2800, z: 2800 },
		{ x: -2, y: 2800, z: 3200 },
		{ x: 2, y: 3150, z: 2850 },
		{ x: 0, y: 3150, z: 3150 },
		{ x: -2, y: 3150, z: 3600 },
		{ x: 2, y: 3500, z: 3200 },
		{ x: 0, y: 3500, z: 3500 },
		{ x: -2, y: 3500, z: 4050 },
		{ x: 2, y: 3800, z: 3500 },
		{ x: 0, y: 3800, z: 3800 },
		{ x: -2, y: 3800, z: 4500 },
		{ x: 2, y: 4300, z: 3900 },
		{ x: 0, y: 4300, z: 4300 },
		{ x: -2, y: 4300, z: 4900 },
		{ x: 2, y: 4650, z: 4200 },
		{ x: 0, y: 4650, z: 4650 },
		{ x: -2, y: 4650, z: 5300 }
	] as Point3d[];

	const pointsStep4 = [
		{ x: -10, y: 1800, z: 2400 },
		{ x: 0, y: 1800, z: 1800 },
		{ x: 30, y: 1800, z: 1300 },
		{ x: -10, y: 2300, z: 3200 },
		{ x: 0, y: 2300, z: 2300 },
		{ x: 30, y: 2300, z: 1750 },
		{ x: -10, y: 2850, z: 3750 },
		{ x: 0, y: 2850, z: 2850 },
		{ x: 30, y: 2850, z: 2200 },
		{ x: -10, y: 3400, z: 4400 },
		{ x: 0, y: 3400, z: 3400 },
		{ x: 30, y: 3400, z: 2600 },
		{ x: -10, y: 3900, z: 5000 },
		{ x: 0, y: 3900, z: 3900 },
		{ x: 30, y: 3900, z: 3100 },
		{ x: -10, y: 4400, z: 5600 },
		{ x: 0, y: 4400, z: 4400 },
		{ x: 30, y: 4400, z: 3500 },
		{ x: -10, y: 5000, z: 6200 },
		{ x: 0, y: 5000, z: 5000 },
		{ x: 30, y: 5000, z: 3900 },
		{ x: -10, y: 5500, z: 6600 },
		{ x: 0, y: 5500, z: 5500 },
		{ x: 30, y: 5500, z: 4300 }
	] as Point3d[];

	const pointsStep5 = [
		{ x: 50, y: 1300, z: 1300 },
		{ x: 0, y: 1300, z: 800 },
		{ x: 50, y: 1850, z: 1850 },
		{ x: 0, y: 1850, z: 1200 },
		{ x: 50, y: 2400, z: 2400 },
		{ x: 0, y: 2400, z: 1650 },
		{ x: 50, y: 2950, z: 2950 },
		{ x: 0, y: 2950, z: 2100 },
		{ x: 50, y: 3500, z: 3500 },
		{ x: 0, y: 3500, z: 2450 },
		{ x: 50, y: 4050, z: 4050 },
		{ x: 0, y: 4050, z: 2750 },
		{ x: 50, y: 4600, z: 4600 },
		{ x: 0, y: 4600, z: 3050 },
		{ x: 50, y: 5150, z: 5150 },
		{ x: 0, y: 5150, z: 3300 },
		{ x: 50, y: 5700, z: 5700 },
		{ x: 0, y: 5700, z: 3500 },
		{ x: 50, y: 6250, z: 6250 },
		{ x: 0, y: 6250, z: 3750 },
		{ x: 50, y: 6700, z: 6700 },
		{ x: 0, y: 6700, z: 4000 }
	] as Point3d[];

	return computer(
		[pointsStep1, pointsStep2, pointsStep3, pointsStep4, pointsStep5],
		oat,
		pa,
		weight,
		rwySlope,
		wind,
		obstacleHeight
	);
};

export const landingDistanceNoRevFlapsDownWet = (
	oat: number,
	pa: number,
	weight: number,
	rwySlope: number,
	wind: number,
	obstacleHeight: number = 50
) => {
	const pointsStep1 = [
		{ x: -15, y: 0, z: 3600 },
		{ x: 52, y: 0, z: 4600 },
		{ x: -19, y: 2000, z: 3800 },
		{ x: 48, y: 2000, z: 4850 },
		{ x: -23, y: 4000, z: 4100 },
		{ x: 44, y: 4000, z: 5200 },
		{ x: -27, y: 6000, z: 4300 },
		{ x: 40, y: 6000, z: 5500 },
		{ x: -31, y: 8000, z: 4550 },
		{ x: 36, y: 8000, z: 5900 },
		{ x: -35, y: 10000, z: 4900 },
		{ x: 32, y: 10000, z: 6300 }
	] as Point3d[];

	const pointsStep2 = [
		{ x: 12500, y: 3600, z: 3600 },
		{ x: 9000, y: 3600, z: 2950 },
		{ x: 12500, y: 3950, z: 3950 },
		{ x: 9000, y: 3950, z: 3200 },
		{ x: 12500, y: 4300, z: 4300 },
		{ x: 9000, y: 4300, z: 3500 },
		{ x: 12500, y: 4650, z: 4650 },
		{ x: 9000, y: 4650, z: 3750 },
		{ x: 12500, y: 5000, z: 5000 },
		{ x: 9000, y: 5000, z: 4000 },
		{ x: 12500, y: 5350, z: 5350 },
		{ x: 9000, y: 5350, z: 4300 },
		{ x: 12500, y: 5700, z: 5700 },
		{ x: 9000, y: 5700, z: 4550 },
		{ x: 12500, y: 6050, z: 6050 },
		{ x: 9000, y: 6050, z: 4800 },
		{ x: 12500, y: 6400, z: 6400 },
		{ x: 9000, y: 6400, z: 5100 }
	] as Point3d[];

	const pointsStep3 = [
		{ x: 0, y: 2900, z: 2900 },
		{ x: 2, y: 2900, z: 2500 },
		{ x: -2, y: 2900, z: 3450 },
		{ x: 0, y: 3400, z: 3400 },
		{ x: 2, y: 3400, z: 3000 },
		{ x: -2, y: 3400, z: 4000 },
		{ x: 0, y: 3900, z: 3900 },
		{ x: 2, y: 3900, z: 3400 },
		{ x: -2, y: 3900, z: 4600 },
		{ x: 0, y: 4400, z: 4400 },
		{ x: 2, y: 4400, z: 3850 },
		{ x: -2, y: 4400, z: 5200 },
		{ x: 0, y: 4900, z: 4900 },
		{ x: 2, y: 4900, z: 4300 },
		{ x: -2, y: 4900, z: 5800 },
		{ x: 0, y: 5400, z: 5400 },
		{ x: 2, y: 5400, z: 4700 },
		{ x: -2, y: 5400, z: 6450 },
		{ x: 0, y: 5900, z: 5900 },
		{ x: 2, y: 5900, z: 5200 },
		{ x: -2, y: 5900, z: 7000 },
		{ x: 0, y: 6400, z: 6400 },
		{ x: 2, y: 6400, z: 5600 },
		{ x: -2, y: 6400, z: 7600 }
	] as Point3d[];

	const pointsStep4 = [
		{ x: 0, y: 2500, z: 2500 },
		{ x: -10, y: 2500, z: 3400 },
		{ x: 30, y: 2500, z: 1800 },
		{ x: 0, y: 3200, z: 3200 },
		{ x: -10, y: 3200, z: 4350 },
		{ x: 30, y: 3200, z: 2400 },
		{ x: 0, y: 3950, z: 3950 },
		{ x: -10, y: 3950, z: 5300 },
		{ x: 30, y: 3950, z: 3000 },
		{ x: 0, y: 4700, z: 4700 },
		{ x: -10, y: 4700, z: 6150 },
		{ x: 30, y: 4700, z: 3600 },
		{ x: 0, y: 5400, z: 5400 },
		{ x: -10, y: 5400, z: 7000 },
		{ x: 30, y: 5400, z: 4200 },
		{ x: 0, y: 6150, z: 6150 },
		{ x: -10, y: 6150, z: 7800 },
		{ x: 30, y: 6150, z: 4800 },
		{ x: 0, y: 6850, z: 6850 },
		{ x: -10, y: 6850, z: 8650 },
		{ x: 30, y: 6850, z: 5350 },
		{ x: 0, y: 7600, z: 7600 },
		{ x: -10, y: 7600, z: 9450 },
		{ x: 30, y: 7600, z: 5900 }
	] as Point3d[];

	const pointsStep5 = [
		{ x: 50, y: 1800, z: 1800 },
		{ x: 0, y: 1800, z: 1300 },
		{ x: 50, y: 2600, z: 2600 },
		{ x: 0, y: 2600, z: 1950 },
		{ x: 50, y: 3400, z: 3400 },
		{ x: 0, y: 3400, z: 2650 },
		{ x: 50, y: 4200, z: 4200 },
		{ x: 0, y: 4200, z: 3400 },
		{ x: 50, y: 5000, z: 5000 },
		{ x: 0, y: 5000, z: 3950 },
		{ x: 50, y: 5800, z: 5800 },
		{ x: 0, y: 5800, z: 4500 },
		{ x: 50, y: 6600, z: 6600 },
		{ x: 0, y: 6600, z: 5100 },
		{ x: 50, y: 7400, z: 7400 },
		{ x: 0, y: 7400, z: 5600 },
		{ x: 50, y: 8200, z: 8200 },
		{ x: 0, y: 8200, z: 6100 },
		{ x: 50, y: 9000, z: 9000 },
		{ x: 0, y: 9000, z: 6550 },
		{ x: 50, y: 9800, z: 9800 },
		{ x: 0, y: 9800, z: 7000 }
	] as Point3d[];

	return computer(
		[pointsStep1, pointsStep2, pointsStep3, pointsStep4, pointsStep5],
		oat,
		pa,
		weight,
		rwySlope,
		wind,
		obstacleHeight
	);
};

export const landingDistanceNoRevFlapsUpDry = (landingDistanceNoRevFlapsDownDry: number) => {
	if (landingDistanceNoRevFlapsDownDry < 3800) return 1.4 * landingDistanceNoRevFlapsDownDry + 80;

	return 1.074074 * landingDistanceNoRevFlapsDownDry + 1318.5185;
};

export const landingDistanceNoRevFlapsUpWet = (landingDistanceNoRevFlapsDownWet: number) => {
	if (landingDistanceNoRevFlapsDownWet < 5500)
		return 1.567567 * landingDistanceNoRevFlapsDownWet + 21.6216;
	return 1.17105 * landingDistanceNoRevFlapsDownWet - 2159.21;
};

export const landingDistanceWithRevFlapsDownDry = (
	oat: number,
	pa: number,
	weight: number,
	rwySlope: number,
	wind: number,
	obstacleHeight: number = 50
) => {
	const pointsStep1 = [
		{ x: -15, y: 0, z: 1850 },
		{ x: 52, y: 0, z: 2350 },
		{ x: -19, y: 2000, z: 1975 },
		{ x: 48, y: 2000, z: 2500 },
		{ x: -23, y: 4000, z: 2100 },
		{ x: 44, y: 4000, z: 2700 },
		{ x: -27, y: 6000, z: 2225 },
		{ x: 40, y: 6000, z: 2900 },
		{ x: -31, y: 8000, z: 2350 },
		{ x: 36, y: 8000, z: 3100 },
		{ x: -35, y: 10000, z: 2525 },
		{ x: 32, y: 10000, z: 3325 }
	] as Point3d[];

	const pointsStep2 = [
		{ x: 12500, y: 1800, z: 1800 },
		{ x: 9000, y: 1800, z: 1450 },
		{ x: 12500, y: 2000, z: 2000 },
		{ x: 9000, y: 2000, z: 1600 },
		{ x: 12500, y: 2200, z: 2200 },
		{ x: 9000, y: 2200, z: 1725 },
		{ x: 12500, y: 2400, z: 2400 },
		{ x: 9000, y: 2400, z: 1875 },
		{ x: 12500, y: 2600, z: 2600 },
		{ x: 9000, y: 2600, z: 2000 },
		{ x: 12500, y: 2800, z: 2800 },
		{ x: 9000, y: 2800, z: 2150 },
		{ x: 12500, y: 3000, z: 3000 },
		{ x: 9000, y: 3000, z: 2300 },
		{ x: 12500, y: 3200, z: 3200 },
		{ x: 9000, y: 3200, z: 2425 },
		{ x: 12500, y: 3400, z: 3400 },
		{ x: 9000, y: 3400, z: 2575 }
	] as Point3d[];

	const pointsStep3 = [
		{ x: 0, y: 1400, z: 1400 },
		{ x: 2, y: 1400, z: 1300 },
		{ x: -2, y: 1400, z: 1550 },
		{ x: 0, y: 1700, z: 1700 },
		{ x: 2, y: 1700, z: 1575 },
		{ x: -2, y: 1700, z: 1875 },
		{ x: 0, y: 2000, z: 2000 },
		{ x: 2, y: 2000, z: 1750 },
		{ x: -2, y: 2000, z: 2200 },
		{ x: 0, y: 2300, z: 2300 },
		{ x: 2, y: 2300, z: 2150 },
		{ x: -2, y: 2300, z: 2550 },
		{ x: 0, y: 2600, z: 2600 },
		{ x: 2, y: 2600, z: 2425 },
		{ x: -2, y: 2600, z: 2375 },
		{ x: 0, y: 2900, z: 2900 },
		{ x: 2, y: 2900, z: 2700 },
		{ x: -2, y: 2900, z: 3200 },
		{ x: 0, y: 3200, z: 3200 },
		{ x: 2, y: 3200, z: 2975 },
		{ x: -2, y: 3200, z: 3525 },
		{ x: 0, y: 3500, z: 3500 },
		{ x: 2, y: 3500, z: 3250 },
		{ x: -2, y: 3500, z: 3850 }
	] as Point3d[];

	const pointsStep4 = [
		{ x: 0, y: 1300, z: 1300 },
		{ x: -10, y: 1300, z: 1750 },
		{ x: 30, y: 1300, z: 950 },
		{ x: 0, y: 1675, z: 1675 },
		{ x: -10, y: 1675, z: 2200 },
		{ x: 30, y: 1675, z: 1250 },
		{ x: 0, y: 2050, z: 2050 },
		{ x: -10, y: 2050, z: 2650 },
		{ x: 30, y: 2050, z: 1575 },
		{ x: 0, y: 2425, z: 2425 },
		{ x: -10, y: 2425, z: 3100 },
		{ x: 30, y: 2425, z: 1900 },
		{ x: 0, y: 2800, z: 2800 },
		{ x: -10, y: 2800, z: 3550 },
		{ x: 30, y: 2800, z: 2225 },
		{ x: 0, y: 3175, z: 3175 },
		{ x: -10, y: 3175, z: 3975 },
		{ x: 30, y: 3175, z: 2525 },
		{ x: 0, y: 3550, z: 3550 },
		{ x: -10, y: 3550, z: 4400 },
		{ x: 30, y: 3550, z: 2800 },
		{ x: 0, y: 3425, z: 3425 },
		{ x: -10, y: 3425, z: 4800 },
		{ x: 30, y: 3425, z: 3100 }
	] as Point3d[];

	const pointsStep5 = [
		{ x: 50, y: 900, z: 900 },
		{ x: 0, y: 900, z: 450 },
		{ x: 50, y: 1300, z: 1300 },
		{ x: 0, y: 1300, z: 750 },
		{ x: 50, y: 1700, z: 1700 },
		{ x: 0, y: 1700, z: 1050 },
		{ x: 50, y: 2100, z: 2100 },
		{ x: 0, y: 2100, z: 1300 },
		{ x: 50, y: 2500, z: 2500 },
		{ x: 0, y: 2500, z: 1550 },
		{ x: 50, y: 2900, z: 2900 },
		{ x: 0, y: 2900, z: 1775 },
		{ x: 50, y: 3300, z: 3300 },
		{ x: 0, y: 3300, z: 1950 },
		{ x: 50, y: 3700, z: 3700 },
		{ x: 0, y: 3700, z: 2075 },
		{ x: 50, y: 4100, z: 4100 },
		{ x: 0, y: 4100, z: 2200 },
		{ x: 50, y: 4500, z: 4500 },
		{ x: 0, y: 4500, z: 2325 },
		{ x: 50, y: 4900, z: 4900 },
		{ x: 0, y: 4900, z: 2450 }
	] as Point3d[];

	return computer(
		[pointsStep1, pointsStep2, pointsStep3, pointsStep4, pointsStep5],
		oat,
		pa,
		weight,
		rwySlope,
		wind,
		obstacleHeight
	);
};

export const landingDistanceWithRevFlapsDownWet = (
	oat: number,
	pa: number,
	weight: number,
	rwySlope: number,
	wind: number,
	obstacleHeight: number = 50
) => {
	const pointsStep1 = [
		{ x: -15, y: 0, z: 2700 },
		{ x: 52, y: 0, z: 3400 },
		{ x: -19, y: 2000, z: 2850 },
		{ x: 48, y: 2000, z: 3650 },
		{ x: -23, y: 4000, z: 3025 },
		{ x: 44, y: 4000, z: 3900 },
		{ x: -27, y: 6000, z: 3200 },
		{ x: 40, y: 6000, z: 4150 },
		{ x: -31, y: 8000, z: 3425 },
		{ x: 36, y: 8000, z: 4450 },
		{ x: -35, y: 1000, z: 3650 },
		{ x: 32, y: 10000, z: 4750 }
	] as Point3d[];

	const pointsStep2 = [
		{ x: 12500, y: 2700, z: 2700 },
		{ x: 9000, y: 2700, z: 2200 },
		{ x: 12500, y: 2975, z: 2975 },
		{ x: 9000, y: 2975, z: 2400 },
		{ x: 12500, y: 3250, z: 3250 },
		{ x: 9000, y: 3250, z: 2600 },
		{ x: 12500, y: 3525, z: 3525 },
		{ x: 9000, y: 3525, z: 2800 },
		{ x: 12500, y: 3800, z: 3800 },
		{ x: 9000, y: 3800, z: 3000 },
		{ x: 12500, y: 4075, z: 4075 },
		{ x: 9000, y: 4075, z: 3200 },
		{ x: 12500, y: 4350, z: 4350 },
		{ x: 9000, y: 4350, z: 3400 },
		{ x: 12500, y: 4625, z: 4625 },
		{ x: 9000, y: 4625, z: 3600 },
		{ x: 12500, y: 4400, z: 4400 },
		{ x: 9000, y: 4400, z: 3800 }
	] as Point3d[];

	const pointsStep3 = [
		{ x: 0, y: 2100, z: 2100 },
		{ x: 2, y: 2100, z: 1900 },
		{ x: -2, y: 2100, z: 2350 },
		{ x: 0, y: 2500, z: 2500 },
		{ x: 2, y: 2500, z: 2275 },
		{ x: -2, y: 2500, z: 2825 },
		{ x: 0, y: 2900, z: 2900 },
		{ x: 2, y: 2900, z: 2650 },
		{ x: -2, y: 2900, z: 3275 },
		{ x: 0, y: 3300, z: 3300 },
		{ x: 2, y: 3300, z: 3000 },
		{ x: -2, y: 3300, z: 3725 },
		{ x: 0, y: 3700, z: 3700 },
		{ x: 2, y: 3700, z: 3350 },
		{ x: -2, y: 3700, z: 4200 },
		{ x: 0, y: 4100, z: 4100 },
		{ x: 2, y: 4100, z: 3725 },
		{ x: -2, y: 4100, z: 4625 },
		{ x: 0, y: 4500, z: 4500 },
		{ x: 2, y: 4500, z: 4100 },
		{ x: -2, y: 4500, z: 5050 },
		{ x: 0, y: 4900, z: 4900 },
		{ x: 2, y: 4900, z: 4475 },
		{ x: -2, y: 4900, z: 5500 }
	] as Point3d[];

	const pointsStep4 = [
		{ x: 0, y: 1950, z: 1950 },
		{ x: -10, y: 1950, z: 2650 },
		{ x: 30, y: 1950, z: 1400 },
		{ x: 0, y: 2450, z: 2450 },
		{ x: -10, y: 2450, z: 3325 },
		{ x: 30, y: 2450, z: 1825 },
		{ x: 0, y: 3000, z: 3000 },
		{ x: -10, y: 3000, z: 3975 },
		{ x: 30, y: 3000, z: 2275 },
		{ x: 0, y: 3500, z: 3500 },
		{ x: -10, y: 3500, z: 4575 },
		{ x: 30, y: 3500, z: 2725 },
		{ x: 0, y: 4050, z: 4050 },
		{ x: -10, y: 4050, z: 5200 },
		{ x: 30, y: 4050, z: 3175 },
		{ x: 0, y: 4600, z: 4600 },
		{ x: -10, y: 4600, z: 5800 },
		{ x: 30, y: 4600, z: 3600 },
		{ x: 0, y: 5100, z: 5100 },
		{ x: -10, y: 5100, z: 6375 },
		{ x: 30, y: 5100, z: 4000 },
		{ x: 0, y: 5625, z: 5625 },
		{ x: -10, y: 5625, z: 7000 },
		{ x: 30, y: 5625, z: 4375 }
	] as Point3d[];

	const pointsStep5 = [
		{ x: 50, y: 1400, z: 1400 },
		{ x: 0, y: 1400, z: 925 },
		{ x: 50, y: 1950, z: 1950 },
		{ x: 0, y: 1950, z: 1400 },
		{ x: 50, y: 2500, z: 2500 },
		{ x: 0, y: 2500, z: 1825 },
		{ x: 50, y: 3050, z: 3050 },
		{ x: 0, y: 3050, z: 2300 },
		{ x: 50, y: 3600, z: 3600 },
		{ x: 0, y: 3600, z: 2675 },
		{ x: 50, y: 4150, z: 4150 },
		{ x: 0, y: 4150, z: 3050 },
		{ x: 50, y: 4700, z: 4700 },
		{ x: 0, y: 4700, z: 3425 },
		{ x: 50, y: 5250, z: 5250 },
		{ x: 0, y: 5250, z: 3750 },
		{ x: 50, y: 5800, z: 5800 },
		{ x: 0, y: 5800, z: 4050 },
		{ x: 50, y: 6350, z: 6350 },
		{ x: 0, y: 6350, z: 4325 },
		{ x: 50, y: 6900, z: 6900 },
		{ x: 0, y: 6900, z: 4600 }
	] as Point3d[];

	return computer(
		[pointsStep1, pointsStep2, pointsStep3, pointsStep4, pointsStep5],
		oat,
		pa,
		weight,
		rwySlope,
		wind,
		obstacleHeight
	);
};

export const landingDistanceWithRevFlapsUpDry = (landingDistanceWithRevFlapsDownDry: number) => {
	if (landingDistanceWithRevFlapsDownDry < 2250)
		return 1.25926 * landingDistanceWithRevFlapsDownDry + 216.6667;
	return 1.0218 * landingDistanceWithRevFlapsDownDry + 752.13;
};

export const landingDistanceWithRevFlapsUpWet = (landingDistanceWithRevFlapsDownWet: number) => {
	if (landingDistanceWithRevFlapsDownWet < 4000)
		return 1.42308 * landingDistanceWithRevFlapsDownWet + 7.6923;
	return 1.054545 * landingDistanceWithRevFlapsDownWet + 1481.818;
};

export const landingDistanceNoRevFlapsApproachDry = (
	oat: number,
	pa: number,
	weight: number,
	rwySlope: number,
	wind: number,
	obstacleHeight: number = 50
) => {
	const pointsStep1 = [
		{ x: -35, y: 0, z: 2050 },
		{ x: 52, y: 0, z: 2675 },
		{ x: -39, y: 2000, z: 2150 },
		{ x: 48, y: 2000, z: 2825 },
		{ x: -43, y: 4000, z: 2250 },
		{ x: 44, y: 4000, z: 2975 },
		{ x: -47, y: 6000, z: 2375 },
		{ x: 40, y: 6000, z: 3125 },
		{ x: -51, y: 8000, z: 2525 },
		{ x: 36, y: 8000, z: 3350 },
		{ x: -55, y: 10000, z: 2750 },
		{ x: 32, y: 10000, z: 3675 }
	] as Point3d[];

	const pointsStep2 = [
		{ x: 12500, y: 1900, z: 1900 },
		{ x: 9000, y: 1900, z: 1750 },
		{ x: 12500, y: 2250, z: 2250 },
		{ x: 9000, y: 2250, z: 2050 },
		{ x: 12500, y: 2600, z: 2600 },
		{ x: 9000, y: 2600, z: 2375 },
		{ x: 12500, y: 2950, z: 2950 },
		{ x: 9000, y: 2950, z: 2700 },
		{ x: 12500, y: 3300, z: 3300 },
		{ x: 9000, y: 3300, z: 3000 },
		{ x: 12500, y: 3650, z: 3650 },
		{ x: 9000, y: 3650, z: 3325 }
	] as Point3d[];

	const pointsStep3 = [
		{ x: 0, y: 1700, z: 1700 },
		{ x: 2, y: 1700, z: 1525 },
		{ x: -2, y: 1700, z: 1950 },
		{ x: 0, y: 2100, z: 2100 },
		{ x: 2, y: 2100, z: 1875 },
		{ x: -2, y: 2100, z: 2425 },
		{ x: 0, y: 2500, z: 2500 },
		{ x: 2, y: 2500, z: 2250 },
		{ x: -2, y: 2500, z: 2925 },
		{ x: 0, y: 2900, z: 2900 },
		{ x: 2, y: 2900, z: 2575 },
		{ x: -2, y: 2900, z: 3400 },
		{ x: 0, y: 3300, z: 3300 },
		{ x: 2, y: 3300, z: 2950 },
		{ x: -2, y: 3300, z: 3900 },
		{ x: 0, y: 3700, z: 3700 },
		{ x: 2, y: 3700, z: 3300 },
		{ x: -2, y: 3700, z: 4400 }
	] as Point3d[];

	const pointsStep4 = [
		{ x: 0, y: 1500, z: 1500 },
		{ x: -10, y: 1500, z: 1900 },
		{ x: 30, y: 1500, z: 1100 },
		{ x: 0, y: 2050, z: 2050 },
		{ x: -10, y: 2050, z: 2650 },
		{ x: 30, y: 2050, z: 1600 },
		{ x: 0, y: 2600, z: 2600 },
		{ x: -10, y: 2600, z: 3350 },
		{ x: 30, y: 2600, z: 2100 },
		{ x: 0, y: 3150, z: 3150 },
		{ x: -10, y: 3150, z: 3950 },
		{ x: 30, y: 3150, z: 2575 },
		{ x: 0, y: 3700, z: 3700 },
		{ x: -10, y: 3700, z: 4600 },
		{ x: 30, y: 3700, z: 3050 },
		{ x: 0, y: 4250, z: 4250 },
		{ x: -10, y: 4250, z: 5200 },
		{ x: 30, y: 4250, z: 3550 }
	] as Point3d[];

	const pointsStep5 = [
		{ x: 50, y: 1000, z: 1000 },
		{ x: 0, y: 1000, z: 550 },
		{ x: 50, y: 1500, z: 1500 },
		{ x: 0, y: 1500, z: 975 },
		{ x: 50, y: 2000, z: 2000 },
		{ x: 0, y: 2000, z: 1400 },
		{ x: 50, y: 2500, z: 2500 },
		{ x: 0, y: 2500, z: 1825 },
		{ x: 50, y: 3000, z: 3000 },
		{ x: 0, y: 3000, z: 2250 },
		{ x: 50, y: 3500, z: 3500 },
		{ x: 0, y: 3500, z: 2700 },
		{ x: 50, y: 4000, z: 4000 },
		{ x: 0, y: 4000, z: 3100 },
		{ x: 50, y: 4500, z: 4500 },
		{ x: 0, y: 4500, z: 3525 },
		{ x: 50, y: 5000, z: 5000 },
		{ x: 0, y: 5000, z: 3375 }
	] as Point3d[];

	return computer(
		[pointsStep1, pointsStep2, pointsStep3, pointsStep4, pointsStep5],
		oat,
		pa,
		weight,
		rwySlope,
		wind,
		obstacleHeight
	);
};

export const landingDistanceWithRevFlapsApproachDry = (
	oat: number,
	pa: number,
	weight: number,
	rwySlope: number,
	wind: number,
	obstacleHeight: number = 50
) => {
	const pointsStep1 = [
		{ x: -35, y: 0, z: 1775 },
		{ x: 52, y: 0, z: 2425 },
		{ x: -39, y: 2000, z: 1950 },
		{ x: 48, y: 2000, z: 2550 },
		{ x: -43, y: 4000, z: 2050 },
		{ x: 44, y: 4000, z: 2700 },
		{ x: -47, y: 6000, z: 2150 },
		{ x: 40, y: 6000, z: 2825 },
		{ x: -51, y: 8000, z: 2300 },
		{ x: 36, y: 8000, z: 3000 },
		{ x: -55, y: 10000, z: 2500 },
		{ x: 32, y: 10000, z: 3300 }
	] as Point3d[];

	const pointsStep2 = [
		{ x: 12500, y: 1700, z: 1700 },
		{ x: 9000, y: 1700, z: 1550 },
		{ x: 12500, y: 2000, z: 2000 },
		{ x: 9000, y: 2000, z: 1825 },
		{ x: 12500, y: 2300, z: 2300 },
		{ x: 9000, y: 2300, z: 2100 },
		{ x: 12500, y: 2600, z: 2600 },
		{ x: 9000, y: 2600, z: 2375 },
		{ x: 12500, y: 2900, z: 2900 },
		{ x: 9000, y: 2900, z: 2650 },
		{ x: 12500, y: 3200, z: 3200 },
		{ x: 9000, y: 3200, z: 2925 }
	] as Point3d[];

	const pointsStep3 = [
		{ x: 0, y: 1600, z: 1600 },
		{ x: 2, y: 1600, z: 1450 },
		{ x: -2, y: 1600, z: 1850 },
		{ x: 0, y: 1950, z: 1950 },
		{ x: 2, y: 1950, z: 1750 },
		{ x: -2, y: 1950, z: 2250 },
		{ x: 0, y: 2300, z: 2300 },
		{ x: 2, y: 2300, z: 2050 },
		{ x: -2, y: 2300, z: 2700 },
		{ x: 0, y: 2650, z: 2650 },
		{ x: 2, y: 2650, z: 2375 },
		{ x: -2, y: 2650, z: 3150 },
		{ x: 0, y: 3000, z: 3000 },
		{ x: 2, y: 3000, z: 2675 },
		{ x: -2, y: 3000, z: 3550 },
		{ x: 0, y: 3350, z: 3350 },
		{ x: 2, y: 3350, z: 3000 },
		{ x: -2, y: 3350, z: 4000 }
	] as Point3d[];

	const pointsStep4 = [
		{ x: 0, y: 1500, z: 1500 },
		{ x: -10, y: 1500, z: 1975 },
		{ x: 30, y: 1500, z: 1150 },
		{ x: 0, y: 2050, z: 2050 },
		{ x: -10, y: 2050, z: 2625 },
		{ x: 30, y: 2050, z: 1650 },
		{ x: 0, y: 2600, z: 2600 },
		{ x: -10, y: 2600, z: 3250 },
		{ x: 30, y: 2600, z: 2125 },
		{ x: 0, y: 3150, z: 3150 },
		{ x: -10, y: 3150, z: 3900 },
		{ x: 30, y: 3150, z: 2625 },
		{ x: 0, y: 3700, z: 3700 },
		{ x: -10, y: 3700, z: 4550 },
		{ x: 30, y: 3700, z: 3100 },
		{ x: 0, y: 4250, z: 4250 },
		{ x: -10, y: 4250, z: 5000 },
		{ x: 30, y: 4250, z: 3550 }
	] as Point3d[];

	const pointsStep5 = [
		{ x: 50, y: 1000, z: 1000 },
		{ x: 0, y: 1000, z: 525 },
		{ x: 50, y: 1500, z: 1500 },
		{ x: 0, y: 1500, z: 950 },
		{ x: 50, y: 2000, z: 2000 },
		{ x: 0, y: 2000, z: 1375 },
		{ x: 50, y: 2500, z: 2500 },
		{ x: 0, y: 2500, z: 1800 },
		{ x: 50, y: 3000, z: 3000 },
		{ x: 0, y: 3000, z: 2225 },
		{ x: 50, y: 3500, z: 3500 },
		{ x: 0, y: 3500, z: 2625 },
		{ x: 50, y: 4000, z: 4000 },
		{ x: 0, y: 4000, z: 3050 },
		{ x: 50, y: 4500, z: 4500 },
		{ x: 0, y: 4500, z: 3425 }
	] as Point3d[];

	return computer(
		[pointsStep1, pointsStep2, pointsStep3, pointsStep4, pointsStep5],
		oat,
		pa,
		weight,
		rwySlope,
		wind,
		obstacleHeight
	);
};

export const climbOneEngineInop = (oat: number, pa: number, weight: number) => {
	const pointsStep1 = [
		{ x: -15, y: 0, z: 750 },
		{ x: 43, y: 0, z: 550 },
		{ x: 52, y: 0, z: 410 },
		{ x: -19, y: 2000, z: 730 },
		{ x: 38, y: 2000, z: 520 },
		{ x: 48, y: 2000, z: 370 },
		{ x: -23, y: 4000, z: 710 },
		{ x: 32, y: 4000, z: 500 },
		{ x: 44, y: 4000, z: 330 },
		{ x: -27, y: 6000, z: 680 },
		{ x: 27, y: 6000, z: 480 },
		{ x: 40, y: 6000, z: 280 },
		{ x: -31, y: 8000, z: 660 },
		{ x: 20, y: 8000, z: 460 },
		{ x: 36, y: 8000, z: 230 },
		{ x: -35, y: 10000, z: 640 },
		{ x: 14, y: 10000, z: 440 },
		{ x: 32, y: 10000, z: 170 },
		{ x: -39, y: 12000, z: 600 },
		{ x: 7, y: 12000, z: 420 },
		{ x: 28, y: 12000, z: 100 },
		{ x: -43, y: 14000, z: 570 },
		{ x: -1, y: 14000, z: 400 },
		{ x: 24, y: 14000, z: 40 },
		{ x: -47, y: 16000, z: 530 },
		{ x: -8, y: 16000, z: 380 },
		{ x: 20, y: 16000, z: -30 },
		{ x: -51, y: 18000, z: 500 },
		{ x: -17, y: 18000, z: 360 },
		{ x: 16.5, y: 18000, z: -100 },
		{ x: -54, y: 20000, z: 460 },
		{ x: -25, y: 20000, z: 320 },
		{ x: 12.5, y: 20000, z: -170 },
		{ x: -54, y: 22000, z: 380 },
		{ x: -28.5, y: 22000, z: 210 },
		{ x: 8.5, y: 22000, z: -230 },
		{ x: -54, y: 24000, z: 250 },
		{ x: -32.5, y: 24000, z: 100 },
		{ x: 4.5, y: 24000, z: -290 },
		{ x: -54, y: 26000, z: 100 },
		{ x: -36.5, y: 26000, z: 0 },
		{ x: -5.5, y: 26000, z: -310 },
		{ x: -54, y: 28000, z: -30 },
		{ x: -40.5, y: 28000, z: -120 },
		{ x: -9.5, y: 28000, z: -410 },
		{ x: -54, y: 30000, z: -160 },
		{ x: -44.5, y: 30000, z: -220 },
		{ x: -13.5, y: 30000, z: -520 },
		{ x: -54, y: 32000, z: -320 },
		{ x: -48, y: 32000, z: -350 },
		{ x: -17.5, y: 32000, z: -610 }
	] as Point3d[];

	const pointsStep2 = [
		{ x: 12500, y: -800, z: -800 },
		{ x: 9000, y: -800, z: -520 },
		{ x: 12500, y: -600, z: -600 },
		{ x: 9000, y: -600, z: -320 },
		{ x: 12500, y: -400, z: -400 },
		{ x: 9000, y: -400, z: -80 },
		{ x: 12500, y: -200, z: -200 },
		{ x: 9000, y: -200, z: 140 },
		{ x: 12500, y: 0, z: 0 },
		{ x: 9000, y: 0, z: 380 },
		{ x: 12500, y: 200, z: 200 },
		{ x: 9000, y: 200, z: 610 },
		{ x: 12500, y: 400, z: 400 },
		{ x: 9000, y: 400, z: 840 },
		{ x: 12500, y: 600, z: 600 },
		{ x: 9000, y: 600, z: 1120 },
		{ x: 12500, y: 800, z: 800 },
		{ x: 9000, y: 800, z: 1360 }
	] as Point3d[];

	return computer([pointsStep1, pointsStep2], oat, pa, weight);
};

//console.log(computeWindComponents(132, 312, 20))
export const getAccelStopComputer = (settings: Settings) => {
	switch (settings.takeoffFlaps) {
		case 'Up':
			return settings.wetRunway ? accelStopFlapsUpWet : accelStopFlapsUpDry;
		case 'Approach':
			return settings.wetRunway ? accelStopFlapsApproachWet : accelStopFlapsApproachDry;
	}
};

export const getAccelGoComputer = (settings: Settings, pa: number) => {
	switch (settings.takeoffFlaps) {
		case 'Up':
			return pa > 10000 ? accelGoFlapsUpGreaterThan10KPA : accelGoFlapsUpLessThan10KPA;
		case 'Approach':
			return pa > 10000 ? accelGoFlapsApproachGreaterThan10KPA : accelGoFlapsApproachLessThan10KPA;
	}
};

export const getLandingComputer = (settings: Settings) => {
	switch (settings.landingReverse) {
		case false:
			switch (settings.landingFlaps) {
				case 'Up':
					return (
						oat: number,
						pa: number,
						weight: number,
						slope: number,
						wind: number,
						obstacleHeight: number
					) => {
						const dist =
							(settings.wetRunway
								? landingDistanceNoRevFlapsDownWet(oat, pa, weight, slope, wind, obstacleHeight)
								: landingDistanceNoRevFlapsDownDry(oat, pa, weight, slope, wind, obstacleHeight)) ??
							undefined;
						return dist
							? settings.wetRunway
								? landingDistanceNoRevFlapsUpWet(dist)
								: landingDistanceNoRevFlapsUpDry(dist)
							: undefined;
					};
				case 'Approach':
					return settings.wetRunway ? () => undefined : landingDistanceNoRevFlapsApproachDry;
				case 'Down':
					return settings.wetRunway
						? landingDistanceNoRevFlapsDownWet
						: landingDistanceNoRevFlapsDownDry;
			}
		case true:
			switch (settings.landingFlaps) {
				case 'Up':
					return (
						oat: number,
						pa: number,
						weight: number,
						slope: number,
						wind: number,
						obstacleHeight: number
					) => {
						const dist =
							(settings.wetRunway
								? landingDistanceWithRevFlapsDownWet(oat, pa, weight, slope, wind, obstacleHeight)
								: landingDistanceWithRevFlapsDownDry(
										oat,
										pa,
										weight,
										slope,
										wind,
										obstacleHeight
									)) ?? undefined;
						return dist
							? settings.wetRunway
								? landingDistanceWithRevFlapsUpWet(dist)
								: landingDistanceWithRevFlapsUpDry(dist)
							: undefined;
					};
				case 'Approach':
					return settings.wetRunway ? () => undefined : landingDistanceWithRevFlapsApproachDry;
				case 'Down':
					return settings.wetRunway
						? landingDistanceWithRevFlapsDownWet
						: landingDistanceWithRevFlapsDownDry;
			}
	}
};
