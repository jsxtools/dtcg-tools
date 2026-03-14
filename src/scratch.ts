import { load } from "./loader/index.js";

const resolverURL = new URL("../src/test/example/design-tokens.resolver.json", import.meta.url);

const { tokens } = load(resolverURL);

// Leaf token: should be the resolved value directly, no $type/$value wrapper
console.log("panel shadow:", JSON.stringify((tokens as any)["box-shadow"].panel, null, 2));

// Group node: should still be a navigable object
console.log("box-shadow group $type:", (tokens as any)["box-shadow"].$type);

// Alias resolution inside the value
console.log("panel[0].offsetX:", (tokens as any)["box-shadow"].panel[0].offsetX);
