import { load, nodeSys } from "./loader/node.js";
import { getToken, OMLoaderHost, T, toJSONComputed } from "./loader/om.js";

const resolverURL = new URL("../src/test/example/design-tokens.resolver.json", import.meta.url);

const { tokens } = load(resolverURL);

const { doc, ctx } = new OMLoaderHost(nodeSys).load(resolverURL);

// focus-ring dark: alias "{color.blue.600.dark}" inside plain-object $value should resolve
console.log("focus-ring dark:", JSON.stringify((tokens as any)["focus-ring"].dark, null, 2));

// OM: preserve refs + resolve on-demand
const focusRingDark = getToken(doc, "focus-ring.dark");
if (focusRingDark?.t === T.Token) console.log("focus-ring dark (om):", JSON.stringify(toJSONComputed(focusRingDark.value, ctx), null, 2));

// focus-ring light: same for light
console.log("focus-ring light color:", (tokens as any)["focus-ring"].light?.color);
