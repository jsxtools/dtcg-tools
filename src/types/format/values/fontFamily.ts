import type { JSONPointerReferenceObject } from "../../format.js";

/**
 * **Font Family Value**
 *
 * Represents a font name or an array of font names (ordered from most to least preferred).
 * Per spec §8.3, font family values are plain strings (e.g. "Roboto", "sans-serif").
 * To reference another token, use a `TokenValueReference` at the `$value` level.
 */
export type FontFamilyValue = FontFamilyName | FontFamilyArray;

/**
 * A single font family name (e.g. "Roboto", "Arial", "sans-serif").
 */
export type FontFamilyName = string;

/**
 * An array of font family names, ordered from most to least preferred.
 * Each element MAY also be a JSON Pointer reference to a font family token.
 *
 * @minItems 1
 */
export type FontFamilyArray = Array<FontFamilyName | JSONPointerReferenceObject>;
