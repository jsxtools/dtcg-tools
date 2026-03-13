import type { TokenValueReference } from "../../format.js";
import type { CubicBezierValue } from "./cubicBezier.js";
import type { DurationValue } from "./duration.js";

/**
 * **Transition Value**
 *
 * Represents an animated transition between two states.
 */
export interface TransitionValue {
	/** The duration of the transition. */
	duration: DurationValue | TokenValueReference;

	/** The time to wait before the transition begins. */
	delay: DurationValue | TokenValueReference;

	/** The timing function of the transition. */
	timingFunction: CubicBezierValue | TokenValueReference;
}
