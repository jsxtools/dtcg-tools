import type { Format } from "../types/format.js";

/**
 * Lazily merges an ordered array of DTCG {@link Format} objects into a single
 * combined token tree via a {@link Proxy}. Sources are applied left-to-right;
 * later entries override earlier ones at leaf (non-object) positions, while
 * nested groups are recursively merged so siblings from different sources are
 * preserved. No allocation occurs until a property is actually accessed.
 *
 * @example
 * mergeFormats([
 *   { color: { red: { $type: "color", $value: "…" } } },
 *   { color: { blue: { $type: "color", $value: "…" } } },
 * ])
 * // → proxy that lazily produces { color: { red: { … }, blue: { … } } }
 */
export const mergeFormats = (formats: Format[]): Format => {
	const handler: ProxyHandler<object> = {
		get(_target, key) {
			if (typeof key !== "string") return undefined;

			const subFormats: Format[] = [];
			let leafValue: unknown;
			let hasLeaf = false;

			for (const format of formats) {
				const val = (format as Record<string, unknown>)[key];
				if (val === undefined) continue;

				if (isPlainObject(val)) {
					subFormats.push(val as Format);
				} else {
					// A later leaf (primitive or array) wins; discard accumulated sub-objects.
					subFormats.length = 0;
					leafValue = val;
					hasLeaf = true;
				}
			}

			if (subFormats.length > 0) return mergeFormats(subFormats);
			if (hasLeaf) return leafValue;
			return undefined;
		},

		has(_target, key) {
			if (typeof key !== "string") return false;
			return formats.some((f) => key in (f as object));
		},

		ownKeys() {
			const keys = new Set<string>();

			for (const format of formats) {
				for (const key in format) {
					keys.add(key);
				}
			}

			return [...keys];
		},

		getOwnPropertyDescriptor(_target, key) {
			if (typeof key !== "string") return undefined;
			const exists = formats.some((f) => Object.hasOwn(f as object, key));
			if (!exists) return undefined;
			return { configurable: true, enumerable: true, writable: false, value: undefined };
		},
	};

	// Each call gets a fresh subclass so its prototype slot is independent.
	return NullProxy.from(handler) as unknown as Format;
};

// ─── NullProxy ────────────────────────────────────────────────────────────────

/**
 * A base class whose instances have no default own properties and whose
 * prototype chain routes all property access through a caller-supplied
 * {@link ProxyHandler}. Callers should subclass and call `.from(handler)` on
 * the subclass so each merged view gets an isolated prototype slot.
 */

class NullProxy {
	static {
		// @ts-expect-error to fully nullify the prototype
		delete NullProxy.prototype.constructor;
	}

	static from(handler: ProxyHandler<object>): NullProxy {
		return new Proxy(Object.create(null) as object, handler);
		// Object.setPrototypeOf(this.prototype, new Proxy(Object.create(null) as object, handler));

		// return new this;
	}
}

// ─── Internal ─────────────────────────────────────────────────────────────────

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === "object" && !Array.isArray(value);
