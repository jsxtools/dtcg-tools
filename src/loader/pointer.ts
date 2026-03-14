/**
 * Parses a local JSON Pointer (RFC 6901) fragment into an array of path segments.
 * Only document-local pointers beginning with `#` are supported.
 *
 * @example parsePointer("#/sets/core") // ["sets", "core"]
 * @example parsePointer("#")           // []
 */
export const parsePointer = (pointer: string): string[] => {
	if (pointer === "#") return [];

	if (!pointer.startsWith("#/")) {
		throw new Error(`Expected a local JSON Pointer (e.g. "#/sets/core"), got: ${JSON.stringify(pointer)}`);
	}

	return pointer.slice(2).split("/").map(decodeSegment);
};

/**
 * Traverses a document by an array of path segments, returning the value at
 * that location, or `undefined` if any step along the path is missing.
 *
 * @example getAtPath(doc, ["sets", "core"]) // doc.sets.core
 */
export const getAtPath = (root: unknown, path: readonly string[]): unknown => {
	let node: unknown = root;

	for (const key of path) {
		if (Array.isArray(node)) {
			const index = Number(key);
			node = Number.isInteger(index) ? node[index] : undefined;
		} else if (isObject(node)) {
			node = node[key];
		} else {
			return undefined;
		}
	}

	return node;
};

// ─── Internal ─────────────────────────────────────────────────────────────────

/** Decodes a single RFC 6901 pointer segment (`~1` → `/`, `~0` → `~`). */
const decodeSegment = (segment: string): string => segment.replaceAll("~1", "/").replaceAll("~0", "~");

const isObject = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === "object" && !Array.isArray(value);
