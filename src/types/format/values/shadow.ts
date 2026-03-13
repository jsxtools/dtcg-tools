import type { JSONPointerReferenceObject, TokenValueReference } from "../../format.js";
import type { ColorValue } from "./color.js";
import type { DimensionValue } from "./dimension.js";

/**
 * **Shadow Value**
 *
 * Represents a shadow style.
 */
export type ShadowValue = ShadowObject | ShadowObjectArray;

/** Shadow Object */
export interface ShadowObject {
	/** The color of the shadow. */
	color: ColorValue | TokenValueReference;

	/** The horizontal offset that shadow has from the element it is applied to. */
	offsetX: DimensionValue | TokenValueReference;

	/** The vertical offset that shadow has from the element it is applied to. */
	offsetY: DimensionValue | TokenValueReference;

	/** The blur radius that is applied to the shadow. */
	blur: DimensionValue | TokenValueReference;

	/** The amount by which to expand or contract the shadow. */
	spread: DimensionValue | TokenValueReference;

	/** Whether this shadow is inside the containing shape (inner shadow) rather than a drop shadow (default: false). */
	inset?: boolean | JSONPointerReferenceObject;
}

// #region User Definitions

/**
 * Array of shadow objects and/or references to shadow tokens.
 *
 * @minItems 1
 */
export type ShadowObjectArray = Array<ShadowObject | TokenValueReference>;

// #endregion
