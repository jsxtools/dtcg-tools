import { describe, expect, expectTypeOf, it } from "vitest";

import { LoaderHost, type LoadOptions, type LoadResult, load } from "../src/loader/index.ts";
import { mergeFormats } from "../src/loader/merge.ts";
import { getAtPath, parsePointer } from "../src/loader/pointer.ts";
import type { Format } from "../src/types/format.ts";
import type { Resolver } from "../src/types/resolver.ts";

const exampleDir = new URL("../src/test/example/", import.meta.url);
const resolverURL = new URL("design-tokens.resolver.json", exampleDir);

// ─── parsePointer ─────────────────────────────────────────────────────────────

describe("parsePointer", () => {
	it('returns [] for "#"', () => {
		expect(parsePointer("#")).toEqual([]);
	});

	it('splits "#/sets/core" into segments', () => {
		expect(parsePointer("#/sets/core")).toEqual(["sets", "core"]);
	});

	it("decodes ~1 as '/' and ~0 as '~'", () => {
		expect(parsePointer("#/a~1b/c~0d")).toEqual(["a/b", "c~d"]);
	});

	it("throws for non-local pointers", () => {
		expect(() => parsePointer("http://example.com/schema")).toThrow();
		expect(() => parsePointer("/absolute/path")).toThrow();
	});
});

// ─── getAtPath ────────────────────────────────────────────────────────────────

describe("getAtPath", () => {
	const doc = { a: { b: { c: 42 } }, arr: ["x", "y"] };

	it("traverses nested objects", () => {
		expect(getAtPath(doc, ["a", "b", "c"])).toBe(42);
	});

	it("traverses arrays by numeric string index", () => {
		expect(getAtPath(doc, ["arr", "1"])).toBe("y");
	});

	it("returns undefined for a missing key", () => {
		expect(getAtPath(doc, ["a", "missing"])).toBeUndefined();
	});

	it("returns undefined when the path continues past a leaf", () => {
		expect(getAtPath(doc, ["a", "b", "c", "d"])).toBeUndefined();
	});
});

// ─── mergeFormats ─────────────────────────────────────────────────────────────

describe("mergeFormats", () => {
	it("returns an empty object for an empty array", () => {
		expect(Object.keys(mergeFormats([]))).toEqual([]);
	});

	it("passes a single source through without mutation", () => {
		// Leaf tokens are auto-unwrapped: { $value: 8 } → 8
		const format = { spacing: { md: { $value: 8 } } } as Format;
		expect(mergeFormats([format])).toEqual({ spacing: { md: 8 } });
		expect(mergeFormats([format])).not.toBe(format);
	});

	it("deeply merges sibling groups from different sources", () => {
		const a = { color: { red: { $value: "#f00" } } } as Format;
		const b = { color: { blue: { $value: "#00f" } } } as Format;
		// Tokens unwrap to their resolved values; group nodes stay navigable.
		expect(mergeFormats([a, b])).toEqual({
			color: { red: "#f00", blue: "#00f" },
		});
	});

	it("later sources override leaf values", () => {
		const a = { spacing: { md: { $value: 8 } } } as Format;
		const b = { spacing: { md: { $value: 16 } } } as Format;
		expect(mergeFormats([a, b])).toEqual({ spacing: { md: 16 } });
	});

	it("replaces arrays rather than merging them", () => {
		const a = { font: { family: { $value: ["Arial"] } } } as Format;
		const b = { font: { family: { $value: ["Helvetica", "Arial"] } } } as Format;
		expect(mergeFormats([a, b])).toEqual({
			font: { family: ["Helvetica", "Arial"] },
		});
	});
});

// ─── LoaderHost ───────────────────────────────────────────────────────────────

describe("LoaderHost", () => {
	it("readJSON caches the same object instance per URL", () => {
		const loader = new LoaderHost();
		const r1 = loader.readJSON(resolverURL);
		const r2 = loader.readJSON(resolverURL);
		expect(r1).toBe(r2);
	});

	it("clearCache forces readJSON to return a new object", () => {
		const loader = new LoaderHost();
		const r1 = loader.readJSON(resolverURL);
		loader.clearCache();
		expect(loader.readJSON(resolverURL)).not.toBe(r1);
	});

	it("load() from a path string resolves all 12 sources", () => {
		const { sources } = new LoaderHost().load(resolverURL.pathname);
		expect(sources).toHaveLength(12);
		expect(sources.every((s) => s instanceof URL)).toBe(true);
	});

	it("load() from a URL resolves all 12 sources", () => {
		const { sources } = new LoaderHost().load(resolverURL);
		expect(sources).toHaveLength(12);
	});

	it("load() produces a merged token tree containing all source groups", () => {
		const { tokens } = new LoaderHost().load(resolverURL);
		expect(tokens).toHaveProperty("base");
		expect(tokens).toHaveProperty("color");
		expect(tokens).toHaveProperty("spacing");
		expect(tokens).toHaveProperty("z-index");
	});

	it("load() with inline Resolver + base resolves relative $refs", () => {
		const resolver: Resolver = {
			version: "2025.10",
			resolutionOrder: [{ name: "s", type: "set", sources: [{ $ref: "spacing.json" }] }],
		};

		const { tokens, sources } = new LoaderHost().load(resolver, { base: exampleDir });

		expect(sources).toHaveLength(1);
		expect(tokens).toHaveProperty("spacing");
	});

	it("load() skips modifier entries in resolutionOrder without throwing", () => {
		const resolver: Resolver = {
			version: "2025.10",
			modifiers: { theme: { contexts: { light: [], dark: [] } } },
			resolutionOrder: [{ $ref: "#/modifiers/theme" }],
		};
		const { tokens, sources } = new LoaderHost().load(resolver);
		expect(sources).toHaveLength(0);
		expect(tokens).toEqual({});
	});

	it("load() includes inline Format sources without fetching any files", () => {
		const format = {
			spacing: { md: { $type: "dimension", $value: { value: 8, unit: "px" } } },
		} satisfies Format;
		const resolver: Resolver = {
			version: "2025.10",
			resolutionOrder: [{ name: "inline", type: "set", sources: [format] }],
		};
		const { tokens, sources } = new LoaderHost().load(resolver);
		expect(sources).toHaveLength(0);
		expect(tokens).toHaveProperty("spacing");
	});
});

// ─── load (convenience) ───────────────────────────────────────────────────────

describe("load", () => {
	it("returns identically to new LoaderHost().load()", () => {
		const a = load(resolverURL);
		const b = new LoaderHost().load(resolverURL);
		expect(Object.keys(a.tokens).sort()).toEqual(Object.keys(b.tokens).sort());
		expect(a.sources.map((s) => s.href)).toEqual(b.sources.map((s) => s.href));
	});
});

// ─── Types ────────────────────────────────────────────────────────────────────

describe("types", () => {
	it("LoadResult has the expected shape", () => {
		expectTypeOf<LoadResult["tokens"]>().toMatchTypeOf<Format>();
		expectTypeOf<LoadResult["sources"]>().toMatchTypeOf<URL[]>();
	});

	it("LoadOptions.base accepts both URL and string", () => {
		expectTypeOf<URL>().toMatchTypeOf<LoadOptions["base"]>();
		expectTypeOf<string>().toMatchTypeOf<LoadOptions["base"]>();
	});
});
