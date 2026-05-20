## Summary

<!--
One or two sentences on what changes and why. Link the bug / issue if any.
-->

## Test plan

<!-- Tick the boxes that apply. -->

- [ ] Touched `worker/**` → ran `cd worker && npx vitest run` (full suite, **not** `test/unit` only — CORS / rate-limit / routing live in `test/integration/`)
- [ ] Touched `frontend/**` → ran `cd frontend && npx vitest run`
- [ ] Touched `frontend/**` → ran `cd frontend && npx playwright test` (or rely on CI E2E if local browsers aren't set up)
- [ ] Manually verified the change in a real browser, or noted below why that wasn't applicable
- [ ] Typecheck clean: `npm run lint` in each touched package
- [ ] Pre-commit hook ran (`bash scripts/setup-hooks.sh` once per clone)

## Notes for the reviewer

<!--
Anything non-obvious: why the approach over alternatives, known limitations,
follow-ups, places that need a closer look.

Reminder: push to `main` auto-deploys via `.github/workflows/deploy-{pages,worker}.yml`.
A broken test on `main` is a broken deploy — there is no staging environment.
-->
