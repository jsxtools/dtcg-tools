import type { Group } from "./group.js";
import type { Token } from "./token.js";

/**
 * **Group or Token**
 *
 * A group or a token in the DTCG specification.
 * A token is identified by the presence of a `$value` property, while a group is any object without a `$value` property.
 */
export type GroupOrToken = Group | Token;
