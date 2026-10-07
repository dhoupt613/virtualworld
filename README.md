# Apple Atlas

A browser-based journey through an apple, from a cutaway specimen to plant cells and molecular structures. Built with Three.js and Vite. The supplied apple photo informs the palette and shape; textures are procedural. This first prototype is an artistic scientific visualization, not a measured reconstruction or a fully photoreal simulation.

## Develop

Use Node.js 22.12+ or 24+. Run `npm ci`, then `npm run dev -- --host 0.0.0.0`. Drag to look, scroll to zoom, and use WASD or arrow keys to move. Choose Fruit, Cell, or Molecule to change scale. Enter moves into the specimen. On touch screens, drag and pinch; use the movement pad to travel. Reset returns to the current scale's starting view.

## Validate

`npm run build` builds the production application. `npm test` runs functional browser tests against a temporary Vite server. Install Chromium once with `npx playwright install chromium`; Linux may also need browser system dependencies. In this cloud environment use `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright` for installation and tests.

No API keys, backend services, or external assets are required at runtime. Fruit anatomy and molecular models are simplified. Water and glucose use explicit bonds; spatial layouts are illustrative, not molecular dynamics. Sound is synthesized locally and enabled only by the Sound button.

## Host online

The production site is entirely static. `npm ci && npm run build` produces `dist/`. Publish the contents of that directory with any static website host. Relative asset URLs support both a root domain and a subpath such as `/virtualworld/`. No server process or environment variables are needed on the host.

### GitHub Pages

1. Commit and push the application and `.github/workflows/deploy-pages.yml` to the repository's `main` branch.
2. In `dhoupt613/virtualworld`, open **Settings → Pages**, then set **Source** to **GitHub Actions**. Pages must be available for the repository and account plan.
3. Open **Actions → Deploy Apple Atlas to GitHub Pages → Run workflow**. Subsequent pushes to `main` deploy automatically.

The workflow installs locked dependencies, builds and tests the production site, and publishes `dist/` using GitHub's built-in token. The deployment shows the public address; with the default Pages domain it is expected to be `https://dhoupt613.github.io/virtualworld/`. Creating these files does not itself publish the website.

### Netlify or Vercel

Connect this repository, choose `npm run build` as the build command and `dist` as the output directory, and use Node.js 24. For a manual Netlify deployment, build first, then drag the `dist` folder onto [Netlify Drop](https://app.netlify.com/drop). The host provides the public address after deployment. No custom routing rules are required.

`npm run test:hosted` verifies the built site under `/virtualworld/`, including asset loading, entry into the apple, all three scale views, and home navigation. It starts a temporary local preview server and needs the same Chromium setup as `npm test`.
