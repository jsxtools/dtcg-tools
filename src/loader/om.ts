import type { Format } from "../types/format.js";
import type { Resolver } from "../types/resolver.js";
import type { LoaderSys, LoadOptions } from "./index.js";
import { getAtPath, parsePointer } from "./pointer.js";

/**
 * Experimental: a Typed-OM-like representation of DTCG tokens.
 *
 * - Everything is represented as a node object (no primitives).
 * - `{...}` and `{ "$ref": ... }` are first-class reference nodes.
 * - `compute()` resolves only references; deep computation happens in helpers.
 */

export const enum T {
	Group = 1,
	Token = 2,

	Obj = 10,
	Arr = 11,
	Null = 12,
	Bool = 13,
	Num = 14,
	Str = 15,

	Duration = 20,
	CubicBezier = 21,

	AliasRef = 30,
	PointerRef = 31,

	Error = 99,
}

export type GroupNode = {
	t: T.Group;
	/** Effective (inherited) `$type` for this group, if any. */
	type?: string;
	// Indexing by an unknown key may return `undefined`.
	entries: Record<string, EntryNode | undefined>;
};

export type TokenNode = {
	t: T.Token;
	/** Effective (inherited) `$type` for this token, if any. */
	type?: string;
	value: ValueNode;
};

export type EntryNode = GroupNode | TokenNode;

export type NullNode = { t: T.Null };
export type BoolNode = { t: T.Bool; v: boolean };
export type NumNode = { t: T.Num; v: number };
export type StrNode = { t: T.Str; v: string };

export type ObjNode = { t: T.Obj; props: Record<string, ValueNode> };
export type ArrNode = { t: T.Arr; items: ValueNode[] };

export type DurationNode = { t: T.Duration; value: ValueNode; unit: ValueNode };
export type CubicBezierNode = { t: T.CubicBezier; p1x: ValueNode; p1y: ValueNode; p2x: ValueNode; p2y: ValueNode };

export type AliasRefNode = { t: T.AliasRef; raw: string };
export type PointerRefNode = { t: T.PointerRef; $ref: string };

export type ErrorNode = { t: T.Error; message: string };

export type ValueNode =
	| NullNode
	| BoolNode
	| NumNode
	| StrNode
	| ObjNode
	| ArrNode
	| DurationNode
	| CubicBezierNode
	| AliasRefNode
	| PointerRefNode
	| ErrorNode;

export type EvalContext = {
	doc: GroupNode;
	memo: WeakMap<object, ValueNode>;
	resolving: Set<object>;
	aliasMemo: WeakMap<object, string[]>;
	pointerMemo: WeakMap<object, string[] | ErrorNode>;
};

export const createEvalContext = (doc: GroupNode): EvalContext => ({
	doc,
	memo: new WeakMap(),
	resolving: new Set(),
	aliasMemo: new WeakMap(),
	pointerMemo: new WeakMap(),
});

// ─── Traversal helpers ────────────────────────────────────────────────────────

export type PathLike = string | readonly string[];

/** Splits a dot-path (`"a.b.c"`) into segments (or returns an existing segment array). */
export const toDotPath = (path: PathLike): readonly string[] => (typeof path === "string" ? (path ? path.split(".") : []) : path);

/** Returns the entry node (group or token) at a dot-path. */
export const getEntry = (doc: GroupNode, path: PathLike): EntryNode | undefined => {
	const segs = toDotPath(path);
	let cur: EntryNode = doc;
	for (const seg of segs) {
		if (cur.t !== T.Group) return undefined;
		const next: EntryNode | undefined = cur.entries[seg];
		if (!next) return undefined;
		cur = next;
	}
	return cur;
};

/** Returns the group node at a dot-path. */
export const getGroup = (doc: GroupNode, path: PathLike): GroupNode | undefined => {
	const n = getEntry(doc, path);
	return n?.t === T.Group ? n : undefined;
};

/** Returns the token node at a dot-path. */
export const getToken = (doc: GroupNode, path: PathLike): TokenNode | undefined => {
	const n = getEntry(doc, path);
	return n?.t === T.Token ? n : undefined;
};

/** Returns any node reachable by a local JSON Pointer (string or segment array). */
export const getNodeByPointer = (doc: GroupNode, pointer: string | readonly string[]): EntryNode | ValueNode | undefined => {
	return getByPointer(doc, typeof pointer === "string" ? parsePointer(pointer) : pointer);
};

/** Returns a value node by pointer; if the pointer lands on a token, returns its `$value` node. */
export const getValueByPointer = (doc: GroupNode, pointer: string | readonly string[]): ValueNode | undefined => {
	const n = getNodeByPointer(doc, pointer);
	if (!n) return undefined;
	if (n.t === T.Token) return n.value;
	return n.t === T.Group ? undefined : n;
};

/** Convenience: gets a token's value by dot-path and computes it (resolves refs). */
export const computeTokenValue = (doc: GroupNode, path: PathLike, ctx: EvalContext): ValueNode | ErrorNode => {
	const tok = getToken(doc, path);
	return tok ? compute(tok.value, ctx) : { t: T.Error, message: "missing token" };
};

// ─── Loader (OMLoaderHost) ────────────────────────────────────────────────────

export interface OMLoadResult {
	doc: GroupNode;
	sources: URL[];
	ctx: EvalContext;
}

/**
 * Like {@link LoaderHost}, but returns a node graph rather than resolved values.
 *
 * This is intentionally experimental and currently aims to be "good enough" for
 * tinkering with ref semantics.
 */
export class OMLoaderHost {
	readonly sys: LoaderSys;
	#cache = new Map<string, unknown>();

	constructor(sys: LoaderSys) {
		this.sys = sys;
	}

	readJSON<T>(url: URL): T {
		const { href } = url;
		if (!this.#cache.has(href)) {
			this.#cache.set(href, JSON.parse(this.sys.readFile(url)));
		}
		return this.#cache.get(href) as T;
	}

	load(input: string | URL | Resolver, options?: LoadOptions): OMLoadResult {
		const defaultBase = this.sys.currentDirectory();
		let resolver: Resolver;
		let resolverBase: URL;

		if (typeof input === "string" || input instanceof URL) {
			const resolverURL = new URL(input, toBaseURL(options?.base, defaultBase));
			resolver = this.readJSON<Resolver>(resolverURL);
			resolverBase = new URL(".", resolverURL);
		} else {
			resolver = input;
			resolverBase = toBaseURL(options?.base, defaultBase);
		}

		const sources: URL[] = [];
		const formats: Format[] = [];

		for (const item of resolver.resolutionOrder) {
			const set = resolveSet(item, resolver);
			if (set == null) continue;

			for (const source of set.sources) {
				if (hasStringRef(source)) {
					const url = new URL(source.$ref, resolverBase);
					sources.push(url);
					formats.push(this.readJSON<Format>(url));
				} else {
					formats.push(source as Format);
				}
			}
		}

		const doc = buildOM(formats);
		const ctx = createEvalContext(doc);
		return { doc, sources, ctx };
	}

	clearCache(): void {
		this.#cache.clear();
	}
}

// ─── Build (raw formats → nodes) ──────────────────────────────────────────────

type RawObject = Record<string, unknown>;

const isPlainObject = (v: unknown): v is RawObject => v !== null && typeof v === "object" && !Array.isArray(v);
const isAlias = (v: unknown): v is string => typeof v === "string" && v.startsWith("{") && v.endsWith("}");
const hasStringRef = (v: unknown): v is { $ref: string } => isPlainObject(v) && typeof v.$ref === "string";
const isPointerRefObject = (v: unknown): v is { $ref: string } => isPlainObject(v) && typeof v.$ref === "string" && Object.keys(v).length === 1;

/** Collects sub-objects for `key` across formats, resetting on non-object override. */
const getSubFormats = (formats: readonly RawObject[], key: string): RawObject[] => {
	const subs: RawObject[] = [];
	for (const format of formats) {
		const v = format[key];
		if (v === undefined) continue;
		if (isPlainObject(v)) subs.push(v);
		else subs.length = 0;
	}
	return subs;
};

const pathToId = (path: readonly string[]): string => path.join(".") || "#";

const getFormatsAtPath = (formats: readonly RawObject[], path: readonly string[]): readonly RawObject[] => {
	let current: readonly RawObject[] = formats;
	for (const seg of path) {
		current = getSubFormats(current, seg);
		if (current.length === 0) return [];
	}
	// Stop: a token cannot be extended as a group.
	return current.some((f) => "$value" in f || typeof f.$ref === "string") ? [] : current;
};

const parseReferencePath = (ref: string): string[] | undefined => {
	if (isAlias(ref)) return ref.slice(1, -1).split(".");
	try {
		return parsePointer(ref);
	} catch {
		return undefined;
	}
};

const resolvingExtends = new Set<string>();

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

/** Build a merged OM document root from ordered formats. */
export const buildOM = (formats: Format[]): GroupNode => {
	const rootFormats = formats as unknown as RawObject[];
	const root = buildEntry(rootFormats, rootFormats, undefined, []);
	return root.t === T.Group ? root : { t: T.Group, entries: Object.create(null) };
};

const buildEntry = (formats: RawObject[], rootFormats: RawObject[], inheritedType: string | undefined, path: string[]): EntryNode => {
	const effectiveFormats = expandFormats(formats, rootFormats, path);

	let nodeType: string | undefined;
	for (const fmt of effectiveFormats) {
		if (typeof fmt.$type === "string") nodeType = fmt.$type;
	}
	nodeType ??= inheritedType;

	const isToken = effectiveFormats.some((f) => "$value" in f || typeof f.$ref === "string");
	if (isToken) {
		const rawValue = getEffectiveTokenValue(effectiveFormats);
		const token: TokenNode = { t: T.Token, value: parseTokenValue(nodeType, rawValue) };
		if (nodeType) token.type = nodeType;
		return token;
	}

	const entries: Record<string, EntryNode | undefined> = Object.create(null);
	const keys = new Set<string>();
	for (const fmt of effectiveFormats) for (const key in fmt) keys.add(key);

	for (const key of keys) {
		// Ignore metadata keys, but keep the reserved `$root` token name.
		if (key.startsWith("$") && key !== "$root") continue;

		const subs = getSubFormats(effectiveFormats, key);
		if (subs.length === 0) continue;
		entries[key] = buildEntry(subs, rootFormats, nodeType, [...path, key]);
	}

	const group: GroupNode = { t: T.Group, entries };
	if (nodeType) group.type = nodeType;
	return group;
};

const getEffectiveTokenValue = (effectiveFormats: readonly RawObject[]): unknown => {
	const valueObjs: RawObject[] = [];
	let leaf: unknown;
	let hasLeaf = false;

	for (const fmt of effectiveFormats) {
		if (typeof fmt.$ref === "string") {
			valueObjs.length = 0;
			leaf = { $ref: fmt.$ref };
			hasLeaf = true;
		}

		if ("$value" in fmt) {
			const v = fmt.$value;
			if (isPlainObject(v)) {
				hasLeaf = false;
				leaf = undefined;
				valueObjs.push(v);
			} else {
				valueObjs.length = 0;
				leaf = v;
				hasLeaf = true;
			}
		}
	}

	if (hasLeaf) return leaf;
	if (valueObjs.length > 0) return mergeRawObjects(valueObjs);
	return undefined;
};

const mergeRawObjects = (objs: readonly RawObject[]): RawObject => {
	const out: RawObject = Object.create(null);
	for (const obj of objs) {
		for (const k in obj) {
			const next = obj[k];
			const prev = out[k];

			if (isPlainObject(prev) && isPlainObject(next)) {
				out[k] = mergeRawObjects([prev, next]);
			} else {
				out[k] = next;
			}
		}
	}
	return out;
};

const parseTokenValue = (type: string | undefined, raw: unknown): ValueNode => {
	// Preserve refs even when typed parsing fails.
	if (isAlias(raw)) return { t: T.AliasRef, raw };
	if (isPointerRefObject(raw)) return { t: T.PointerRef, $ref: raw.$ref };

	if (type === "number" && typeof raw === "number") return { t: T.Num, v: raw };
	if (type === "duration" && isPlainObject(raw)) {
		const value = parseValue(raw.value);
		const unit = parseValue(raw.unit);
		return { t: T.Duration, value, unit };
	}
	if (type === "cubicBezier" && Array.isArray(raw) && raw.length === 4) {
		return {
			t: T.CubicBezier,
			p1x: parseValue(raw[0]),
			p1y: parseValue(raw[1]),
			p2x: parseValue(raw[2]),
			p2y: parseValue(raw[3]),
		};
	}

	return parseValue(raw);
};

export const parseValue = (raw: unknown): ValueNode => {
	if (raw === null) return { t: T.Null };
	if (typeof raw === "boolean") return { t: T.Bool, v: raw };
	if (typeof raw === "number") return { t: T.Num, v: raw };
	if (typeof raw === "string") return isAlias(raw) ? { t: T.AliasRef, raw } : { t: T.Str, v: raw };
	if (Array.isArray(raw)) return { t: T.Arr, items: raw.map(parseValue) };

	if (isPointerRefObject(raw)) return { t: T.PointerRef, $ref: raw.$ref };

	if (isPlainObject(raw)) {
		const props: Record<string, ValueNode> = Object.create(null);
		for (const k in raw) props[k] = parseValue(raw[k]);
		return { t: T.Obj, props };
	}

	return { t: T.Error, message: `Unsupported value: ${String(raw)}` };
};

// ─── Evaluation ───────────────────────────────────────────────────────────────

export const compute = (v: ValueNode, ctx: EvalContext): ValueNode => {
	const cached = ctx.memo.get(v);
	if (cached) return cached;

	if (ctx.resolving.has(v)) return { t: T.Error, message: "circular reference" };
	ctx.resolving.add(v);

	try {
		let out: ValueNode = v;

		if (v.t === T.AliasRef) {
			const segs = aliasSegments(v, ctx);
			const tok = getToken(ctx.doc, segs);
			out = tok ? compute(tok.value, ctx) : { t: T.Error, message: "alias target is not a token" };
		} else if (v.t === T.PointerRef) {
			const segs = pointerSegments(v, ctx);
			if (isError(segs)) {
				out = segs;
			} else {
				const target = getByPointer(ctx.doc, segs);
				out =
					target?.t === T.Token
						? compute(target.value, ctx)
						: target && isValueNode(target)
							? compute(target, ctx)
							: { t: T.Error, message: "bad $ref target" };
			}
		}

		ctx.memo.set(v, out);
		return out;
	} finally {
		ctx.resolving.delete(v);
	}
};

export const asNumber = (v: ValueNode, ctx: EvalContext): number | ErrorNode => {
	const c = compute(v, ctx);
	return c.t === T.Num ? c.v : { t: T.Error, message: "expected number" };
};

export const asString = (v: ValueNode, ctx: EvalContext): string | ErrorNode => {
	const c = compute(v, ctx);
	return c.t === T.Str ? c.v : { t: T.Error, message: "expected string" };
};

export const asDuration = (v: ValueNode, ctx: EvalContext): { value: number; unit: string } | ErrorNode => {
	const c = compute(v, ctx);
	if (c.t !== T.Duration) return { t: T.Error, message: "expected duration" };
	const value = asNumber(c.value, ctx);
	if (isError(value)) return value;
	const unit = asString(c.unit, ctx);
	if (isError(unit)) return unit;
	return { value, unit };
};

export const asCubicBezier = (v: ValueNode, ctx: EvalContext): [number, number, number, number] | ErrorNode => {
	const c = compute(v, ctx);
	if (c.t !== T.CubicBezier) return { t: T.Error, message: "expected cubicBezier" };

	const p1x = asNumber(c.p1x, ctx);
	if (isError(p1x)) return p1x;
	const p1y = asNumber(c.p1y, ctx);
	if (isError(p1y)) return p1y;
	const p2x = asNumber(c.p2x, ctx);
	if (isError(p2x)) return p2x;
	const p2y = asNumber(c.p2y, ctx);
	if (isError(p2y)) return p2y;
	return [p1x, p1y, p2x, p2y];
};

/** Deeply converts a value node into plain JSON, resolving refs on-demand. */
export const toJSONComputed = (v: ValueNode, ctx: EvalContext): unknown => {
	const c = compute(v, ctx);

	switch (c.t) {
		case T.Null:
			return null;
		case T.Bool:
		case T.Num:
		case T.Str:
			return c.v;
		case T.Arr:
			return c.items.map((it) => toJSONComputed(it, ctx));
		case T.Obj: {
			const out: Record<string, unknown> = Object.create(null);
			for (const k in c.props) out[k] = toJSONComputed(c.props[k], ctx);
			return out;
		}
		case T.Duration:
			return { value: toJSONComputed(c.value, ctx), unit: toJSONComputed(c.unit, ctx) };
		case T.CubicBezier:
			return [toJSONComputed(c.p1x, ctx), toJSONComputed(c.p1y, ctx), toJSONComputed(c.p2x, ctx), toJSONComputed(c.p2y, ctx)];
		case T.Error:
			return { $error: c.message };
		case T.AliasRef:
			return { $alias: c.raw };
		case T.PointerRef:
			return { $ref: c.$ref };
	}
};

// ─── Reference lookup ─────────────────────────────────────────────────────────

const isError = (v: unknown): v is ErrorNode => typeof v === "object" && v !== null && (v as ErrorNode).t === T.Error;
const isValueNode = (n: EntryNode | ValueNode): n is ValueNode => n.t !== T.Group && n.t !== T.Token;

/** AliasRefNode is only created for valid aliases, so parsing always succeeds. */
const aliasSegments = (n: AliasRefNode, ctx: EvalContext): string[] => {
	const cached = ctx.aliasMemo.get(n);
	if (cached) return cached;
	const segs = n.raw.slice(1, -1).split(".");
	ctx.aliasMemo.set(n, segs);
	return segs;
};

const pointerSegments = (n: PointerRefNode, ctx: EvalContext): string[] | ErrorNode => {
	const cached = ctx.pointerMemo.get(n);
	if (cached) return cached;

	try {
		const segs = parsePointer(n.$ref);
		ctx.pointerMemo.set(n, segs);
		return segs;
	} catch {
		const err: ErrorNode = { t: T.Error, message: "invalid JSON Pointer" };
		ctx.pointerMemo.set(n, err);
		return err;
	}
};

const getByPointer = (doc: GroupNode, ptr: readonly string[]): EntryNode | ValueNode | undefined => {
	let cur: EntryNode | ValueNode = doc;

	for (const seg of ptr) {
		if (cur.t === T.Group) {
			const next: EntryNode | undefined = cur.entries[seg];
			if (!next) return undefined;
			cur = next;
			continue;
		}

		if (cur.t === T.Token) {
			if (seg === "$value") {
				cur = cur.value;
				continue;
			}
			if (seg === "$type") {
				cur = { t: T.Str, v: cur.type ?? "" };
				continue;
			}
			return undefined;
		}

		const next = getValueChild(cur, seg);
		if (!next) return undefined;
		cur = next;
	}

	return cur;
};

const getValueChild = (v: ValueNode, seg: string): ValueNode | undefined => {
	switch (v.t) {
		case T.Obj:
			return v.props[seg];
		case T.Arr: {
			const index = Number(seg);
			return Number.isInteger(index) ? v.items[index] : undefined;
		}
		case T.Duration:
			return seg === "value" ? v.value : seg === "unit" ? v.unit : undefined;
		case T.CubicBezier:
			return seg === "0" ? v.p1x : seg === "1" ? v.p1y : seg === "2" ? v.p2x : seg === "3" ? v.p2y : undefined;
		default:
			return undefined;
	}
};

// ─── Internal helpers (copied from loader/index.ts) ───────────────────────────

type SetLike = Resolver["resolutionOrder"][number] & { type?: string };

const resolveSet = (item: Resolver["resolutionOrder"][number], resolver: Resolver): { sources: unknown[] } | null => {
	if ("$ref" in item) {
		const target = getAtPath(resolver, parsePointer(item.$ref));
		return isSet(target) ? target : null;
	}
	return (item as SetLike).type === "set" ? (item as any) : null;
};

const isSet = (v: unknown): v is { sources: unknown[] } => isPlainObject(v) && Array.isArray(v.sources);

const toBaseURL = (base: URL | string | undefined, fallback: URL): URL => {
	if (base == null) return fallback;
	if (base instanceof URL) return base;
	return new URL(base.endsWith("/") ? base : `${base}/`, fallback);
};
