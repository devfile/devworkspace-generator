# DevWorkspace Generator

## Overview
This library generates DevWorkspace components and templates for Eclipse Che. It transforms devfile.yaml specifications and editor definitions into Kubernetes DevWorkspace custom resources.

Published as [@eclipse-che/che-devworkspace-generator](https://www.npmjs.com/package/@eclipse-che/che-devworkspace-generator) on npm.

## Architecture
- **TypeScript library** with InversifyJS dependency injection
- **Main entry**: `src/entrypoint.ts` - exports generator functions
- **Core generator**: `src/main.ts` - orchestrates devfile parsing and DevWorkspace generation
- **API models**: Uses `@devfile/api` for Kubernetes DevWorkspace resource types
- **YAML processing**: `js-yaml` for parsing and serialization

## Development

### Quick Start
```bash
# One-command setup for development
yarn setup

# Or manually:
yarn install && yarn compile && yarn test
```

### Setup
```bash
yarn install       # Install all dependencies
```

### Build
```bash
yarn build         # Full build: format, compile, lint, test
yarn compile       # TypeScript compilation only
```

### Testing
```bash
yarn test          # Run Jest test suite with coverage
yarn lint          # ESLint checks
yarn format        # Prettier format check
yarn format:fix    # Auto-format code
yarn lint:fix      # Auto-fix lint issues
```

### Single-File Verification
Use these commands to verify individual files quickly (< 5 seconds):

```bash
# Lint a single file
npx eslint <path/to/file.ts>

# Type-check a single file
npx tsc --noEmit <path/to/file.ts>

# Format check a single file
npx prettier --check <path/to/file.ts>
```

## Coding Standards
- **TypeScript strict mode** enabled in tsconfig.json
- **100% test coverage** required (branches, functions, lines, statements)
- **Prettier** for consistent formatting (120 char line width, single quotes)
- **ESLint** for code quality
- **No implicit any** types
- **Explicit type annotations** for function parameters and return types
- **Conventional commits** - Use format: `type(scope): subject`
  - Types: feat, fix, docs, style, refactor, test, chore, ci, build, perf, revert
  - Example: `feat: add gitlab resolver`, `fix: handle null in bitbucket url parser`

## CI/CD
Pull requests must pass:
- License compliance checks
- ESLint validation
- TypeScript type checking
- Jest test suite with full coverage

## Pattern References

Common change patterns in this codebase:

### Adding a New Git Provider Resolver
**Pattern**: `src/github/` or `src/bitbucket/`

Each resolver follows a three-file structure:
- `{provider}-module.ts` - InversifyJS binding configuration
- `{provider}-resolver.ts` - Main resolver implementation with `resolve()` method
- `{provider}-url.ts` - URL parsing and validation

**Example**: See `src/github/github-resolver.ts` for URL pattern matching and content fetching.

### Adding DevFile Component Processing
**Pattern**: `src/devfile/`

Component processors follow naming: `{component-type}-{action}.ts`
- Use InversifyJS `@injectable()` decorator
- Implement focused single-responsibility methods
- Add corresponding test in `tests/devfile/`

**Example**: See `src/devfile/dev-container-component-finder.ts` for component location logic.

### Adding InversifyJS Module
**Pattern**: Any `*-module.ts` file

- Export a `ContainerModule` that binds interfaces to implementations
- Import and add to `src/inversify/inversify-binding.ts`
- Follow existing binding patterns (singleton vs transient)

**Example**: See `src/github/github-module.ts` for resolver binding pattern.

## Red Hat Compliance and Responsible AI Rules

See `./redhat-compliance-and-responsible-ai.md`.