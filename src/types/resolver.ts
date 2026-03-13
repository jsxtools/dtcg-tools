import type { Modifier } from "./resolver/modifier.js";
import type { ResolutionOrder } from "./resolver/resolutionOrder.js";
import type { Set } from "./resolver/set.js";

/**
 * **DTCG Resolver Schema**
 *
 * Schema for the Design Tokens Community Group (DTCG) Resolver specification.
 */
export type Resolver = {
	/** URI reference to this JSON schema. */
	$schema?: string;

	/**
	 * **Name**
	 *
	 * A short, human-readable name for the document.
	 */
	name?: string;

	/**
	 * **Version**
	 *
	 * Version of the resolver specification.
	 */
	version: string;

	/**
	 * **Description**
	 *
	 * A human-readable description for this document.
	 */
	description?: string;

	/**
	 * **Token Sets**
	 *
	 * Definition of sets.
	 * A set is a collection of design tokens in DTCG format.
	 */
	sets?: {
		[name: string]: Set;
	};

	/**
	 * **Modifiers**
	 *
	 * Definition of modifiers.
	 * A modifier is similar to a set, but allows for conditional inclusion via the contexts map.
	 */
	modifiers?: {
		[name: string]: Modifier;
	};

	/**
	 * **Resolution Order**
	 *
	 * An ordered array of sets and modifiers that determines the final resolution of tokens.
	 * Order is significant - tokens later in the array override earlier ones in case of conflict.
	 */
	resolutionOrder: ResolutionOrder;

	/**
	 * **Definitions**
	 *
	 * Optional definitions that tools MAY support but MUST NOT throw an error when encountered.
	 */
	$defs?: {
		[name: string]: unknown;
	};
};
