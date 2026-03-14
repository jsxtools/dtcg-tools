import type { Format } from "../types/format.js";
import { parsePointer } from "./pointer.js";

// ─── Public API ───────────────────────────────────────────────────────────────

/** Merges ordered formats into a single lazily resolved token tree. */
export const mergeFormats = (formats: Format[]): Format =>
	buildNode(formats as RawObject[], formats as RawObject[], undefined, undefined, []) as unknown as Format;

// ─── Internal ─────────────────────────────────────────────────────────────────

type RawObject = Record<string, unknown>;

/** Returns `true` when a value is a plain object. */
const isPlainObject = (v: unknown): v is RawObject => v !== null && typeof v === "object" && !Array.isArray(v);
/** Returns `true` when a value is a DTCG alias string. */
const isAlias = (v: unknown): v is string => typeof v === "string" && v.startsWith("{") && v.endsWith("}");
/** Returns `true` when a value is a JSON reference object. */
const isRef = (v: unknown): v is { $ref: string } => isPlainObject(v) && typeof v.$ref === "string";
/** Converts a path array into a stable cycle-detection key. */
const pathToId = (path: readonly string[]): string => path.join(".") || "#";

/** Collects nested object values for a key across merged formats. */
const getSubFormats = (formats: readonly RawObject[], key: string): RawObject[] => {
	const subFormats: RawObject[] = [];

	for (const format of formats) {
		const value = format[key];
		if (value === undefined) continue;
		if (isPlainObject(value)) {
			subFormats.push(value);
		} else {
			subFormats.length = 0;
		}
	}

	return subFormats;
};

/** Resolves all format objects that exist at a nested path. */
const getFormatsAtPath = (formats: readonly RawObject[], path: readonly string[]): RawObject[] => {
	let currentFormats = formats as RawObject[];

	for (const segment of path) {
		currentFormats = getSubFormats(currentFormats, segment);
		if (currentFormats.length === 0) return [];
	}

	return currentFormats.some((format) => "$value" in format) ? [] : currentFormats;
};

/** Parses either an alias path or JSON Pointer path into segments. */
const parseReferencePath = (reference: string): string[] | undefined => {
	if (isAlias(reference)) return reference.slice(1, -1).split(".");
	try {
		return parsePointer(reference);
	} catch {
		return undefined;
	}
};

const resolvingExtends = new Set<string>();

/** Expands `$extends` references before a node is merged. */
const expandFormats = (formats: readonly RawObject[], rootFormats: readonly RawObject[], path: readonly string[]): RawObject[] => {
	const pathId = pathToId(path);
	if (resolvingExtends.has(pathId)) return [];

	resolvingExtends.add(pathId);
	try {
		const expandedFormats: RawObject[] = [];

		for (const format of formats) {
			const reference = typeof format.$extends === "string" ? format.$extends : undefined;
			if (reference) {
				const targetPath = parseReferencePath(reference);
				if (targetPath) {
					const targetFormats = getFormatsAtPath(rootFormats, targetPath);
					expandedFormats.push(...expandFormats(targetFormats, rootFormats, targetPath));
				}
			}

			expandedFormats.push(format);
		}

		return expandedFormats;
	} finally {
		resolvingExtends.delete(pathId);
	}
};

/** Builds a merged lazy node for a specific format path. */
const buildNode = (
	formats: RawObject[],
	rootFormats: RawObject[],
	root: RawObject | undefined,
	inheritedType: string | undefined,
	path: string[],
): RawObject => {
	const node = Object.create(null) as RawObject;
	// At the top level the node itself IS the resolution root; recursive calls
	// receive the already-established root so all aliases resolve to the same tree.
	const effectiveRoot = root ?? node;
	const effectiveFormats = expandFormats(formats, rootFormats, path);

	// Collect every key that appears across all sources.
	const keys = new Set<string>();
	for (const format of effectiveFormats) {
		for (const key in format) keys.add(key);
	}

	// Surface the inherited $type even when no source at this level declares one,
	// so that `tokens.color.blue.$type` correctly returns "color" when `$type` is
	// only defined on the parent group.
	if (!keys.has("$type") && inheritedType !== undefined) keys.add("$type");

	/** Returns the effective `$type` for the current node. */
	let nodeTypeResolved = false;
	let nodeType: string | undefined;
	const getNodeType = (): string | undefined => {
		if (!nodeTypeResolved) {
			nodeTypeResolved = true;
			for (const format of effectiveFormats) {
				if (typeof format.$type === "string") nodeType = format.$type;
			}
			nodeType ??= inheritedType;
		}
		return nodeType;
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
					// Single pass: partition sources for this key into sub-objects
					// (groups/tokens) and leaf values. A later leaf resets any
					// previously accumulated sub-objects (full override).
					const subFormats: RawObject[] = [];
					let leafValue: unknown;
					let hasLeaf = false;

					for (const format of effectiveFormats) {
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
						const sub = buildNode(subFormats, rootFormats, effectiveRoot, childType, [...path, key]);

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

/** Resolves a DTCG alias string against the merged token tree. */
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

/** Resolves a JSON Pointer reference against the merged token tree. */
const resolveRef = (ref: string, root: RawObject): unknown => {
	let path: string[];
	try {
		path = parsePointer(ref);
	} catch {
		return undefined;
	}

	let node: unknown = root;
	for (const seg of path) {
		// DTCG $ref paths are often written with "/$value/" as a literal path
		// segment. Since the merged tree auto-unwraps $value, that key no longer
		// exists at runtime — skip it so the walk lands in the resolved value.
		if (isPlainObject(node)) {
			if (seg === "$value" && !(seg in node)) continue;
			node = node[seg];
		} else if (Array.isArray(node)) {
			const index = Number(seg);
			node = Number.isInteger(index) ? node[index] : undefined;
		} else {
			return undefined;
		}
	}
	return node;
};

/** Recursively resolves aliases and `$ref` objects inside a `$value`. */
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
