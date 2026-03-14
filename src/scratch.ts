import { load } from "./loader/index.js";

const resolverURL = new URL("../src/test/example/design-tokens.resolver.json", import.meta.url);

const { tokens } = load(resolverURL);

// focus-ring dark: alias "{color.blue.600.dark}" inside plain-object $value should resolve
console.log("focus-ring dark:", JSON.stringify((tokens as any)["focus-ring"].dark, null, 2));

// focus-ring light: same for light
console.log("focus-ring light color:", (tokens as any)["focus-ring"].light?.color);
