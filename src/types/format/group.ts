import type { CurlyBraceReference, JSONPointerReference } from "../format.js";
import type { GroupOrToken } from "./groupOrToken.js";
import type { Token } from "./token.js";
import type { TokenType } from "./tokenType.js";

/**
 * **Group**
 *
 * A group in the DTCG specification
 */
export type Group = KnownGroup & PatternGroup;

export interface KnownGroup {
	/** The type for tokens in this group (inherited by nested tokens unless overridden). */
	$type?: TokenType;

	/** A plain text description of the group. */
	$description?: string;

	/** Vendor-specific extensions. */
	$extensions?: {
		[k: string]: unknown;
	};

	/** Reference to another group to inherit tokens and properties from. */
	$extends?: CurlyBraceReference | JSONPointerReference;

	/** Whether this group is deprecated. */
	$deprecated?: boolean | string;

	/** Root token for this group. The $root token provides a base value for the group while allowing for variants or extensions. */
	$root?: Token;
}

/** Nested groups and tokens (see ../format.json#/definitions/tokenOrGroupName for pattern definition). */
export interface PatternGroup {
	[name: string]: GroupOrToken;
}
