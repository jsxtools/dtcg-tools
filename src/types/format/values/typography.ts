import type { TokenValueReference } from "../../format.js";
import type { DimensionValue } from "./dimension.js";
import type { FontFamilyValue } from "./fontFamily.js";
import type { FontWeightValue } from "./fontWeight.js";
import type { NumberValue } from "./number.js";

/**
 * **Typography Value**
 *
 * Represents a typographic style.
 */
export interface TypographyValue {
	/** The typography's font. */
	fontFamily: FontFamilyValue | TokenValueReference;

	/** The size of the typography. */
	fontSize: DimensionValue | TokenValueReference;

	/** The weight of the typography. */
	fontWeight: FontWeightValue | TokenValueReference;

	/** The horizontal spacing between characters. */
	letterSpacing: DimensionValue | TokenValueReference;

	/** The vertical spacing between lines of typography (interpreted as a multiplier of fontSize). */
	lineHeight: NumberValue | TokenValueReference;
}
