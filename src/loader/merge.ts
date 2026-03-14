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

	// ── Define a self-memoizing getter for every key ─────────────────────────
	// On first access the getter computes the value, overwrites itself with a
	// plain data property, and is never called again. After a single traversal
	// the object is indistinguishable from a regular {}.
	for (const key of keys) {
		Object.defineProperty(merged, key, {
			get(): unknown {
				// $type: own value, or fall back to the inherited type.
				let value: unknown = key === "$type" ? getNodeType() : undefined;

				if (value === undefined && key !== "$type") {
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
						value = mergeFormats(subFormats as Format[], effectiveRoot, getNodeType());
					} else if (hasLeaf) {
						// Deeply resolve aliases and $ref objects inside $value.
						value = key === "$value" ? resolveDeep(leafValue, effectiveRoot) : leafValue;
					}
				}

				// Replace this getter with the computed value so the object becomes
				// a plain data property after first access.
				Object.defineProperty(this, key, { value, enumerable: true, configurable: true });
				return value;
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

const isRef = (v: unknown): v is { $ref: string } =>
	isPlainObject(v) && typeof (v as RawObject).$ref === "string";

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

/**
 * Resolves a JSON Reference string (e.g. `"#/base/alpha/dark/$value/components"`)
 * against the merged root by walking the `/`-separated path literally.
 * Returns `undefined` for any missing segment.
 */
const resolveRef = (ref: string, root: RawObject): unknown => {
	if (!ref.startsWith("#/")) return undefined;
	let node: unknown = root;
	for (const seg of ref.slice(2).split("/")) {
		if (!isPlainObject(node)) return undefined;
		node = (node as RawObject)[seg];
	}
	return node;
};

/**
 * Recursively resolves DTCG alias strings and `$ref` objects anywhere they
 * appear inside a `$value` — including inside arrays and nested objects.
 */
const resolveDeep = (value: unknown, root: RawObject): unknown => {
	if (isAlias(value)) return resolveAlias(value, root);
	if (isRef(value)) return resolveRef(value.$ref, root);
	if (Array.isArray(value)) return value.map(item => resolveDeep(item, root));
	if (isPlainObject(value)) {
		const out: RawObject = Object.create(null);
		for (const k in value) out[k] = resolveDeep(value[k], root);
		return out;
	}
	return value;
};
