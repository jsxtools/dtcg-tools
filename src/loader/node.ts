import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import type { Resolver } from "../types/resolver.js";
import { LoaderHost, type LoaderSys, type LoadOptions, type LoadResult } from "./index.js";

// ─── Node.js LoaderSys ────────────────────────────────────────────────────────

/** Node.js {@link LoaderSys} — reads files synchronously via `fs.readFileSync`. */
export const nodeSys: LoaderSys = {
	/** Reads a UTF-8 file from disk. */
	readFile: (url) => readFileSync(url, "utf8"),
	/** Returns the current working directory as a file URL. */
	currentDirectory: () => pathToFileURL(`${process.cwd()}/`),
};

// ─── Convenience export ───────────────────────────────────────────────────────

/** Loads a resolver once using the default Node.js loader system. */
export const load = (input: string | URL | Resolver, options?: LoadOptions): LoadResult => new LoaderHost(nodeSys).load(input, options);
