# Changesets

Every pull request that changes what ships in the package adds a changeset:

```bash
npx changeset
```

Pick the bump: **patch** for logo fixes or metadata corrections, **minor** for new logos, countries or API additions, **major** for breaking API changes or removed/renamed ids.

Pushing to `main` opens a **"Version packages"** PR; merging it publishes to npm with provenance, then tags and creates a GitHub Release. The full process, setup and troubleshooting are in [CONTRIBUTING.md → Releasing](../CONTRIBUTING.md#releasing).
