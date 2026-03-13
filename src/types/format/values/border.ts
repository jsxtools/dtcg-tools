import type { TokenValueReference } from "../../format.js";
import type { ColorValue } from "./color.js";
import type { DimensionValue } from "./dimension.js";
import type { StrokeStyleValue } from "./strokeStyle.js";

/** Represents a border style. */
export interface BorderValue {
	/** The color of the border. */
	color: ColorValue | TokenValueReference;

	/** The width or thickness of the border. */
	width: DimensionValue | TokenValueReference;

	/** The border's style. */
	style: StrokeStyleValue | TokenValueReference;
}
