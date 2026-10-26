# ClassPulse — Agent Instructions
Read docs/ClassPulse_MVP.md and docs/CONTRACTS.md before changing anything.

## What this is
A Chrome extension (Manifest V3, plain JavaScript) sends heartbeats about Google Meet attendance to Supabase. A React dashboard shows live student status to the instructor.

## Rules
1. Stay inside the folder/files assigned to your task. Shared files change only through a PR approved by Kurt: supabase/migrations/001-004*, dashboard/src/lib/status.ts, dashboard/src/lib/board.ts, dashboard/src/features/registry.ts, extension/manifest.json, extension/lib/supabase.js.
2. Never use or write the service_role / secret key anywhere. Never commit .env or extension/config.js.
3. Students (anonymous) reach the database ONLY through the RPC functions join_session, send_heartbeat, respond_checkin, get_roster. Never add anonymous table policies.
4. New SQL goes in a NEW numbered file in supabase/migrations/ using your assigned number range. Never edit an applied migration.
5. Privacy: the extension collects ONLY meet_tab_open, meet_tab_focused, system_state. Never read page content, other tabs' URLs or titles, chat, camera, microphone, screen, or keystrokes.
6. Dashboard is TypeScript strict. No `any`. Keep components small.
7. Work in small increments. Before finishing a task run lint, build and tests, then explain what changed and how to test it.
8. If a task seems to require changing a shared file or a contract, stop and tell me instead of changing it.

## Release Versioning
9. Releases are triggered ONLY upon completion of a fully tested milestone—never on everyday commits. A milestone is complete when all its linked issues are closed, lint/build/tests pass, and Kurt approves.
10. The entire monorepo follows Semantic Versioning: `vMAJOR.MINOR.PATCH`. Bump MAJOR for breaking changes, MINOR for new features, PATCH for bug-fixes. Tag the monorepo root—do not version sub-packages independently.
11. Every release MUST be created with the GitHub CLI: `gh release create v<MAJOR.MINOR.PATCH> [assets…] --generate-notes`. Do not draft releases manually or skip `--generate-notes`.
12. If any file under `extension/` was modified since the last release, the release checklist MUST include: (a) rebuild the unpacked extension, (b) zip it as `classpulse-extension.zip`, and (c) attach the zip as a release asset. Never publish without verifying this.

See `docs/RELEASE.md` for the full release checklist and worked examples.
