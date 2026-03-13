import type { CurlyBraceReference, JSONPointerReferenceObject } from "../../format.js";

/**
 * **Font Family Value**
 *
 * Represents a font name or an array of font names (ordered from most to least preferred).
 */
export type FontFamilyValue = FontFamilyName | FontFamilyArray;

/** A single font name. */
export type FontFamilyName = CurlyBraceReference;

/**
 * An array of font names, ordered from most to least preferred.
 *
 * @minItems 1
 */
export type FontFamilyArray = Array<FontFamilyName | JSONPointerReferenceObject>;
