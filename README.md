# dtcg-tools

[![Tests](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/jsxtools/dtcg-tools/badges/tests.json)](https://github.com/jsxtools/dtcg-tools/actions)
[![Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/jsxtools/dtcg-tools/badges/coverage.json)](https://github.com/jsxtools/dtcg-tools/actions)
[![npm version](https://img.shields.io/npm/v/dtcg-tools.svg)](https://www.npmjs.com/package/dtcg-tools)
[![License](https://img.shields.io/badge/license-MIT--0-blue.svg)](LICENSE.md)

> TypeScript types for the Design Tokens Community Group (DTCG) 2025.10 format and resolver schemas.

## Features

- Type-only package with no runtime API
- Root exports for `Format`, `Resolver`, and related schema types
- Subpath exports for specific token, group, resolver, and value types

## Installation

```bash
npm install dtcg-tools
```

## Usage

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

## Subpath imports

```ts
import type { TokenType } from "dtcg-tools/types/format/tokenType";
import type { DimensionValue } from "dtcg-tools/types/format/values/dimension";
```

## Development

```bash
npm run lint
npm run type-check
npm run build
npm run test:node
```

## License

[MIT-0](LICENSE.md)
