# dtcg-tools

[![Tests](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/jsxtools/dtcg-tools/badges/tests.json)](https://github.com/jsxtools/dtcg-tools/actions)
[![Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/jsxtools/dtcg-tools/badges/coverage.json)](https://github.com/jsxtools/dtcg-tools/actions)
[![npm version](https://img.shields.io/npm/v/dtcg-tools.svg)](https://www.npmjs.com/package/dtcg-tools)
[![License](https://img.shields.io/badge/license-MIT--0-blue.svg)](LICENSE.md)

> TypeScript types and runtime tools for the [Design Tokens Community Group](https://www.designtokens.org/) (DTCG) 2025.10 format and resolver schemas.

## Features

- **Types** — Full TypeScript types for the DTCG Format and Resolver specifications, including tokens, groups, sets, modifiers, and value types.
- **Loader** — Runtime loader that reads DTCG resolver documents, resolves `$ref` sources, and merges token sets into a single token tree. Ships with a Node.js filesystem adapter and a pluggable `LoaderSys` interface for any environment.
- **Object Model** — Experimental Typed-OM-like API that represents every token, group, and value as a typed node. Supports alias and JSON Pointer reference resolution, cycle detection, and computed value extraction.

## Installation

```bash
npm install dtcg-tools
```

## Usage

### Types

```ts
import type { Format, Resolver, Token } from "dtcg-tools";

const token = {
	$type: "dimension",
	$value: { value: 8, unit: "px" },
} satisfies Token;

const format = {
	spacing: { md: token },
} satisfies Format;

const resolver = {
	version: "2025.10",
	resolutionOrder: [{ name: "base", type: "set", sources: [format] }],
} satisfies Resolver;
```

### Loader

```ts
import { LoaderHost } from "dtcg-tools/loader";
import { nodeSys } from "dtcg-tools/loader/node";

const host = new LoaderHost(nodeSys);
const { tokens, sources } = host.load("path/to/resolver.json");
```

Provide a custom `LoaderSys` to run in any environment:

```ts
import { LoaderHost, type LoaderSys } from "dtcg-tools/loader";

const browserSys: LoaderSys = {
	readFile: (url) =>
		fileMap.get(url.href) ??
		(() => {
			throw new Error(`Not found: ${url}`);
		})(),
	currentDirectory: () => new URL("./", location.href),
};

const host = new LoaderHost(browserSys);
```

### Object Model (experimental)

```ts
import { OMLoaderHost, getToken, compute, createEvalContext } from "dtcg-tools/loader";
import { nodeSys } from "dtcg-tools/loader/node";

const host = new OMLoaderHost(nodeSys);
const { doc, ctx } = host.load("path/to/resolver.json");

const token = getToken(doc, "color.primary");
if (token) {
	const resolved = compute(token.value, ctx);
}
```

## Subpath exports

| Export                   | Description                                                        |
| ------------------------ | ------------------------------------------------------------------ |
| `dtcg-tools`             | Type-only — `Format`, `Resolver`, `Token`, and all related types   |
| `dtcg-tools/loader`      | `LoaderHost`, `OMLoaderHost`, node traversal helpers, `RAW` symbol |
| `dtcg-tools/loader/node` | `nodeSys` adapter and convenience `load()` for Node.js             |
| `dtcg-tools/types`       | All format and resolver types                                      |
| `dtcg-tools/types/*`     | Individual type modules (e.g. `types/format/tokenType`)            |

## Development

```bash
npm run build         # compile TypeScript
npm run type-check    # type-check without emitting
npm run lint          # lint with Biome
npm run format        # format with dprint
npm run test:node     # run tests in Node.js
npm run test          # run tests in Node.js + Chromium, Firefox, and WebKit
```

## License

[MIT-0](LICENSE.md)
