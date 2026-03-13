import type { GroupOrToken } from "./format/groupOrToken.js";
import type { Token } from "./format/token.js";
import type { TokenType } from "./format/tokenType.js";

export type Format = KnownDTCGFormatSchema | UnknownDTCGFormatSchema;

/**
 * JSON Schema for the Design Tokens Community Group (DTCG) Format specification.
 */
export interface KnownDTCGFormatSchema {
	/** URI reference to this JSON schema. */
	$schema?: string;

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

	/** Root token for this group. The `$root` token provides a base value for the group while allowing for variants or extensions. */
	$root?: Token;
}

export interface UnknownDTCGFormatSchema {
	/** Nested groups and tokens (see #/definitions/tokenOrGroupName for pattern definition). */
	[name: string]: GroupOrToken;
}

// #region Definitions

/**
 * **Token or Group Name**
 *
 * Valid token/group names: must not start with $ and must not contain `{`, `}`, or `.`.
 */
export type TokenOrGroupName = string;

/**
 * Curly brace reference (e.g., '{tokenName}' or '{group.nested.token}')
 */
export type CurlyBraceReference = `{${string}}`;

/**
 * **JSON Pointer Reference**
 *
 * JSON Pointer reference (RFC 6901) to a location in the document (e.g., '#/path/to/target')
 */
export type JSONPointerReference = `#/${string}`;

/**
 * **JSON Pointer Reference Object**
 *
 * Object containing a JSON Pointer reference for property-level references.
 */
export interface JSONPointerReferenceObject {
	$ref: JSONPointerReference;
}

/**
 * **Token Value Reference**
 *
 * A reference to a token value using either curly brace syntax or JSON Pointer syntax.
 */
export type TokenValueReference = CurlyBraceReference | JSONPointerReferenceObject;

// #endregion
