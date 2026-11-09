# Changesets

Describe user-facing library changes here so releases get a version bump and a changelog entry:

```bash
npx changeset          # pick patch / minor / major and write a summary
npx changeset version  # apply pending changesets: bump package.json, update CHANGELOG.md
npm publish            # prepare runs `bob build`
```

Demo-only changes (example app, Expo Go update) do not need a changeset.
