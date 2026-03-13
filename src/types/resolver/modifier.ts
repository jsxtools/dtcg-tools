import type { Format, JSONPointerReference } from "../format.js";

/**
 * A modifier is similar to a set, but allows for conditional inclusion via the contexts map.
 * A modifier MUST declare a contexts map of string values to arrays of token sources.
 */
export interface Modifier {
	/** A human-readable description of the purpose of the modifier. */
	description?: string;

	/**
	 * **Contexts**
	 *
	 * A map of context names to arrays of token sources.
	 * Each context represents a possible variant (e.g., 'light' vs 'dark' for theme, 'small' vs 'large' for size).
	 */
	contexts: {
		/** An array of token sources for this context. Can contain reference objects pointing to JSON files, inline token definitions, or any combination. If the array declares multiple sources, they will be merged in array order, meaning if a token is declared multiple times, the last occurrence in the array will be the final value. */
		[name: string]: TokenSourcesForModifiers;
	};

	/**
	 * **Default Context**
	 *
	 * An optional default value that MUST match one of the keys in contexts.
	 * If provided, tools will use this context when no input is provided for this modifier.
	 */
	default?: keyof this["contexts"];

	/**
	 * **Extensions**
	 *
	 * Vendor-specific extensions.
	 * Keys are vendor-specific namespaces.
	 */
	$extensions?: {
		[k: string]: unknown;
	};
}

// #region Definitions

/**
 * **Reference Object (For Modifiers)**
 *
 * A reference object for use within modifier contexts.
 * Cannot point to other modifiers or resolutionOrder items.
 */
export type ReferenceObjectForModifiers = {
	/**
	 * **JSON Reference**
	 *
	 * A reference object for use within modifier contexts.
	 * Cannot point to other modifiers or resolutionOrder items.
	 */
	$ref: JSONPointerReference;
};

/**
 * **Token Sources (For Modifiers)**
 *
 * An array of token sources for modifier contexts - can reference sets but not other modifiers or resolutionOrder items.
 */
export type TokenSourcesForModifiers = Array<ReferenceObjectForModifiers | Format>;

// #endregion
