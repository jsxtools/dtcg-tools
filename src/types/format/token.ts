import type { JSONPointerReferenceObject, TokenValueReference } from "../format.js";
import type { TokenType, TokenValue, TokenValueMap } from "./tokenType.js";

/**
 * **Token**
 *
 * A token in the DTCG specification.
 */
export type Token = KnownTokenMixin | UnknownTokenMixin | ReferenceTokenMixin;

// #region User Definitions

export type KnownTokenMixin = {
	[T in TokenType]: {
		/** The token's value or a token value reference. */
		$value: TokenValueMap[T] | TokenValueReference;

		/** Represents the type of the token's value. */
		$type: T;

		/** Use this instead of $value for property-level references. */
		$ref?: never;
	};
}[TokenType] &
	SharedTokenProps;

export type UnknownTokenMixin = {
	/** The token's value or a token value reference. Mutually exclusive with $ref. */
	$value: TokenValue | TokenValueReference;

	/** Use this alongside `$value` and instead of `$ref` for known token values. */
	$type?: never;

	/** Use this instead of `$value` for property-level references. */
	$ref?: never;
} & SharedTokenProps;

export type ReferenceTokenMixin = JSONPointerReferenceObject & {
	/** Use this instead of `$ref` for known or unknown token values. */
	$value?: never;

	/** Use this instead of `$ref` for known or unknown token values. */
	$type?: never;
} & SharedTokenProps;

type SharedTokenProps = {
	/** A plain text description of the token. */
	$description?: string;

	/** Vendor-specific extensions. */
	$extensions?: {
		[k: string]: unknown;
	};

	/** Whether this token is deprecated. */
	$deprecated?: boolean | string;
};

// #endregion
