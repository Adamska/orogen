# Orogen

Orogen is an interactive 3D procedural terrain and biome engine. It raises seeded mountain ranges in the browser, lights them with a custom atmospheric scattering model, and lets you reshape the whole world from a single sentence through an AI terraformer.

**Live demo:** [orogen-six.vercel.app](https://orogen-six.vercel.app)

![Orogen rendering the default Nordic fjord world at golden hour](https://github.com/user-attachments/assets/9c12ad3a-d654-4eda-9d7d-ee624c6f989b)


## Highlights

- **Procedural geology.** Seeded simplex noise drives fractional Brownian motion, ridged multifractal crests, domain warping and carved valleys into a 513 x 513 heightfield, built in pure TypeScript.
- **Slope-aware biomes.** The terrain shader reads per-pixel normals, elevation and openness from the heightfield and blends seabed, wet shoreline sand, grass and tundra, stratified rock and snow.
- **Atmosphere.** A sky dome with Rayleigh-style gradients, Mie sun halo, solar disc and cirrus shares one scattering function with the height-based fog, so distant terrain always dissolves into the correct horizon color.
- **Optical water.** Directional wave normals, Fresnel sky reflection, sun glints, depth-based absorption from turquoise shallows to deep blue, and animated shoreline foam.
- **Living biomes.** Conifers, broadleaf trees, palms or scrub are scattered deterministically by elevation, slope and exposure, frustum culled in spatial tiles, and swayed by wind in the vertex shader.
- **Sky and weather.** A raymarched cumulus layer, a day and night time lapse with stars and moonlight, and rain or snow that darkens the sky, wets the rock and lowers the snow line.
- **Volcanism.** Lava channels and glowing fissures feed HDR bloom, and every terrain morph lights a cooling front across the uplifted crust.
- **Cinematic output.** Soft PCF shadows, bloom, ACES filmic tone mapping, a camera that flies a crane shot on every terraform, and a photo mode with depth of field, god rays and 4K PNG export.
- **Hands on.** Free flight with terrain-following collision, a live sculpting brush, a gallery of recent worlds and shareable links that encode the whole world in the URL.
- **Procedural audio.** Wind, surf, rain, volcanic rumble and birdsong are synthesized with Web Audio and mixed from the current world.

## AI terraformer

Open the pill at the bottom of the screen and describe a world:

- Volcanic obsidian archipelago at twilight with crimson horizon
- Misty emerald alpine valley at dawn
- Arid Martian canyon under a dusty amber sky

`POST /api/terraform` turns the prompt into a `TerraformDirective`: terrain amplitude, ridge sharpness, warp intensity, valley depth, water level, snow line, foliage density, volcanism, vegetation form, weather, a seven-color biome palette, sun elevation and azimuth, sky zenith and horizon colors, and fog density. The directive is defined once as a Zod schema, used as the structured output contract for the model and validated again before it reaches the scene.

The endpoint works with or without credentials:

| Configuration | Behavior |
| --- | --- |
| `OPENAI_API_KEY` set | The Vercel AI SDK requests a structured directive from the configured OpenAI model. |
| No key, or the model call fails | A deterministic local resolver scores the prompt against curated presets, then applies lexicon modifiers for time of day, weather, color and landform. |

Curated preset chips in the command bar apply instantly without a network request. After every terraform a director log narrates what changed, derived from the difference between the previous and the next world.

## Architecture

```
src/
  engine/        Pure TypeScript: noise, heightfield, meshes, scatter and sculpting, run in a Web Worker
  shaders/       GLSL sources imported as raw strings, plus shared chunks
  scene/         React Three Fiber components and the per-frame runtime
  ai/            Zod schema, presets, local resolver and model instructions
  store/         Zustand stores for the world, quality tier, boot progress, history and links
  audio/         Procedural Web Audio ambience
  components/    Viewport loader and the glass HUD
  app/           Next.js App Router shell and the terraform API route
```

How a frame is produced:

1. The Zustand store holds the target world. It is never read inside the render loop; a subscription copies each change into a plain mutable target.
2. `stepWorld` runs once per frame, interpolates every shared uniform toward its target, and derives the sun direction and radiance.
3. Sky, terrain, water and scatter materials reference the same uniform objects, so one update drives every shader.
4. When noise parameters or the seed change, a Web Worker builds the heightfield, field texture, terrain mesh and scatter layout off the main thread. The vertex shader reads elevation from the field textures, so terrain morphs by blending two textures and sculpting only touches texels.
5. A performance monitor moves between three quality tiers that set pixel ratio, shadow map size, antialiasing, cloud steps, foliage density and terrain mesh resolution.

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
- The Environment panel adjusts sun, water, haze, foliage and weather, and its Terrain shaping section exposes relief, ridges, warp, valleys, snow line and volcanism.
- The action row regenerates the seed, toggles orbit and the time lapse, starts free flight (WASD, drag to look, E and Q to climb, Shift to boost), opens the sculpting brush and photo mode, and copies a link to the current world.
- The speaker button in the top right plays the ambient soundscape.

## License

Released under the [MIT License](LICENSE).
