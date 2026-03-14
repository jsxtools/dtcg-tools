import type { Format } from "../types/format.js";

/**
 * Merges an ordered array of DTCG {@link Format} objects into a single
 * combined token tree using lazy getters. Sources are applied left-to-right;
 * later entries override earlier ones at leaf (non-object) positions, while
 * nested groups are recursively merged so siblings from different sources are
 * preserved. Token aliases (`"{dot.path}"` strings in `$value`) are resolved
 * on access against the root of the merged tree, and `$type` is inherited from
 * ancestor groups when not declared on the token itself.
 *
 * @example
 * mergeFormats([
 *   { color: { red: { $type: "color", $value: "…" } } },
 *   { color: { blue: { $type: "color", $value: "…" } } },
 * ])
 * // → { color: { red: { … }, blue: { … } } }
 */
export const mergeFormats = (formats: Format[], root?: RawObject, inheritedType?: string): Format => {
	const merged = Object.create(null) as RawObject;
	const effectiveRoot = root ?? merged;

	// ── Collect every key that appears in any source ───────────────────────────
	const keys = new Set<string>();
	for (const format of formats) {
		for (const key in format as RawObject) keys.add(key);
	}

	// Expose inherited $type even if no source in this node defines one.
	if (!keys.has("$type") && inheritedType !== undefined) keys.add("$type");

	// ── Helper: effective $type for this node (own wins over inherited) ────────
	const getNodeType = (): string | undefined => {
		let ownType: string | undefined;
		for (const format of formats) {
			const t = (format as RawObject).$type;
			if (typeof t === "string") ownType = t;
		}
		return ownType ?? inheritedType;
	};

	// ── Define a lazy getter for every key ────────────────────────────────────
	for (const key of keys) {
		Object.defineProperty(merged, key, {
			get(): unknown {
				// $type: own value, or fall back to the inherited type.
				if (key === "$type") return getNodeType();

				const subFormats: RawObject[] = [];
				let leafValue: unknown;
				let hasLeaf = false;

				for (const format of formats) {
					const val = (format as RawObject)[key];
					if (val === undefined) continue;

					if (isPlainObject(val)) {
						subFormats.push(val);
					} else {
						// A later leaf (primitive or array) wins; reset sub-objects.
						subFormats.length = 0;
						leafValue = val;
						hasLeaf = true;
					}
				}

				if (subFormats.length > 0) {
					// Pass along the current node's effective type so children can inherit it.
					return mergeFormats(subFormats as Format[], effectiveRoot, getNodeType());
				}

				if (hasLeaf) {
					// Resolve DTCG alias strings in $value lazily against the merged root.
					if (key === "$value" && isAlias(leafValue)) {
						return resolveAlias(leafValue, effectiveRoot);
					}
					return leafValue;
				}

				return undefined;
			},
			enumerable: true,
			configurable: true,
		});
	}

	return merged as unknown as Format;
};

// ─── Internal ─────────────────────────────────────────────────────────────────

type RawObject = Record<string, unknown>;

const isPlainObject = (v: unknown): v is RawObject =>
	v !== null && typeof v === "object" && !Array.isArray(v);

const isAlias = (v: unknown): v is string =>
	typeof v === "string" && v.startsWith("{") && v.endsWith("}");

// Module-level cycle-detection set (safe because JS is single-threaded).
const resolvingAliases = new Set<string>();

/**
 * Resolves a DTCG alias string (e.g. `"{color.blue.800}"`) against the merged
 * root, returning the target token's `$value`. Returns `undefined` on missing
 * paths or detected cycles.
 */
const resolveAlias = (alias: string, root: RawObject): unknown => {
	const path = alias.slice(1, -1); // strip { }
	if (resolvingAliases.has(path)) return undefined; // cycle guard
	resolvingAliases.add(path);
	try {
		let node: unknown = root;
		for (const seg of path.split(".")) {
			if (!isPlainObject(node)) return undefined;
			node = node[seg];
		}
		// Read $value from the target node — this triggers that node's own getter,
		// so chains of aliases resolve automatically.
		return isPlainObject(node) && "$value" in node ? node.$value : undefined;
	} finally {
		resolvingAliases.delete(path);
	}
};
