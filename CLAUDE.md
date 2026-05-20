# Project conventions

## Tests before push

Push to `main` auto-deploys via GitHub Actions:

- `.github/workflows/deploy-worker.yml` publishes the Worker to Cloudflare.
- `.github/workflows/deploy-pages.yml` builds and publishes the frontend to
  GitHub Pages.

A broken test on `main` is a broken deploy. There is no staging environment.

**Before pushing changes that touch `worker/**`, run the full worker suite:**

```bash
cd worker && npx vitest run
```

Not `npx vitest run test/unit`. The integration tests under
`worker/test/integration/` exercise CORS, rate limiting, and the routing
chain end-to-end. They catch regressions the unit run misses (e.g. an
overbroad `*.github.io` CORS wildcard, a rate-limit IP bucket that
collapses in `vitest-pool-workers` because `request.cf` is null). Those
tests do otherwise run in `deploy-worker.yml`, but that's after the push
— too late for a clean fix.

**Same rule for the frontend:**

```bash
cd frontend && npx vitest run
```

before pushing `frontend/**` changes.

Worktree-isolated agents typically skip running tests (no `node_modules`
in the worktree). That's fine — the validation chokepoint is the merge
step in the main worktree, before the push.
