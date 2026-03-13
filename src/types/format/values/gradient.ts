import type { TokenValueReference } from "../../format.js";
import type { ColorValue } from "./color.js";

/**
 * **Gradient Value**
 *
 * Represents a color gradient.
 *
 * @minItems 1
 */
export type GradientValue = Array<GradientStop | TokenValueReference>;

// #region Definitions

/** Gradient Stop */
export interface GradientStop {
	/** The color value at the stop's position on the gradient. */
	color: ColorValue | TokenValueReference;

	/** The position of the stop along the gradient's axis (range [0, 1]). Values outside this range are clamped. */
	position: GradientStopPositionNumber | TokenValueReference;
}

// #endregion

// #region User Definitions

/**
 * The position of the stop along the gradient's axis (range [0, 1]). Values outside this range are clamped.
 *
 * @minimum 0
 * @maximum 1
 */
export type GradientStopPositionNumber = number;

// #endregion
