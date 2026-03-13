import { describe, expect, expectTypeOf, it } from "vitest";
import type { Format, Resolver, Token } from "../src/index.ts";
import * as dtcgTools from "../src/index.ts";

describe("package entrypoint", () => {
	it("has no runtime exports", () => {
		expect(Object.keys(dtcgTools)).toEqual([]);
	});
});

describe("type exports", () => {
	it("supports format documents", () => {
		const format = {
			spacing: {
				md: {
					$type: "dimension",
					$value: { value: 8, unit: "px" },
				},
			},
		} satisfies Format;

		expectTypeOf(format).toMatchTypeOf<Format>();
		expect(format.spacing.md.$value.unit).toBe("px");
	});

	it("supports resolver documents", () => {
		const format = {
			spacing: {
				md: {
					$type: "dimension",
					$value: { value: 8, unit: "px" },
				},
			},
		} satisfies Format;

		const resolver = {
			version: "2025.10",
			resolutionOrder: [{ name: "base", type: "set", sources: [format] }],
		} satisfies Resolver;

		expectTypeOf(resolver).toMatchTypeOf<Resolver>();
		expect(resolver.resolutionOrder).toHaveLength(1);
	});

	it("narrows known token values", () => {
		const token = {
			$type: "dimension",
			$value: { value: 4, unit: "rem" },
		} satisfies Token;

		expectTypeOf(token).toMatchTypeOf<Token>();
		expect(token.$value.unit).toBe("rem");
	});
});
