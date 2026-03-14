import { load } from "./loader/index.js";

const resolverURL = new URL("../src/test/example/design-tokens.resolver.json", import.meta.url);

const { tokens } = load(resolverURL);

// $ref objects and alias strings inside composite $value should be fully resolved
const shadow = (tokens as any)["box-shadow"].panel.$value;
console.log(JSON.stringify(shadow, null, 2));

// Spot-check: components should be an array, not a { $ref: "…" } object
const components = shadow[0].color.components;
console.log("components resolved:", Array.isArray(components), components);

// Alias resolution: "{base.zero}" inside the shadow value should be a dimension object
const offsetY = shadow[0].offsetY;
console.log("offsetY resolved:", offsetY);
