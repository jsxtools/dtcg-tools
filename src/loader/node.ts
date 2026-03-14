import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import type { Resolver } from "../types/resolver.js";
import { LoaderHost, type LoaderSys, type LoadOptions, type LoadResult } from "./index.js";

// ─── Node.js LoaderSys ────────────────────────────────────────────────────────

/**
 * {@link LoaderSys} implementation for Node.js. Reads files synchronously
 * from the local filesystem using `fs.readFileSync`.
 *
 * This is NOT browser-safe — import it only from Node.js entry points.
 * For browser environments, provide your own {@link LoaderSys} that reads
 * from a virtual filesystem, network, or other source.
 *
 * @example Browser replacement
 * const browserSys: LoaderSys = {
 *   readFile: (url) => fileMap.get(url.href) ?? (() => { throw new Error(`Not found: ${url}`) })(),
 *   currentDirectory: () => new URL("./", location.href),
 * };
 */
export const nodeSys: LoaderSys = {
	readFile: (url) => readFileSync(url, "utf8"),
	currentDirectory: () => pathToFileURL(`${process.cwd()}/`),
};

// ─── Convenience export ───────────────────────────────────────────────────────

/**
 * One-shot helper that loads and resolves a DTCG resolver document in Node.js.
 *
 * For repeated loads (e.g. a watch-mode build tool), prefer constructing a
 * {@link LoaderHost} directly and reusing it across calls to share the
 * internal file-read cache:
 *
 * ```ts
 * import { nodeSys } from "./node.js";
 * import { LoaderHost } from "./index.js";
 *
 * const host = new LoaderHost(nodeSys);
 * const result1 = host.load(resolverURL);
 * const result2 = host.load(otherResolverURL); // cache is shared
 * ```
 */
export const load = (input: string | URL | Resolver, options?: LoadOptions): LoadResult => new LoaderHost(nodeSys).load(input, options);
