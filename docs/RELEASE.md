# ClassPulse — Release Versioning Protocol

> **Canonical reference for every contributor and CI agent.**
> Rules 9–12 in `AGENTS.md` are the enforceable short-form; this document expands on rationale, checklists, and examples.

---

## 1. Release Cadence

Releases are **milestone-gated**, not commit-gated.

| Trigger | Allowed? |
|---|---|
| All issues in a GitHub Milestone are closed, CI is green, and Kurt has approved | ✅ Yes |
| A single feature branch was merged | ❌ No |
| A "looks good enough" everyday commit | ❌ No |
| A critical hotfix (security / data-loss) | ✅ Yes — use a PATCH bump |

A milestone is considered **complete** when:
1. Every linked issue / PR is **closed**.
2. `lint`, `build`, and `test` pass on the `main` branch.
3. Kurt has given explicit sign-off.

---

## 2. Semantic Versioning

The monorepo uses a **single version tag** at the repository root.

```
vMAJOR.MINOR.PATCH
```

| Segment | When to bump | Example |
|---|---|---|
| **MAJOR** | Breaking changes to contracts, DB schema, or extension ↔ dashboard protocol | `v1.0.0` → `v2.0.0` |
| **MINOR** | New features that are backward-compatible (new page, new RPC, new extension capability) | `v1.0.0` → `v1.1.0` |
| **PATCH** | Bug-fixes, copy changes, dependency bumps, docs-only updates | `v1.1.0` → `v1.1.1` |

**Do not** version sub-packages (`dashboard/`, `extension/`, `supabase/`) independently. One tag governs the whole repo.

---

## 3. GitHub CLI Release Command

Every release **must** be created via the GitHub CLI to ensure a consistent, auto-generated changelog:

```bash
gh release create v<MAJOR.MINOR.PATCH> [assets…] --generate-notes
```

### Flags reference

| Flag | Purpose |
|---|---|
| `--generate-notes` | **Mandatory.** Auto-generates the changelog from merged PRs since the last tag. |
| `--title "v1.2.0 — <Milestone Name>"` | Optional but recommended for readability. |
| `--draft` | Use only if Kurt wants to review the release page before publishing. |
| `--prerelease` | Use for beta / RC milestones (e.g., `v2.0.0-rc.1`). |

> **Never** create a release by manually editing the GitHub Releases UI or by pushing a tag without running the CLI command.

---

## 4. Extension Build Verification

Whenever **any file under `extension/`** has been modified since the previous release tag, the following steps are **mandatory** before publishing:

### Checklist

- [ ] **Rebuild** the unpacked extension (`extension/` directory is production-ready).
- [ ] **Zip** the build output:
  ```bash
  # From the repo root
  zip -r classpulse-extension.zip extension/ -x "extension/config.js" "extension/.env"
  ```
  > Exclude secrets (`config.js`, `.env`) — per Rule 2 in `AGENTS.md`.
- [ ] **Attach** the zip as a release asset:
  ```bash
  gh release create v1.2.0 classpulse-extension.zip --generate-notes
  ```
- [ ] **Verify** the asset appears on the GitHub release page and is downloadable.

If no files under `extension/` changed, the zip attachment may be omitted, but the release notes should state *"Extension unchanged from vX.Y.Z."*

---

## 5. Worked Example

```bash
# 1. Confirm milestone is complete
gh issue list --milestone "Sprint 4" --state open   # should return nothing

# 2. Run CI checks locally
cd dashboard && npm run lint && npm run build && npm test && cd ..

# 3. Rebuild & zip the extension (if extension/ changed)
zip -r classpulse-extension.zip extension/ -x "extension/config.js" "extension/.env"

# 4. Create the release
gh release create v1.2.0 classpulse-extension.zip \
  --title "v1.2.0 — Sprint 4: Live Board Redesign" \
  --generate-notes

# 5. Verify
gh release view v1.2.0
```

---

## Quick-Reference Decision Tree

```
New release?
│
├─ Are ALL milestone issues closed?
│  ├─ No  → Stop. Do not release.
│  └─ Yes → Continue.
│
├─ Did CI (lint + build + tests) pass on main?
│  ├─ No  → Fix first. Do not release.
│  └─ Yes → Continue.
│
├─ Did Kurt approve?
│  ├─ No  → Wait for sign-off.
│  └─ Yes → Continue.
│
├─ Were any extension/ files modified?
│  ├─ Yes → Rebuild, zip, attach classpulse-extension.zip.
│  └─ No  → Note "Extension unchanged" in release body.
│
└─ Run: gh release create vX.Y.Z [assets] --generate-notes ✅
```
