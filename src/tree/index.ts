import type { TokenType, TokenValue } from "../types/format/tokenType.js";
import type { Format } from "../types/format.js";

const nodeInspect = Symbol.for("nodejs.util.inspect.custom");

// ─── Public Types ─────────────────────────────────────────────────────────────

export type TokenNode = TokenGroup | TokenLeaf;

// ─── TokenLeaf ────────────────────────────────────────────────────────────────

/** A resolved design token with an inherited or own type and a concrete value. */
export class TokenLeaf {
	/** The token type, resolved from the token itself or the nearest ancestor group. */
	readonly type: TokenType | string;

	/** The token's raw value. */
	readonly value: TokenValue | unknown;

	constructor(type: string, value: unknown) {
		this.type = type;
		this.value = value;
	}

	[nodeInspect]() {
		return Object.assign(new (class TokenLeaf {})(), { type: this.type, value: this.value });
	}
}

// ─── TokenGroup ───────────────────────────────────────────────────────────────

/** A named collection of child {@link TokenGroup}s and {@link TokenLeaf}s. */
export class TokenGroup {
	readonly #children: ReadonlyMap<string, TokenNode>;

	constructor(children: ReadonlyMap<string, TokenNode>) {
		this.#children = children;
	}

	/** Returns the child node with the given name, or `undefined` if absent. */
	get(name: string): TokenNode | undefined {
		return this.#children.get(name);
	}

	/** Number of direct children. */
	get size(): number {
		return this.#children.size;
	}

	/** Iterates over `[name, node]` pairs of direct children. */
	[Symbol.iterator](): IterableIterator<[string, TokenNode]> {
		return this.#children.entries();
	}

	[nodeInspect]() {
		return Object.assign(new (class TokenGroup {})(), Object.fromEntries(this.#children));
	}
}

// ─── createTree ───────────────────────────────────────────────────────────────

/**
 * Maps a merged DTCG {@link Format} document into a navigable tree of
 * {@link TokenGroup}s and {@link TokenLeaf}s, with `$type` inherited from
 * ancestor groups wherever it is not declared on the token itself.
 *
 * @example
 * const { tokens } = load("./design-tokens.resolver.json")
 * const tree = createTree(tokens)
 * const drawer = tree.get("z-index")?.get("drawer") as TokenLeaf
 * console.log(drawer.type, drawer.value) // "number", 700
 */
export const createTree = (format: Format): TokenGroup => buildGroup(format as RawObject, undefined);

// ─── Internal ─────────────────────────────────────────────────────────────────

type RawObject = Record<string, unknown>;

const buildGroup = (raw: RawObject, parentType: string | undefined): TokenGroup => {
	const ownType = typeof raw.$type === "string" ? raw.$type : parentType;
	const children = new Map<string, TokenNode>();

	for (const key in raw) {
		const val = raw[key];
		if (key.startsWith("$") || !isObject(val)) continue;

		children.set(
			key,
			"$value" in val
				? new TokenLeaf(typeof val.$type === "string" ? val.$type : (ownType ?? ""), val.$value)
				: buildGroup(val, ownType),
		);
	}

	return new TokenGroup(children);
};

const isObject = (v: unknown): v is RawObject => v !== null && typeof v === "object" && !Array.isArray(v);
