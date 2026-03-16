# Contributing to DevWorkspace Generator

Thank you for your interest in contributing to the DevWorkspace Generator! This document provides guidelines and instructions for contributing.

## Reporting Issues

Issues are tracked at [github.com/eclipse/che/issues](https://github.com/eclipse/che/issues). When filing a bug or feature request, please use the appropriate [issue template](https://github.com/devfile/devworkspace-generator/issues/new/choose).

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [Yarn](https://yarnpkg.com/) package manager

## Getting Started

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/<your-username>/devworkspace-generator.git
   cd devworkspace-generator
   ```

2. Install dependencies:

   ```bash
   yarn install
   ```

3. Build the project:

   ```bash
   yarn build
   ```

   This runs formatting checks, compilation, linting, and tests.

## Development Workflow

### Building

```bash
yarn compile        # Compile TypeScript
yarn build          # Full build (format + compile + lint + test)
yarn watch          # Watch mode for incremental compilation
```

### Formatting

The project uses [Prettier](https://prettier.io/) with the following configuration:
- Print width: 120
- Single quotes
- Arrow parens: avoid

```bash
yarn format         # Check formatting
yarn format:fix     # Auto-fix formatting issues
```

### Linting

[ESLint](https://eslint.org/) is used for static analysis.

```bash
yarn lint           # Run linter
yarn lint:fix       # Auto-fix lint issues
```

### Testing

Tests are written with [Jest](https://jestjs.io/) and located in the `tests/` directory.

```bash
yarn test           # Run tests with coverage
```

**Important:** This project requires **100% code coverage** (branches, functions, lines, and statements). All new code must be fully covered by tests.

## Submitting a Pull Request

1. Create a branch for your changes:

   ```bash
   git checkout -b my-feature
   ```

2. Make your changes, ensuring:
   - Code compiles without errors (`yarn compile`)
   - Formatting passes (`yarn format`)
   - Linting passes (`yarn lint`)
   - All tests pass with 100% coverage (`yarn test`)

3. Run the full build to verify everything:

   ```bash
   yarn build
   ```

4. Commit your changes and push to your fork.

5. Open a pull request against the `main` branch. Fill out the [PR template](https://github.com/devfile/devworkspace-generator/blob/main/.github/PULL_REQUEST_TEMPLATE.md), which asks:
   - What does this PR do?
   - What issues does this PR fix or reference?
   - Is it tested? How?

## Project Structure

```
src/
├── api/                  # DevfileContext API types
├── bitbucket/            # Bitbucket Cloud URL resolver
├── bitbucket-server/     # Bitbucket Server URL resolver
├── devfile/              # Devfile processing (component finder/inserter)
├── devfile-schema/       # Devfile JSON schemas (2.0.0 – 2.3.0)
├── editor/               # Editor definition resolver
├── fetch/                # URL fetching utilities
├── github/               # GitHub URL resolver
├── inversify/            # Dependency injection bindings
├── resolve/              # Git URL resolution
├── entrypoint.ts         # CLI entrypoint
├── generate.ts           # DevWorkspace generation logic
├── main.ts               # Library main export
└── types.ts              # Shared types
tests/                    # Test files mirroring src/ structure
```

## License

This project is licensed under the [Apache License 2.0](LICENSE). By contributing, you agree that your contributions will be licensed under the same license.
