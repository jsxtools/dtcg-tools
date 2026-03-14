import type { Format } from "../types/format.js";
import type { Resolver } from "../types/resolver.js";

import plainBase from "./example/base.json" with { type: "json" };
import plainBorderRadius from "./example/border-radius.json" with { type: "json" };
import plainColor from "./example/color.json" with { type: "json" };
import plainComponentButton from "./example/component.button.json" with { type: "json" };
import plainComponentIcon from "./example/component.icon.json" with { type: "json" };
import plainComponentPanel from "./example/component.panel.json" with { type: "json" };
import plainResolver from "./example/design-tokens.resolver.json" with { type: "json" };
import plainFocusRing from "./example/focus-ring.json" with { type: "json" };
import plainFont from "./example/font.json" with { type: "json" };
import plainShadow from "./example/shadow.json" with { type: "json" };
import plainSpacing from "./example/spacing.json" with { type: "json" };
import plainTransition from "./example/transition.json" with { type: "json" };
import plainZIndex from "./example/z-index.json" with { type: "json" };

export const typedBase = plainBase satisfies Format;
export const typedBorderRadius = plainBorderRadius satisfies Format;
export const typedColor = plainColor satisfies Format;
export const typedComponentButton = plainComponentButton satisfies Format;
export const typedComponentIcon = plainComponentIcon satisfies Format;
export const typedComponentPanel = plainComponentPanel satisfies Format;
export const typedFocusRing = plainFocusRing satisfies Format;
export const typedFont = plainFont satisfies Format;
export const typedShadow = plainShadow satisfies Format;
export const typedSpacing = plainSpacing satisfies Format;
export const typedTransition = plainTransition satisfies Format;
export const typedZIndex = plainZIndex satisfies Format;

export const typedResolver = { ...plainResolver, version: "2025.10" } satisfies Resolver;
