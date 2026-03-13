import type { Format } from "../format.js";

/**
 * **Set**
 *
 * A set is a collection of design tokens in DTCG format. A set MUST contain a sources array with tokens declared directly, or a reference object pointing to a JSON file containing design tokens, or any combination of the two.
 */
export interface Set {
	/** **Description**
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
	 * Vendor-specific extensions. Keys are vendor-specific namespaces.
	 */
	$extensions?: {
		[k: string]: unknown;
	};
}

// #region Definitions

/**
 * **Reference Object (For Sets)**
 *
 * A reference object for use within sets. Cannot point to modifiers or resolutionOrder items.
 */
export interface ReferenceObjectForSets {
	/**
	 * **Reference**
	 *
	 * A JSON Pointer (RFC 6901) or URI reference. Sets MUST NOT reference modifiers (`#/modifiers/...`) or resolutionOrder items (`#/resolutionOrder/...`).
	 */
	$ref: string;
}

/**
 * **Token Sources (For Sets)**
 *
 * An array of token sources for sets - cannot reference modifiers or resolutionOrder items.
 */
export type TokenSourcesForSets = Array<ReferenceObjectForSets | Format>;

// #endregion
