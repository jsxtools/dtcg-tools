import { load } from "./loader/index.js";

const resolverURL = new URL("../src/test/example/design-tokens.resolver.json", import.meta.url);

const { tokens } = load(resolverURL);

// Direct access — no createTree wrapper needed
console.dir(tokens["z-index"], { depth: null });

// Alias resolution: color.primary.light.$value should resolve to a concrete color value
// console.log((tokens as any).color?.primary?.light?.$value);

// $type inheritance: a token without its own $type should show the group's type
// console.log((tokens as any)["border-radius"]?.full?.$type); // → "dimension"
