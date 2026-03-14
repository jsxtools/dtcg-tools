import { globSync, readFileSync } from "node:fs";
import type { Resolver } from "../types/resolver.js";

export class CompilerHost {
	constructor(options?: CompilerOptions) {
		const { include, exclude } = Object(options) as CompilerOptions;

		this.#options = {
			include: Array.isArray(include) ? include : ["src/**/*"],
			exclude: Array.isArray(exclude) ? exclude : ["node_modules"],
		};

		this.#initialize();
	}

	#options: Required<CompilerOptions>;

	#initialize() {
		// 1. Find all files in the include paths
		// 2. Exclude all files in the exclude paths
		// 3. Parse all files
		// 4. Create a program
		const files = globSync(this.#options.include, {
			exclude: this.#options.exclude,
		});

		for (const file of files) {
			const resolver = READJSON<Resolver>(file);

			if (Array.isArray(resolver.resolutionOrder)) {
				for (const item of resolver.resolutionOrder) {
					if ("$ref" in item) {
						const ref = item.$ref;

						if (ref.startsWith("#/sets/")) {
							// TODO: resolve set
							console.log(RESOLVE_URI_REFERENCE(ref, resolver));
						} else if (ref.startsWith("#/modifiers/")) {
							// TODO: resolve modifier
							console.log({ ref });
						}
					}
				}
			}
		}

		console.log(files);
	}
}

const READJSON = <T extends object>(path: string): T => {
	if (READJSON_CACHE.has(path)) {
		return READJSON_CACHE.get(path);
	}

	const json: T = JSON.parse(readFileSync(path, "utf8"));

	READJSON_CACHE.set(path, json);

	return json;
};

const READJSON_CACHE = new Map<string, any>();

const RESOLVE_URI_REFERENCE = (uri: string, document: object) => {
	const value = GET_VALUE_AT_PATH(document, GET_PATH_FROM_POINTER(uri));
	// TODO: resolve uri
	console.log({ uri, value, document });
};

const GET_PATH_FROM_POINTER = (pointer: string): string[] => {
	if (pointer === "#") {
		return [];
	}

	if (!pointer.startsWith("#/")) {
		throw new Error(`Only local JSON Pointer refs are supported, received ${pointer}`);
	}

	return pointer
		.slice(2)
		.split("/")
		.map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));
};

export const GET_VALUE_AT_PATH = (value: object | undefined, path: readonly string[]): string | undefined => {
	let current: Record<string, any> | string | undefined = value;

	for (const segment of path) {
		if (Array.isArray(current)) {
			const index = Number(segment);

			if (!Number.isInteger(index)) {
				return undefined;
			}

			current = current[index];
			continue;
		}

		if (current === null || typeof current !== "object") {
			return undefined;
		}

		current = current[segment];
	}

	return current as string | undefined;
};

export interface CompilerOptions {
	include?: string[];
	exclude?: string[];
}

const host = new CompilerHost({
	include: ["src/test/example/*.resolver.json"],
	exclude: ["node_modules"],
});

void host;
