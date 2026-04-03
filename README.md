# Solitaire Photos

Browser-based Klondike solitaire with your Google Photos as card backs. A static site deployed to GitHub Pages — zero backend, zero runtime dependencies.

## Prerequisites

- **Node.js 20** (LTS) — see `.nvmrc`
- **npm 10+** (ships with Node 20)

```bash
nvm use        # reads .nvmrc
```

## Getting Started

```bash
# Install dependencies (all devDependencies)
npm ci

# Start the development server
npm run dev

# Open http://localhost:5173/solitaire-photos/
```

## NPM Scripts

| Script                  | Description                   |
| ----------------------- | ----------------------------- |
| `npm run dev`           | Start Vite dev server         |
| `npm run build`         | Type-check + production build |
| `npm run preview`       | Preview the production build  |
| `npm run test`          | Run Vitest (single run)       |
| `npm run test:watch`    | Run Vitest in watch mode      |
| `npm run test:coverage` | Run tests with V8 coverage    |
| `npm run lint`          | ESLint + Prettier check       |
| `npm run lint:fix`      | Auto-fix lint and formatting  |

## Project Structure

```
solitaire-photos/
├── src/
│   ├── game/              # Game engine, difficulty config, card utilities
│   ├── services/          # Auth, Photos API, caching, scoring
│   ├── ui/                # Card renderer, board layout, drag, shell, end-game
│   ├── types/             # Shared TypeScript interfaces (Card, GameState, etc.)
│   ├── styles/            # CSS custom properties, reset, global styles
│   └── main.ts            # Application entry point
├── tests/
│   ├── game/              # Unit tests for game logic
│   ├── contract/          # Interface contract tests
│   ├── edge/              # Boundary and edge-case tests
│   └── integration/       # Module import chain tests
├── .github/workflows/     # CI/CD pipeline
├── index.html             # App shell (Vite entry)
├── vite.config.ts         # Vite + Vitest configuration
├── tsconfig.json          # TypeScript (strict mode)
└── eslint.config.js       # ESLint flat config (type-aware)
```

## Tech Stack

| Category     | Tool                                      |
| ------------ | ----------------------------------------- |
| Language     | TypeScript 6 (strict mode)                |
| Build        | Vite 8                                    |
| Tests        | Vitest 4 + V8 coverage                    |
| Linting      | ESLint 9 (type-aware) + Prettier 3        |
| CSS          | Vanilla CSS + Custom Properties + Modules |
| CI/CD        | GitHub Actions → GitHub Pages             |
| Dependencies | **Zero runtime** — all devDependencies    |

## Development Workflow

1. Create a feature branch from `main`
2. Write tests first (`tests/` directory) — TDD Red phase
3. Implement in `src/` — Green phase
4. Refactor while tests stay green
5. Run `npm run lint && npm run test && npm run build`
6. Open a PR against `main`
7. CI runs automatically (lint → test → build)
8. Merge triggers deployment to GitHub Pages

## Deployment

The CI/CD pipeline deploys automatically on push to `main`:

1. **CI job:** lint → test:coverage → build
2. **Deploy job:** uploads `dist/` to GitHub Pages

**One-time setup:** In the repo's **Settings → Pages → Source**, select **GitHub Actions**.

Live site: [https://vbomfim.github.io/solitaire-photos/](https://vbomfim.github.io/solitaire-photos/)

## License

MIT
