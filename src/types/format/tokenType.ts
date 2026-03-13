import type { BorderValue } from "./values/border.js";
import type { ColorValue } from "./values/color.js";
import type { CubicBezierValue } from "./values/cubicBezier.js";
import type { DimensionValue } from "./values/dimension.js";
import type { DurationValue } from "./values/duration.js";
import type { FontFamilyValue } from "./values/fontFamily.js";
import type { FontWeightValue } from "./values/fontWeight.js";
import type { GradientValue } from "./values/gradient.js";
import type { NumberValue } from "./values/number.js";
import type { ShadowValue } from "./values/shadow.js";
import type { StrokeStyleValue } from "./values/strokeStyle.js";
import type { TransitionValue } from "./values/transition.js";
import type { TypographyValue } from "./values/typography.js";

/** A token type in the DTCG specification. */
export type TokenType = string & keyof TokenValueMap;

// #region User Definitions

export type TokenValue = TokenValueMap[TokenType];

export interface TokenValueMap {
	color: ColorValue;
	dimension: DimensionValue;
	fontFamily: FontFamilyValue;
	fontWeight: FontWeightValue;
	duration: DurationValue;
	cubicBezier: CubicBezierValue;
	number: NumberValue;
	strokeStyle: StrokeStyleValue;
	border: BorderValue;
	transition: TransitionValue;
	shadow: ShadowValue;
	gradient: GradientValue;
	typography: TypographyValue;
}

// #endregion
