import type { JSONPointerReferenceObject } from "../../format.js";

/** Represents an amount of distance in a single dimension in the UI, such as a position, width, height, radius, or thickness. */
export interface DimensionValue {
	/** An integer or floating-point value representing the numeric value. */
	value: number | JSONPointerReferenceObject;

	/** Unit of distance. Supported values: 'px' (idealized pixel, equivalent to dp on Android and pt on iOS), 'rem' (multiple of system's default font size). */
	unit: "px" | "rem" | JSONPointerReferenceObject;
}
