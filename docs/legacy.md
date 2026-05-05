# Legacy cleanup

Supabase and Netlify Functions are fully deprecated for the current architecture. Do not add new code or docs that depend on them.

Git history is the archive. Legacy files should be deleted rather than preserved unless they contain unique intent that has not yet been captured in current docs.

Exception: the NPC engine has been moved to `server/earth-npc-engine` because it is part of the future vision. It is not production-ready and still needs migration to Convex/Railway-oriented APIs.
