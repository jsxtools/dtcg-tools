/** Parses a local JSON Pointer fragment into path segments. */
export const parsePointer = (pointer: string): string[] => {
	if (pointer === "#") return [];

	if (!pointer.startsWith("#/")) {
		throw new Error(`Expected a local JSON Pointer (e.g. "#/sets/core"), got: ${JSON.stringify(pointer)}`);
	}

	return pointer.slice(2).split("/").map(decodeSegment);
};

/** Returns the value at a path or `undefined` when it is missing. */
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

/** Returns `true` when a value is a non-array object. */
const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
