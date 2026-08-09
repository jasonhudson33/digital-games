# Use one root Next.js application

The repository deploys as one Next.js App Router application from the repository root. Mafia and Monopoly are source contexts mounted by Next, not independent Vite applications, so dependencies, type checking, tests, and production builds are owned by the root package.
