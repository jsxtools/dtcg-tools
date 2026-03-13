import type { JSONPointerReferenceObject } from "../../format.js";
import type { DimensionValue } from "./dimension.js";

/** Represents the style applied to lines or borders.*/
export type StrokeStyleValue = StrokeStyleKeyword | StrokeStyleObject;

// #region User Definitions

export type StrokeStyleObject = {
	/**
	 * Array of dimension values specifying lengths of alternating dashes and gaps.
	 *
	 * @minItems 1
	 */
	dashArray: DimensionValue[] | JSONPointerReferenceObject;

	/**
	 * Line cap style, same meaning as SVG stroke-linecap attribute.
	 */
	lineCap: LineCapStyleKeyword | JSONPointerReferenceObject;
};

/**
 * Pre-defined stroke style values with the same meaning as CSS line style values.
 */
export type StrokeStyleKeyword = "solid" | "dashed" | "dotted" | "double" | "groove" | "ridge" | "outset" | "inset";

/**
 * Line cap style keyword.
 */
export type LineCapStyleKeyword = "round" | "butt" | "square";

// #endregion
