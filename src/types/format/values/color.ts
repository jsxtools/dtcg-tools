import type { JSONPointerReferenceObject } from "./../../format.js";

/**
 * Value schema for color type tokens. Represents a color in a specific color space.
 */
export type ColorValue = AllColorValue & {
	/** The color space or color model used to represent the color. */
	colorSpace: AllColorValue["colorSpace"] | JSONPointerReferenceObject;

	/** Array of color components. The number and meaning of components depend on the color space. Each component can be a number or the 'none' keyword. */
	components: AllColorValue["components"] | JSONPointerReferenceObject;

	/** The alpha (transparency) value of the color. 0 is fully transparent, 1 is fully opaque. If omitted, defaults to 1. */
	alpha?: number | JSONPointerReferenceObject;

	/** Optional fallback value in 6-digit CSS hex color notation (e.g., '#ff00ff'). Must be 6 digits to avoid conflicts with the alpha value. */
	hex?: `#${string}` | JSONPointerReferenceObject;
};

export type ColorSpace = string & AllColorValue["colorSpace"];

// #region Definitions

/** A color component normalized to the range [0-1] (e.g., RGB values, XYZ values). */
export type ZeroToOneComponent = number | JSONPointerReferenceObject | "none";

/** Hue angle from 0 up to (but not including) 360 degrees. */
export type HueComponent = number | JSONPointerReferenceObject | "none";

/** Percentage value from 0 to 100. */
export type PercentageComponent = number | JSONPointerReferenceObject | "none";

/** Chroma value from 0 to infinity. */
export type ChromaComponent = number | JSONPointerReferenceObject | "none";

/** A color component with no numeric bounds (e.g., A and B in LAB/OKLAB color spaces). */
export type UnboundedComponent = number | JSONPointerReferenceObject | "none";

/** Array of RGB color components [Red, Green, Blue], each normalized to the range [0-1]. */
export type RGBComponents = [
	/** Red: A number between 0 and 1 representing the red component of the color. */
	r: ZeroToOneComponent,
	/** Green: A number between 0 and 1 representing the green component of the color. */
	g: ZeroToOneComponent,
	/** Blue: A number between 0 and 1 representing the blue component of the color. */
	b: ZeroToOneComponent,
];

export type XYZComponents = [
	/** X: A number between 0 and 1 representing the X component of the color. */
	x: ZeroToOneComponent,
	/** Y: A number between 0 and 1 representing the Y component of the color. */
	y: ZeroToOneComponent,
	/** Z: A number between 0 and 1 representing the Z component of the color. */
	z: ZeroToOneComponent,
];

// #endregion

// #region All of the Color Values

export type AllColorValue =
	| SRGBColorValue
	| SRGBLinearColorValue
	| DisplayP3ColorValue
	| A98RGBColorValue
	| ProPhotoRGBColorValue
	| Rec2020ColorValue
	| XYZD65ColorValue
	| XYZD50ColorValue
	| HSLColorValue
	| HWBColorValue
	| LABColorValue
	| LCHColorValue
	| OKLABColorValue
	| OKLCHColorValue;

export interface SRGBColorValue {
	colorSpace: "srgb";
	components: RGBComponents;
}

export interface SRGBLinearColorValue {
	colorSpace: "srgb-linear";
	components: RGBComponents;
}

export interface DisplayP3ColorValue {
	colorSpace: "display-p3";
	components: RGBComponents;
}

export interface A98RGBColorValue {
	colorSpace: "a98-rgb";
	components: RGBComponents;
}

export interface ProPhotoRGBColorValue {
	colorSpace: "prophoto-rgb";
	components: RGBComponents;
}

export interface Rec2020ColorValue {
	colorSpace: "rec2020";
	components: RGBComponents;
}

export interface XYZD65ColorValue {
	colorSpace: "xyz-d65";
	components: XYZComponents;
}

export interface XYZD50ColorValue {
	colorSpace: "xyz-d50";
	components: XYZComponents;
}

export interface HSLColorValue {
	colorSpace: "hsl";
	components: [
		/** Hue: A number from 0 up to (but not including) 360 representing the angle of the color on the color wheel. */
		h: HueComponent,
		/** Saturation: A number between 0 and 100 representing the percentage of color saturation. */
		s: PercentageComponent,
		/** Lightness: A number between 0 and 100 representing the percentage of lightness. */
		l: PercentageComponent,
	];
}

export interface HWBColorValue {
	colorSpace: "hwb";
	components: [
		/** Hue: A number from 0 up to (but not including) 360 representing the angle of the color on the color wheel. */
		h: HueComponent,
		/** A: Whiteness: A number between 0 and 100 representing the percentage of white in the color. */
		a: PercentageComponent,
		/** Blackness: A number between 0 and 100 representing the percentage of black in the color. */
		b: PercentageComponent,
	];
}

export interface LABColorValue {
	colorSpace: "lab";
	components: [
		/** Lightness: A number between 0 and 100 representing the percentage of lightness of the color. */
		l: PercentageComponent,
		/** A: Theoretically unbounded signed number representing the green-red axis. In practice doesn't exceed −160 to 160. */
		a: UnboundedComponent,
		/** B: Theoretically unbounded signed number representing the blue-yellow axis. In practice doesn't exceed −160 to 160. */
		b: UnboundedComponent,
	];
}

export interface LCHColorValue {
	colorSpace: "lch";
	components: [
		/** Lightness: A number between 0 and 100 representing the percentage of lightness of the color. */
		l: PercentageComponent,
		/** Chroma: A number representing the chroma of the color. Unbounded but in practice doesn't exceed 230. */
		c: ChromaComponent,
		/** Hue: A number from 0 up to (but not including) 360 representing the angle of the color on the color wheel. */
		h: HueComponent,
	];
}

export interface OKLABColorValue {
	colorSpace: "oklab";
	components: [
		/** L: A number between 0 and 1 representing the lightness component of the color. */
		l: ZeroToOneComponent,
		/** A: A signed number representing the green-red axis of the color. Unbounded but in practice doesn't exceed -0.5 to 0.5. */
		a: UnboundedComponent,
		/** B: A signed number representing the blue-yellow axis of the color. Unbounded but in practice doesn't exceed -0.5 to 0.5. */
		b: UnboundedComponent,
	];
}

export interface OKLCHColorValue {
	colorSpace: "oklch";
	components: [
		/** L: A number between 0 and 1 representing the lightness component of the color. */
		l: ZeroToOneComponent,
		/** C: A number representing the chroma component of the color. */
		c: ChromaComponent,
		/** H: A number representing the hue component of the color. */
		h: HueComponent,
	];
}
