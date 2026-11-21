# Orogen

Orogen is an interactive 3D procedural terrain and biome engine. It raises seeded mountain ranges in the browser, lights them with a custom atmospheric scattering model, and lets you reshape the whole world from a single sentence through an AI terraformer.

![Orogen rendering the default Nordic fjord world at golden hour](https://github.com/user-attachments/assets/b6da8b3a-2ff7-4fe4-9ecf-3f35a33ea989)

## Highlights

- **Procedural geology.** Seeded simplex noise drives fractional Brownian motion, ridged multifractal crests, domain warping and carved valleys into a 513 x 513 heightfield, built in pure TypeScript.
- **Slope-aware biomes.** The terrain shader reads per-pixel normals, elevation and openness from the heightfield and blends seabed, wet shoreline sand, grass and tundra, stratified rock and snow.
- **Atmosphere.** A sky dome with Rayleigh-style gradients, Mie sun halo, solar disc and cirrus shares one scattering function with the height-based fog, so distant terrain always dissolves into the correct horizon color.
- **Optical water.** Directional wave normals, Fresnel sky reflection, sun glints, depth-based absorption from turquoise shallows to deep blue, and animated shoreline foam.
- **Instanced biomes.** Thousands of conifers and boulders are scattered deterministically by elevation, slope and exposure as two instanced meshes, with wind sway computed in the vertex shader.
- **Cinematic output.** Soft PCF sun shadows, HDR bloom on sun glints and snow, vignette and ACES filmic tone mapping.
- **Smooth terraforming.** Lighting, palette and water interpolate every frame, and the terrain morphs between heightfields instead of popping.

## AI terraformer

Press `Cmd K`, or use the pill at the bottom of the screen, and describe a world:

- Volcanic obsidian archipelago at twilight with crimson horizon
- Misty emerald alpine valley at dawn
- Arid Martian canyon under a dusty amber sky

`POST /api/terraform` turns the prompt into a `TerraformDirective`: terrain amplitude, ridge sharpness, warp intensity, valley depth, water level, snow line, foliage density, a six-color biome palette, sun elevation and azimuth, sky zenith and horizon colors, and fog density. The directive is defined once as a Zod schema, used as the structured output contract for the model and validated again before it reaches the scene.

The endpoint works with or without credentials:

| Configuration | Behavior |
| --- | --- |
| `OPENAI_API_KEY` set | The Vercel AI SDK requests a structured directive from the configured OpenAI model. |
| No key, or the model call fails | A deterministic local resolver scores the prompt against curated presets, then applies lexicon modifiers for time of day, weather, color and landform. |

Curated preset chips in the command bar apply instantly without a network request.

## Architecture

```
src/
  engine/        Pure TypeScript: seeded PRNG, noise, heightfield, geometry and scatter placement
  shaders/       GLSL sources imported as raw strings, plus shared chunks
  scene/         React Three Fiber components and the per-frame runtime
  ai/            Zod schema, presets, local resolver and model instructions
  store/         Zustand store for UI state and terraform targets
  components/    Viewport loader and the glass HUD
  app/           Next.js App Router shell and the terraform API route
```

How a frame is produced:

1. The Zustand store holds the target world. It is never read inside the render loop; a subscription copies each change into a plain mutable target.
2. `stepWorld` runs once per frame, interpolates every shared uniform toward its target, and derives the sun direction and radiance.
3. Sky, terrain, water and scatter materials reference the same uniform objects, so one update drives every shader.
4. When noise parameters or the seed change, the heightfield is rebuilt, the previous geometry and field texture are disposed, and the vertex shader morphs from the old elevations to the new ones.

Three.js is loaded only on the client through a dynamic import with server rendering disabled.

## Getting started

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000. The default world renders immediately and every feature works without configuration.

To enable model-backed terraforming, copy the example environment file and add a key:

```bash
cp .env.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Enables structured generation through OpenAI. Optional. |
| `OROGEN_OPENAI_MODEL` | Model identifier. Defaults to `gpt-5-mini`. |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run the TypeScript compiler without emitting |

## Controls

- Drag to orbit and scroll to zoom. The orbit button toggles the automatic camera drift.
- The Environment panel adjusts sun elevation and azimuth, water level, haze and foliage in real time.
- New seed regenerates the terrain for the current biome.

## License

Released under the [MIT License](LICENSE).
