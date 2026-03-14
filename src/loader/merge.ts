import type { Format } from "../types/format.js";

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Merges an ordered array of DTCG {@link Format} objects into a single token
 * tree with lazy resolution. Sources are applied left-to-right — later entries
 * override earlier ones at leaf positions while nested groups are recursively
 * merged so siblings from different sources coexist.
 *
 * **Lazy getters** — every property in the returned tree is a self-memoizing
 * getter. On first access it computes the value (resolving aliases, inheriting
 * `$type`, unwrapping `$value`), replaces itself with a plain data property,
 * and is never called again. The result is fully compatible with
 * `JSON.stringify` and `Object.keys`.
 *
 * **Alias resolution** — `"{dot.path}"` strings in `$value` are resolved
 * against the merged root. Chains resolve naturally because each getter fires
 * in turn as the tree is walked. Circular references return `undefined`.
 *
 * **Type inheritance** — `$type` declared on a group is automatically visible
 * on every descendant token that does not declare its own `$type`.
 *
 * **Unwrapping** — accessing a token path (e.g. `tokens.color.blue`) returns
 * its resolved value directly, not the `{ $type, $value }` wrapper object.
 *
 * @example
 * mergeFormats([
 *   { color: { red: { $type: "color", $value: "…" } } },
 *   { color: { blue: { $type: "color", $value: "…" } } },
 * ])
 * // → { color: { red: "…", blue: "…" } }
 */
export const mergeFormats = (formats: Format[]): Format => buildNode(formats as RawObject[], undefined, undefined) as unknown as Format;

// ─── Internal ─────────────────────────────────────────────────────────────────

type RawObject = Record<string, unknown>;

const isPlainObject = (v: unknown): v is RawObject => v !== null && typeof v === "object" && !Array.isArray(v);
const isAlias = (v: unknown): v is string => typeof v === "string" && v.startsWith("{") && v.endsWith("}");
const isRef = (v: unknown): v is { $ref: string } => isPlainObject(v) && typeof (v as RawObject).$ref === "string";

/**
 * Builds a merged node from `formats`. The `root` parameter is the top-level
 * merged object shared by all recursive calls (used as the alias resolution
 * root). On the first call `root` is `undefined`; `buildNode` sets itself as
 * the root and propagates it downward.
 */
const buildNode = (formats: RawObject[], root: RawObject | undefined, inheritedType: string | undefined): RawObject => {
	const node = Object.create(null) as RawObject;
	// At the top level the node itself IS the resolution root; recursive calls
	// receive the already-established root so all aliases resolve to the same tree.
	const effectiveRoot = root ?? node;

	// Collect every key that appears across all sources.
	const keys = new Set<string>();
	for (const format of formats) {
		for (const key in format) keys.add(key);
	}

	// Surface the inherited $type even when no source at this level declares one,
	// so that `tokens.color.blue.$type` correctly returns "color" when `$type` is
	// only defined on the parent group.
	if (!keys.has("$type") && inheritedType !== undefined) keys.add("$type");

	// Lazily compute the effective $type for this node.
	// The last source to declare a string $type wins; falls back to inherited.
	const getNodeType = (): string | undefined => {
		let ownType: string | undefined;
		for (const format of formats) {
			if (typeof format.$type === "string") ownType = format.$type;
		}
		return ownType ?? inheritedType;
	};

	// Define a self-memoizing getter for every key.
	// On first access the getter computes and caches the value as a plain data
	// property — subsequent reads are O(1) and `JSON.stringify` works as usual.
	for (const key of keys) {
		Object.defineProperty(node, key, {
			get(): unknown {
				// $type resolves immediately from inherited/own declarations.
				let value: unknown = key === "$type" ? getNodeType() : undefined;

				if (value === undefined && key !== "$type") {
					// Partition sources for this key into sub-objects (groups/tokens)
					// and leaf values (primitives/arrays). A later leaf resets any
					// previously accumulated sub-objects because it fully overrides them.
					const subFormats: RawObject[] = [];
					let leafValue: unknown;
					let hasLeaf = false;

					for (const format of formats) {
						const v = format[key];
						if (v === undefined) continue;
						if (isPlainObject(v)) {
							subFormats.push(v);
						} else {
							subFormats.length = 0;
							leafValue = v;
							hasLeaf = true;
						}
					}

					if (subFormats.length > 0) {
						// Merge the sub-objects recursively.
						// $type inheritance must NOT bleed into $value content — a
						// token's type is DTCG metadata on the token node, not on
						// the value object itself (e.g. a border's width inherits
						// "border" from its parent, which is wrong).
						const childType = key === "$value" ? undefined : getNodeType();
						const sub = buildNode(subFormats, effectiveRoot, childType);

						if ("$value" in sub) {
							// Leaf token: auto-unwrap so callers get the value directly
							// (e.g. tokens["focus-ring"].dark → the border object).
							value = sub.$value;
						} else if (key === "$value") {
							// $value is a composite plain object (border, color, …) —
							// resolve any alias strings or $ref objects nested inside it.
							value = resolveDeep(sub, effectiveRoot);
						} else {
							// Group node: expose as a navigable merged sub-tree.
							value = sub;
						}
					} else if (hasLeaf) {
						// Leaf scalar or array: resolve aliases/refs only inside $value.
						value = key === "$value" ? resolveDeep(leafValue, effectiveRoot) : leafValue;
					}
				}

				// Overwrite this getter with the computed value so it behaves exactly
				// like a plain data property from this point on.
				Object.defineProperty(this, key, { value, enumerable: true, configurable: true });
				return value;
			},
			enumerable: true,
			configurable: true,
		});
	}

	return node;
};

// ─── Alias / $ref resolution ──────────────────────────────────────────────────

// Module-level cycle-detection set. Safe because JS is single-threaded:
// add before recursing, delete in the `finally` block so a thrown error
// never leaves stale entries that would permanently block re-resolution.
const resolvingAliases = new Set<string>();

/**
 * Resolves a DTCG alias string (e.g. `"{color.blue.800}"`) by walking the
 * dot-separated path against the merged root. Returns `undefined` when:
 * - the path does not exist in the tree, or
 * - a circular reference is detected.
 *
 * Chained aliases resolve naturally because each token's getter fires in
 * turn as we descend — there is no need for explicit multi-hop logic.
 */
const resolveAlias = (alias: string, root: RawObject): unknown => {
	const path = alias.slice(1, -1); // strip surrounding { }
	if (resolvingAliases.has(path)) return undefined; // circular reference guard
	resolvingAliases.add(path);
	try {
		let node: unknown = root;
		for (const seg of path.split(".")) {
			if (!isPlainObject(node)) return undefined;
			node = node[seg]; // triggers the self-memoizing getter for that segment
		}
		// Because token nodes are auto-unwrapped, the node we land on IS the
		// resolved value — return it directly.
		return node;
	} finally {
		resolvingAliases.delete(path);
	}
};

/**
 * Resolves a JSON Reference string (e.g. `"#/base/alpha/dark/$value/components"`)
 * by walking the slash-separated path against the merged root. Returns `undefined`
 * for any missing segment. Silently skips `/$value/` segments that no longer
 * exist in the merged tree (DTCG document-pointer style vs. unwrapped runtime tree).
 */
const resolveRef = (ref: string, root: RawObject): unknown => {
	if (!ref.startsWith("#/")) return undefined;
	let node: unknown = root;
	for (const seg of ref.slice(2).split("/")) {
		if (!isPlainObject(node)) return undefined;
		// DTCG $ref paths are often written with "/$value/" as a literal path
		// segment. Since the merged tree auto-unwraps $value, that key no longer
		// exists at runtime — skip it so the walk lands in the resolved value.
		if (seg === "$value" && !(seg in node)) continue;
		node = node[seg];
	}
	return node;
};

/**
 * Recursively resolves DTCG aliases and `$ref` objects wherever they appear
 * inside a `$value` — including inside arrays and nested composite objects
 * such as shadows, borders, and gradients.
 */
const resolveDeep = (value: unknown, root: RawObject): unknown => {
	if (isAlias(value)) return resolveAlias(value, root);
	if (isRef(value)) return resolveRef(value.$ref, root);
	if (Array.isArray(value)) return value.map((item) => resolveDeep(item, root));
	if (isPlainObject(value)) {
		const resolved: RawObject = Object.create(null);
		for (const k in value) resolved[k] = resolveDeep(value[k], root);
		return resolved;
	}
	return value; // number, boolean, null, string literal — pass through unchanged
};
