import type { Format } from "../types/format.js";
import { parsePointer } from "./pointer.js";

// ─── Public API ───────────────────────────────────────────────────────────────

/** Merges ordered DTCG formats into a single lazily-resolved token tree. */
export const mergeFormats = (formats: Format[]): Format =>
	buildNode(formats as RawObject[], formats as RawObject[], undefined, undefined, []) as unknown as Format;

// ─── Internal ─────────────────────────────────────────────────────────────────

type RawObject = Record<string, unknown>;

/** Returns `true` when `v` is a non-array object. */
const isPlainObject = (v: unknown): v is RawObject => v !== null && typeof v === "object" && !Array.isArray(v);

/** Returns `true` when `v` is a DTCG alias string (e.g. `"{color.blue}"`). */
const isAlias = (v: unknown): v is string => typeof v === "string" && v.startsWith("{") && v.endsWith("}");

/** Returns `true` when `v` is a JSON reference object (e.g. `{ "$ref": "#/…" }`). */
const isRef = (v: unknown): v is { $ref: string } => isPlainObject(v) && typeof v.$ref === "string";

/** Joins a path into a dot-separated key for cycle detection. */
const pathToId = (path: readonly string[]): string => path.join(".") || "#";

/** Collects the sub-objects for `key` across `formats`, resetting on non-object override. */
const getSubFormats = (formats: readonly RawObject[], key: string): RawObject[] => {
	const subs: RawObject[] = [];

	for (const format of formats) {
		const v = format[key];
		if (v === undefined) continue;
		if (isPlainObject(v)) {
			subs.push(v);
		} else {
			subs.length = 0;
		}
	}

	return subs;
};

/** Walks `path` through `formats` and returns the group-level sub-objects found there. */
const getFormatsAtPath = (formats: readonly RawObject[], path: readonly string[]): readonly RawObject[] => {
	let current: readonly RawObject[] = formats;

	for (const segment of path) {
		current = getSubFormats(current, segment);
		if (current.length === 0) return [];
	}

	return current.some((f) => "$value" in f) ? [] : current;
};

/** Parses an alias string or JSON Pointer into path segments, or `undefined` on failure. */
const parseReferencePath = (ref: string): string[] | undefined => {
	if (isAlias(ref)) return ref.slice(1, -1).split(".");
	try {
		return parsePointer(ref);
	} catch {
		return undefined;
	}
};

// Module-level cycle-detection set for $extends. Safe because JS is
// single-threaded; add before recursing, delete in the `finally` block.
const resolvingExtends = new Set<string>();

/** Prepends inherited formats from `$extends` targets before each local format. */
const expandFormats = (formats: readonly RawObject[], rootFormats: readonly RawObject[], path: readonly string[]): RawObject[] => {
	const id = pathToId(path);
	if (resolvingExtends.has(id)) return [];

	resolvingExtends.add(id);
	try {
		const out: RawObject[] = [];

		for (const format of formats) {
			const ref = typeof format.$extends === "string" ? format.$extends : undefined;
			if (ref) {
				const targetPath = parseReferencePath(ref);
				if (targetPath) {
					out.push(...expandFormats(getFormatsAtPath(rootFormats, targetPath), rootFormats, targetPath));
				}
			}
			out.push(format);
		}

		return out;
	} finally {
		resolvingExtends.delete(id);
	}
};

/** Builds a merged lazy node for the formats at `path`. */
const buildNode = (
	formats: RawObject[],
	rootFormats: RawObject[],
	root: RawObject | undefined,
	inheritedType: string | undefined,
	path: string[],
): RawObject => {
	const node = Object.create(null) as RawObject;
	const effectiveRoot = root ?? node; // top-level call: the node IS the root
	const effectiveFormats = expandFormats(formats, rootFormats, path);

	// Collect every key across all sources.
	const keys = new Set<string>();
	for (const format of effectiveFormats) {
		for (const key in format) keys.add(key);
	}

	// Surface inherited $type so descendants see it even when no local source declares one.
	if (!keys.has("$type") && inheritedType !== undefined) keys.add("$type");

	// Memoised $type resolver — scans sources once and caches the result.
	let nodeTypeResolved = false;
	let nodeType: string | undefined;
	const getNodeType = (): string | undefined => {
		if (!nodeTypeResolved) {
			nodeTypeResolved = true;
			for (const fmt of effectiveFormats) {
				if (typeof fmt.$type === "string") nodeType = fmt.$type;
			}
			nodeType ??= inheritedType;
		}
		return nodeType;
	};

	// Self-memoising getter for every key. On first access the getter computes
	// the value, replaces itself with a plain data property, and never runs again.
	for (const key of keys) {
		Object.defineProperty(node, key, {
			get(): unknown {
				let value: unknown = key === "$type" ? getNodeType() : undefined;

				if (value === undefined && key !== "$type") {
					// Single pass: collect sub-objects and track the last leaf value.
					// A later leaf resets accumulated sub-objects (full override).
					const subs: RawObject[] = [];
					let leaf: unknown;
					let hasLeaf = false;

					for (const fmt of effectiveFormats) {
						const v = fmt[key];
						if (v === undefined) continue;
						if (isPlainObject(v)) {
							subs.push(v);
						} else {
							subs.length = 0;
							leaf = v;
							hasLeaf = true;
						}
					}

					if (subs.length > 0) {
						// $type must NOT bleed into $value — it is metadata on
						// the token node, not on the value object itself.
						const childType = key === "$value" ? undefined : getNodeType();
						const sub = buildNode(subs, rootFormats, effectiveRoot, childType, [...path, key]);

						if ("$value" in sub) {
							value = sub.$value; // auto-unwrap leaf token
						} else if (key === "$value") {
							value = resolveDeep(sub, effectiveRoot); // composite value
						} else {
							value = sub; // group sub-tree
						}
					} else if (hasLeaf) {
						value = key === "$value" ? resolveDeep(leaf, effectiveRoot) : leaf;
					}
				}

				// Replace the getter with a plain data property.
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

// Module-level cycle-detection set for aliases. Safe because JS is
// single-threaded; add before recursing, delete in the `finally` block.
const resolvingAliases = new Set<string>();

/** Resolves a DTCG alias string (e.g. `"{color.blue}"`) against the merged tree. */
const resolveAlias = (alias: string, root: RawObject): unknown => {
	const path = alias.slice(1, -1);
	if (resolvingAliases.has(path)) return undefined;
	resolvingAliases.add(path);
	try {
		let node: unknown = root;
		for (const seg of path.split(".")) {
			if (!isPlainObject(node)) return undefined;
			node = node[seg];
		}
		return node;
	} finally {
		resolvingAliases.delete(path);
	}
};

/** Resolves a JSON Pointer `$ref` against the merged tree, skipping unwrapped `$value` segments. */
const resolveRef = (ref: string, root: RawObject): unknown => {
	let path: string[];
	try {
		path = parsePointer(ref);
	} catch {
		return undefined;
	}

	let node: unknown = root;
	for (const seg of path) {
		if (isPlainObject(node)) {
			if (seg === "$value" && !(seg in node)) continue;
			node = node[seg];
		} else if (Array.isArray(node)) {
			const idx = Number(seg);
			node = Number.isInteger(idx) ? node[idx] : undefined;
		} else {
			return undefined;
		}
	}
	return node;
};

/** Recursively resolves aliases and `$ref` objects anywhere inside a value. */
const resolveDeep = (value: unknown, root: RawObject): unknown => {
	if (isAlias(value)) return resolveAlias(value, root);
	if (isRef(value)) return resolveRef(value.$ref, root);
	if (Array.isArray(value)) return value.map((v) => resolveDeep(v, root));
	if (isPlainObject(value)) {
		const out: RawObject = Object.create(null);
		for (const k in value) out[k] = resolveDeep(value[k], root);
		return out;
	}
	return value;
};
