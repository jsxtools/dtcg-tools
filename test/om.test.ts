import { describe, expect, it } from "vitest";

import { typedBase, typedColor, typedFocusRing } from "../src/test/example.ts";

import {
	OMLoaderHost,
	T,
	asCubicBezier,
	asDuration,
	buildOM,
	createEvalContext,
	getToken,
	getValueByPointer,
	toJSONComputed,
	type ObjNode,
	parseValue,
} from "../src/loader/om.ts";

import { nodeSys } from "../src/loader/node.ts";

describe("loader/om", () => {
	it("resolves alias + JSON Pointer refs inside composite values", () => {
		const doc = buildOM([typedBase, typedColor, typedFocusRing]);
		const ctx = createEvalContext(doc);

		const dark = getToken(doc, "focus-ring.dark");
		expect(dark?.t).toBe(T.Token);
		if (!dark) throw new Error("missing token");

		const value = dark.value as ObjNode;
		expect(value.t).toBe(T.Obj);

		// alias: {color.blue.600.dark}
		expect(toJSONComputed(value.props.color, ctx)).toEqual({
			colorSpace: "hsl",
			components: [213, 100, 65],
		});

		// pointer: #/focus-ring/$root/$value/width
		expect(toJSONComputed(value.props.width, ctx)).toEqual({ value: 2, unit: "px" });

		// traversal helper: pointer into the doc
		expect(toJSONComputed(getValueByPointer(doc, "#/focus-ring/dark/$value/width")!, ctx)).toEqual({ value: 2, unit: "px" });
	});

	it("supports pointer refs into array-shaped values", () => {
		const format = {
			motion: {
				$type: "cubicBezier",
				base: { $value: [0.2, 0.0, 0.0, 1.0] },
				snappier: {
					$value: [{ $ref: "#/motion/base/$value/0" }, 0.1, { $ref: "#/motion/base/$value/2" }, 1.0],
				},
			},
		} as any;

		const doc = buildOM([format]);
		const ctx = createEvalContext(doc);
		const snappier = getToken(doc, "motion.snappier");
		if (!snappier) throw new Error("missing token");
		const bez = asCubicBezier(snappier.value, ctx);
		expect(bez).toEqual([0.2, 0.1, 0.0, 1.0]);
	});

	it("supports alias refs between duration tokens", () => {
		const format = {
			transition: {
				$type: "duration",
				fast: { $value: { value: 120, unit: "ms" } },
				slow: { $value: "{transition.fast}" },
			},
		} as any;

		const doc = buildOM([format]);
		const ctx = createEvalContext(doc);
		const slow = getToken(doc, "transition.slow");
		if (!slow) throw new Error("missing token");
		expect(asDuration(slow.value, ctx)).toEqual({ value: 120, unit: "ms" });
	});

	it("can load from a resolver via OMLoaderHost", () => {
		const host = new OMLoaderHost(nodeSys);
		const resolverURL = new URL("../src/test/example/design-tokens.resolver.json", import.meta.url);
		const { doc } = host.load(resolverURL);
		expect(doc.t).toBe(T.Group);
	});

	it("parseValue treats `{...}` as AliasRef nodes", () => {
		expect(parseValue("{a.b}").t).toBe(T.AliasRef);
	});
});
