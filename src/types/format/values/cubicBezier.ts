import type { JSONPointerReferenceObject } from "../../format.js";

/**
 * Value schema for cubicBezier type tokens. Represents how the value of an animated property progresses towards completion over the duration of an animation, effectively creating visual effects such as acceleration, deceleration, and bounce.
 *
 * @minItems 4
 * @maxItems 4
 */
export type CubicBezierValue = [
	/** P1x - X coordinate of first control point. */
	P1x: XCoordinate,
	/** P1y - Y coordinate of first control point. */
	P1y: YCoordinate,
	/** P2x - X coordinate of second control point. */
	P2x: XCoordinate,
	/** P2y - Y coordinate of second control point. */
	P2y: YCoordinate,
];

// #region Definitions

/**
 * X coordinate of control point (must be between 0 and 1).
 *
 * @minimum 0
 * @maximum 1
 */
export type XCoordinate = number | JSONPointerReferenceObject;

/**
 * Y coordinate of control point (can be any real number).
 */
export type YCoordinate = number | JSONPointerReferenceObject;
