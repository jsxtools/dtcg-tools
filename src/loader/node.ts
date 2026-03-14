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
	/** Reads a UTF-8 file from disk. */
	readFile: (url) => readFileSync(url, "utf8"),
	/** Returns the current working directory as a file URL. */
	currentDirectory: () => pathToFileURL(`${process.cwd()}/`),
};

// ─── Convenience export ───────────────────────────────────────────────────────

/** Loads a resolver once using the default Node.js loader system. */
export const load = (input: string | URL | Resolver, options?: LoadOptions): LoadResult => new LoaderHost(nodeSys).load(input, options);
