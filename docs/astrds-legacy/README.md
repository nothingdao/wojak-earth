# ASTRDS Legacy Intake

This directory is a staging area for source-context ASTRDS material imported during the Earth monorepo consolidation.

It is intentionally kept separate from the canonical Earth docs in `docs/` because ASTRDS context has changed: ASTRDS is now part of the Earth monorepo, shares the Convex backend and `server/earth` runtime, and should be reviewed against the new authority/deployment model before being promoted into finished docs.

## Contents

- `docs/` — verbatim copy of the remaining `nothingdao/astrds` repository docs.
- `issues/` — local Markdown archive of GitHub issues from `nothingdao/astrds`, including metadata, body text, and comments.

## Suggested integration path

1. Keep this directory as the raw import/archive.
2. Triage open issues first; map each to either:
   - canonical Earth issue/work item,
   - ASTRDS-specific docs under a future `docs/astrds/` section,
   - obsolete/closed historical context.
3. Promote stable ASTRDS reference material into canonical docs only after rewriting for the Earth monorepo assumptions.
4. Do not edit imported files in place unless the goal is to preserve archive corrections; create rewritten docs elsewhere.
