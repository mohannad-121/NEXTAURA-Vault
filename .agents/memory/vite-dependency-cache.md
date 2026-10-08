---
name: Vite catalog dependency cache
description: Runtime React mismatches caused by stale artifact prebundles after workspace catalog upgrades.
---

After changing React versions in the workspace catalog, a running artifact can
report different React and React DOM versions even when both installed package
versions match.

**Why:** The artifact's Vite dependency prebundle retained old React DOM while
newly added Clerk code resolved the upgraded React; restarting alone did not
invalidate that prebundle.

**How to apply:** Compare installed package versions with the artifact's Vite
dependency metadata before changing dependencies again. If the metadata points to
old packages, clear only that artifact's derived Vite cache and restart its
managed workflow. Do not alter auth or application code to suppress the error.
