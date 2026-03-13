import type { TokenSourcesForModifiers } from "./modifier.js";
import type { TokenSourcesForSets } from "./set.js";

/**
 * An ordered array of sets and modifiers that determines the final resolution of tokens. Order is significant - tokens later in the array override earlier ones in case of conflict.
 *
 * @minItems 1
 */
export type ResolutionOrder = Array<ReferenceObjectForResolutionOrder | InlineSet | InlineModifier>;

// #region User Definitions

/**
 * **Reference Object (For Resolution Order)**
 *
 * A reference object for use within resolutionOrder. Can point to sets or modifiers but not other resolutionOrder items.
 */
export type ReferenceObjectForResolutionOrder = {
	/**
	 * **JSON Reference**
	 *
	 * A JSON Pointer (RFC 6901) or URI reference.
	 * Must point to a set (`#/sets/...`) or modifier (`#/modifiers/...`), never to resolutionOrder items (`#/resolutionOrder/...`).
	 */
	$ref: string;
};

export type InlineSet = {
	/**
	 * **Description**
	 *
	 * A human-readable description of the purpose of the set.
	 */
	description?: string;

	/**
	 * **Sources**
	 *
	 * An array of token sources.
	 * Can contain reference objects pointing to JSON files, inline token definitions, or any combination.
	 * If the array declares multiple sources, they will be merged in array order, meaning if a token is declared multiple times, the last occurrence in the array will be the final value.
	 */
	sources: TokenSourcesForSets;

	/**
	 * **Extensions**
	 *
	 * Vendor-specific extensions.
	 * Keys are vendor-specific namespaces.
	 */
	$extensions?: {
		[k: string]: unknown;
	};

	/**
	 * **Name**
	 *
	 * A unique name that MUST NOT conflict with any other name in resolutionOrder.
	 */
	name: string;

	/**
	 * **Type**
	 *
	 * MUST be `set` for inline set definitions.
	 */
	type: "set";
};

/**
 * **Inline Modifier**
 *
 * A modifier defined inline in the resolutionOrder array.
 * Must include `name` and `type` properties.
 */
export interface InlineModifier {
	/**
	 * **Description**
	 *
	 * A human-readable description of the purpose of the modifier.
	 */
	description?: string;

	/**
	 * **Contexts**
	 *
	 * A map of context names to arrays of token sources.
	 * Each context represents a possible variant (e.g., 'light' vs 'dark' for theme, 'small' vs 'large' for size).
	 */
	contexts: {
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

	/**
	 * **Name**
	 *
	 * A unique name that MUST NOT conflict with any other name in resolutionOrder.
	 */
	name: string;

	/**
	 * **Type**
	 *
	 * MUST be `modifier` for inline modifier definitions.
	 */
	type: "modifier";
}

// #endregion
