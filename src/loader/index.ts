import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import type { Format } from "../types/format.js";
import type { Resolver } from "../types/resolver.js";
import type { Set } from "../types/resolver/set.js";

import { getAtPath, parsePointer } from "./pointer.js";
import { mergeFormats } from "./merge.js";

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface LoadOptions {
	/**
	 * Base URL (or absolute path) used to resolve relative file references inside
	 * a resolver document. Defaults to `file://{process.cwd()}/` when omitted.
	 */
	base?: URL | string;
}

export interface LoadResult {
	/** The fully merged DTCG token tree, combining all resolved sources in order. */
	tokens: Format;

	/** Resolved URLs of every external token file that was fetched. */
	sources: URL[];
}

// ─── LoaderHost ───────────────────────────────────────────────────────────────

/**
 * A stateful DTCG loader that caches every JSON file it reads.
 * Reuse a single `LoaderHost` instance across multiple `load()` calls to share
 * the cache and avoid re-reading the same files.
 */
export class LoaderHost {
	/** Parsed JSON values, keyed by URL href. */
	#cache = new Map<string, unknown>();

	/** Reads and JSON-parses a file at `url`, caching the result by href. */
	readJSON<T>(url: URL): T {
		const { href } = url;

		if (!this.#cache.has(href)) {
			this.#cache.set(href, JSON.parse(readFileSync(url, "utf8")));
		}

		return this.#cache.get(href) as T;
	}

	/**
	 * Loads a DTCG resolver and returns the merged token tree plus source metadata.
	 *
	 * `input` may be:
	 * - A file-path string or `URL` pointing to a resolver JSON file.
	 * - An inline {@link Resolver} object (pair with `options.base` so that
	 *   relative `$ref` paths inside it can be resolved).
	 *
	 * Resolution order items that reference modifiers are skipped; only sets are
	 * merged into the final token tree.
	 */
	load(input: string | URL | Resolver, options?: LoadOptions): LoadResult {
		const defaultBase = pathToFileURL(`${process.cwd()}/`);
		let resolver: Resolver;
		let resolverBase: URL;

		if (typeof input === "string" || input instanceof URL) {
			const resolverURL = new URL(input.toString(), resolveBase(options?.base, defaultBase));
			resolver = this.readJSON<Resolver>(resolverURL);
			// Derive a directory-level base so relative $refs in the document resolve correctly.
			resolverBase = new URL(".", resolverURL);
		} else {
			resolver = input;
			resolverBase = resolveBase(options?.base, defaultBase);
		}

		// ── Assemble formats in resolution order ──────────────────────────────
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

	/** Drops all cached reads, forcing subsequent loads to re-read every file. */
	clearCache(): void {
		this.#cache.clear();
	}
}

// ─── Convenience export ───────────────────────────────────────────────────────

/**
 * One-shot helper that loads and resolves a DTCG resolver document.
 * For repeated loads, prefer {@link LoaderHost} to share the internal file cache.
 */
export const load = (input: string | URL | Resolver, options?: LoadOptions): LoadResult =>
	new LoaderHost().load(input, options);

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Resolves an item from `resolutionOrder` to a concrete {@link Set}, dereferencing
 * JSON Pointers as needed. Returns `null` for modifiers and unresolvable refs.
 */
const resolveSet = (item: Resolver["resolutionOrder"][number], resolver: Resolver): Set | null => {
	if ("$ref" in item) {
		const resolved = getAtPath(resolver, parsePointer(item.$ref));
		return isSet(resolved) ? resolved : null;
	}

	return item.type === "set" ? item : null;
};

const isSet = (value: unknown): value is Set =>
	isPlainObject(value) && Array.isArray((value as { sources?: unknown }).sources);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === "object" && !Array.isArray(value);

const resolveBase = (base: URL | string | undefined, fallback: URL): URL => {
	if (base == null) return fallback;
	if (base instanceof URL) return base;

	try {
		return new URL(base);
	} catch {
		// Treat as a local file-system path.
		const path = base.endsWith("/") || base.endsWith("\\") ? base : `${base}/`;
		return pathToFileURL(path);
	}
};
