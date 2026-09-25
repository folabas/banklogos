# Changesets

Every pull request that changes what ships in the package adds a changeset:

```bash
npx changeset
```

Pick the bump: **patch** for logo fixes or metadata corrections, **minor** for new logos, countries or API additions, **major** for breaking API changes or removed/renamed ids. On merge to `main`, the release workflow opens a "Version packages" PR; merging that PR publishes to npm.
