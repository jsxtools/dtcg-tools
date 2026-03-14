import type { Format } from "../types/format.js"

/**
 * Deep-merges an ordered iterable of DTCG {@link Format} objects into a single
 * combined token tree. Sources are applied left-to-right; later entries override
 * earlier ones at leaf (non-object) positions, while nested groups are recursively
 * merged so siblings from different sources are preserved.
 *
 * @example
 * mergeFormats([
 *   { color: { red: { $type: "color", $value: "…" } } },
 *   { color: { blue: { $type: "color", $value: "…" } } },
 * ])
 * // → { color: { red: { … }, blue: { … } } }
 */
export const mergeFormats = (formats: Iterable<Format>): Format => {
	const merged: Record<string, unknown> = {}

	for (const format of formats) {
		deepMergeInto(merged, format as Record<string, unknown>)
	}

	return merged as Format
}

// ─── Internal ─────────────────────────────────────────────────────────────────

/**
 * Recursively merges `source` into `target` in-place.
 * Plain objects are merged deeply; all other values (arrays, primitives) replace.
 */
const deepMergeInto = (
	target: Record<string, unknown>,
	source: Record<string, unknown>,
): void => {
	for (const [key, value] of Object.entries(source)) {
		if (isPlainObject(value) && isPlainObject(target[key])) {
			deepMergeInto(target[key] as Record<string, unknown>, value)
		} else {
			target[key] = value
		}
	}
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === "object" && !Array.isArray(value)

