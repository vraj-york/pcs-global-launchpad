import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { permutateThemes, register } from "@tokens-studio/sd-transforms";
import StyleDictionary from "style-dictionary";
import {
	logBrokenReferenceLevels,
	logVerbosityLevels,
	logWarningLevels,
} from "style-dictionary/enums";

// Register tokens-studio transforms
register(StyleDictionary);

// Read the $themes.json file
const $themes = JSON.parse(readFileSync("src/tokens/$themes.json", "utf-8"));

// Get the permutations of themes (creates separate configs for each theme)
const themes = permutateThemes($themes.themes, { separator: "-" });

// Clean up before building
const outputPath = "src/tokens/tokens.css";
if (existsSync(outputPath)) {
	unlinkSync(outputPath);
}

// Collect all CSS outputs
const cssOutputs = [];

// Build CSS for each theme
for (const [themeName, tokenSets] of Object.entries(themes)) {
	// Determine the selector based on theme name
	// First theme (light) is the default :root
	const isDefaultTheme = themeName === "bsp-light";
	const selector = isDefaultTheme
		? `:root, :root[data-theme="${themeName}"]`
		: `:root[data-theme="${themeName}"]`;

	// Build the source array from enabled token sets
	const source = tokenSets.map((set) => `src/tokens/${set}.json`);

	// Temporary file for this theme
	const tempFile = `tokens-${themeName}.css`;

	const sd = new StyleDictionary({
		source,
		preprocessors: ["tokens-studio"],
		platforms: {
			css: {
				buildPath: "src/tokens/",
				prefix: "bsp",
				transformGroup: "tokens-studio",
				files: [
					{
						destination: tempFile,
						format: "css/variables",
						options: {
							selector,
							outputReferences: true,
						},
					},
				],
			},
		},
		log: {
			warnings: logWarningLevels.warn,
			verbosity: logVerbosityLevels.verbose,
			errors: {
				brokenReferences: logBrokenReferenceLevels.throw,
			},
		},
	});

	await sd.buildAllPlatforms();

	// Read the generated CSS and add to outputs
	const tempPath = `src/tokens/${tempFile}`;
	const css = readFileSync(tempPath, "utf-8");
	cssOutputs.push(css);

	// Clean up temp file
	unlinkSync(tempPath);
}

// Combine all CSS outputs into a single file
const combinedCSS = `/**
 * Do not edit directly, this file was auto-generated.
 */

${cssOutputs.join("\n")}`;

writeFileSync(outputPath, combinedCSS);

// Build JS/TS tokens using the light theme as base (non-theme-specific tokens)
const lightThemeTokenSets = themes["bsp-light"];
if (lightThemeTokenSets) {
	const source = lightThemeTokenSets.map((set) => `src/tokens/${set}.json`);

	const sdJs = new StyleDictionary({
		source,
		preprocessors: ["tokens-studio"],
		platforms: {
			js: {
				buildPath: "src/tokens/",
				prefix: "bsp",
				transformGroup: "tokens-studio",
				files: [
					{
						destination: "tokens.js",
						format: "javascript/es6",
					},
				],
			},
			ts: {
				buildPath: "src/tokens/",
				prefix: "bsp",
				transformGroup: "tokens-studio",
				files: [
					{
						destination: "tokens.d.ts",
						format: "typescript/es6-declarations",
					},
				],
			},
		},
		log: {
			warnings: logWarningLevels.warn,
			verbosity: logVerbosityLevels.verbose,
			errors: {
				brokenReferences: logBrokenReferenceLevels.throw,
			},
		},
	});

	await sdJs.buildAllPlatforms();
}
