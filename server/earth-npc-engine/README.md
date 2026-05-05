# Earth NPC Engine

Future Railway service for autonomous Earth NPCs and progression/load testing.

This service is part of the product vision, but it is **not currently launch-path**. It was moved out of `apps/earth` because the target runtime is server-side/continuous, not frontend app code.

## Current status

Pending migration. Expect legacy assumptions until refactored:

- old Netlify Function endpoint calls
- old Supabase-oriented utilities
- app-local paths/config

## Target model

- NPCs are wallet-backed actors.
- NPCs have minted Earth characters, just like human players.
- NPC actions use the same authoritative validation paths as human player actions.
- The engine can spawn/control many characters for simulation, progression testing, and launch-time world population.
