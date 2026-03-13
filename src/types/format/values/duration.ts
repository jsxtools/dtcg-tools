import type { JSONPointerReferenceObject } from "./../../format.js";

/** Represents the length of time in milliseconds an animation or animation cycle takes to complete. */
export interface DurationValue {
	/** An integer or floating-point value representing the numeric value. */
	value: number | JSONPointerReferenceObject;

	/** Unit of time. Supported values: 'ms' (millisecond), 's' (second). */
	unit: "ms" | "s" | JSONPointerReferenceObject;
}
