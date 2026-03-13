/**
 * **Font Weight Value**
 *
 * Represents a font weight as per the OpenType wght tag specification. Lower numbers represent lighter weights, higher numbers represent thicker weights.
 */
export type FontWeightValue = FontWeightValueNumeric | FontWeightValueString;

// #region User Definitions

/**
 * Numeric font weight value.
 *
 * @minimum 1
 * @maximum 1000
 */
export type FontWeightValueNumeric = number;

/**
 * Pre-defined font weight string value.
 */
export type FontWeightValueString =
	| "thin"
	| "hairline"
	| "extra-light"
	| "ultra-light"
	| "light"
	| "normal"
	| "regular"
	| "book"
	| "medium"
	| "semi-bold"
	| "demi-bold"
	| "bold"
	| "extra-bold"
	| "ultra-bold"
	| "black"
	| "heavy"
	| "extra-black"
	| "ultra-black";

// #endregion
