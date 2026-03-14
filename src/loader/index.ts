import type { Format } from "../types/format.js";
import type { Set } from "../types/resolver/set.js";
import type { Resolver } from "../types/resolver.js";
import { mergeFormats } from "./merge.js";
import { getAtPath, parsePointer } from "./pointer.js";

// ─── Public Types ─────────────────────────────────────────────────────────────

/**
 * The I/O interface consumed by {@link LoaderHost}. Implement this to run in
 * any environment — browser, Deno, test sandbox, etc.
 *
 * The Node.js implementation (`nodeSys`) lives in `./node.ts` to keep this
 * module free of Node-only imports and safe to bundle for the browser.
 *
 * @example Browser virtual filesystem
 * const browserSys: LoaderSys = {
 *   readFile: (url) => fileMap.get(url.href) ?? (() => { throw new Error(`Not found: ${url}`) })(),
 *   currentDirectory: () => new URL("./", location.href),
 * };
 */
export interface LoaderSys {
	/** Reads the contents of the file at `url` and returns it as a UTF-8 string. */
	readFile(url: URL): string;

	/** Returns the base URL used when no explicit `base` is provided to {@link LoaderHost.load}. */
	currentDirectory(): URL;
}

export interface LoadOptions {
	/**
	 * Base URL (or string path/URL) used to resolve relative `$ref` paths inside
	 * the resolver document. Defaults to {@link LoaderSys.currentDirectory} when omitted.
	 */
	base?: URL | string;
}

export interface LoadResult {
	/** The fully merged DTCG token tree, combining all resolved sources in order. */
	tokens: Format;

	/** Resolved URLs of every external token file that was loaded. */
	sources: URL[];
}

// ─── LoaderHost ───────────────────────────────────────────────────────────────

/**
 * A stateful DTCG loader. Provide a {@link LoaderSys} appropriate for your
 * runtime environment (e.g. `nodeSys` from `./node.ts` for Node.js).
 *
 * Reuse a single instance across multiple `load()` calls to share the internal
 * file-read cache and avoid parsing the same JSON files more than once.
 */
export class LoaderHost {
	readonly sys: LoaderSys;

	/** Parsed JSON values, keyed by URL href. */
	#cache = new Map<string, unknown>();

	/** Stores the loader system implementation. */
	constructor(sys: LoaderSys) {
		this.sys = sys;
	}

	/** Reads and caches parsed JSON from a URL. */
	readJSON<T>(url: URL): T {
		const { href } = url;
		if (!this.#cache.has(href)) {
			this.#cache.set(href, JSON.parse(this.sys.readFile(url)));
		}
		return this.#cache.get(href) as T;
	}

	/** Loads a resolver into merged tokens and resolved source URLs. */
	load(input: string | URL | Resolver, options?: LoadOptions): LoadResult {
		const defaultBase = this.sys.currentDirectory();
		let resolver: Resolver;
		let resolverBase: URL;

		if (typeof input === "string" || input instanceof URL) {
			// Resolve the path/URL relative to the sys's current directory (or the
			// caller-supplied base). Using new URL(str, base) handles both absolute
			// file paths (e.g. "/Users/…") and relative strings correctly on all
			// platforms without requiring Node's pathToFileURL.
			const resolverURL = new URL(input.toString(), toBaseURL(options?.base, defaultBase));
			resolver = this.readJSON<Resolver>(resolverURL);
			// Strip the filename so sibling $refs inside the resolver resolve correctly.
			resolverBase = new URL(".", resolverURL);
		} else {
			resolver = input;
			resolverBase = toBaseURL(options?.base, defaultBase);
		}

		// Walk resolutionOrder, collect Set sources in order.
		// Modifier entries are intentionally skipped — they are context-dependent
		// and cannot be statically merged into a single flat token tree.
		const sources: URL[] = [];
		const formats: Format[] = [];

		for (const item of resolver.resolutionOrder) {
			const set = resolveSet(item, resolver);
			if (set == null) continue;

			for (const source of set.sources) {
				if ("$ref" in source && typeof source.$ref === "string") {
					const url = new URL(source.$ref, resolverBase);
					sources.push(url);
					formats.push(this.readJSON<Format>(url));
				} else {
					formats.push(source as Format);
				}
			}
		}

		return { tokens: mergeFormats(formats), sources };
	}

	/** Clears the cached parsed JSON files. */
	clearCache(): void {
		this.#cache.clear();
	}
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Resolves a resolution-order item to a concrete set or `null`. */
const resolveSet = (item: Resolver["resolutionOrder"][number], resolver: Resolver): Set | null => {
	if ("$ref" in item) {
		const target = getAtPath(resolver, parsePointer(item.$ref));
		return isSet(target) ? target : null;
	}
	return item.type === "set" ? item : null;
};

/** Returns `true` when a value looks like a resolver set. */
const isSet = (v: unknown): v is Set => isObject(v) && Array.isArray(v.sources);

/** Returns `true` when a value is a non-array object. */
const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

/** Converts an optional base value into a resolved base URL. */
const toBaseURL = (base: URL | string | undefined, fallback: URL): URL => {
	if (base == null) return fallback;
	if (base instanceof URL) return base;
	// new URL(string, fallback) handles absolute paths (e.g. "/Users/…") correctly
	// when fallback is a file:// URL: the path replaces the fallback's path component.
	return new URL(base.endsWith("/") ? base : `${base}/`, fallback);
};
