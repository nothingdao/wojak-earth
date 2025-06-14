# Wojak Earth NPC Engine

A TypeScript-based NPC engine for managing autonomous characters in the Wojak Earth game.

## Quick Start

Run the engine:

```bash
node --loader ts-node/esm npc-engine/npc-engine.ts
```

## Activity Modes

When starting the engine, you'll be prompted to select an activity mode:

1. Normal (mixed activities) - NPCs perform all activities randomly
2. Exchange only - NPCs focus on trading and exchanging items
3. Mining only - NPCs focus on mining activities
4. Travel only - NPCs focus on moving between locations
5. Trading only (BUY/SELL) - NPCs focus on buying and selling
6. Chat only - NPCs focus on social interactions
7. Equipment only (EQUIP) - NPCs focus on managing their equipment
8. Survival only (USE_ITEM) - NPCs focus on using items and survival

## Configuration

The engine's behavior can be customized by modifying the config object in `npc-engine.ts`:

```typescript
const config = createNPCEngineConfig({
  DEFAULT_NPC_COUNT: 8, // Number of NPCs to spawn
  BASE_ACTIVITY_INTERVAL: 45000, // Base time between activities (ms)
  ACTIVITY_VARIANCE: 0.4, // Randomness in timing (0-1)
  FUNDING_AMOUNT: 0.02, // SOL per NPC
  LOG_LEVEL: 'info', // Logging level
  ENABLE_LOGS: true, // Enable/disable logging
  RESPAWN_ENABLED: true, // Auto-respawn dead NPCs
})
```

### Testing Mode

For testing purposes, you can uncomment the testing configuration:

```typescript
// TESTING MODE (uncomment to enable):
// DEFAULT_NPC_COUNT: 50,           // 80 NPCs for max volume
// BASE_ACTIVITY_INTERVAL: 10000,   // 10 seconds (was 15000/45000)
// ACTIVITY_VARIANCE: 0.1,          // Minimal variance for consistent timing
// FUNDING_AMOUNT: 0.01,            // More SOL per NPC (was 0.002)
```

## NPC Behavior

Each NPC has the following attributes:

- Health: Current health points
- Energy: Current energy level
- Coins: Available currency
- Level: Current experience level
- Location: Current position in the game world
- Personality: Determines activity preferences

## Environment Variables

Required environment variables:

- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- `TREASURY_KEYPAIR_SECRET`: Server wallet keypair (JSON array)

## Graceful Shutdown

The engine supports graceful shutdown:

- Press Ctrl+C to stop the engine
- All NPC activities will be properly terminated
- Active timers will be cleared
- Connection will be closed

## Error Handling

The engine includes comprehensive error handling:

- Uncaught exceptions are logged and trigger graceful shutdown
- Unhandled promise rejections are caught and logged
- Environment validation on startup
- Connection error handling

## Logging

Log levels available:

- debug: Detailed debugging information
- info: General operational information
- warn: Warning messages
- error: Error messages

## Development

To modify the engine:

1. Edit `npc-engine.ts`
2. Update type definitions in `*.d.ts` files
3. Run with `node --loader ts-node/esm npc-engine/npc-engine.ts`

## Troubleshooting

Common issues:

1. Module not found: Ensure all dependencies are installed
2. TypeScript errors: Check type definitions in `*.d.ts` files
3. Connection errors: Verify environment variables
4. NPC not spawning: Check treasury wallet balance

## Performance Monitoring

The engine tracks:

- Total activities performed
- Error count
- Last report time
- Active NPC count

## Contributing

When adding new features:

1. Add appropriate TypeScript types
2. Update configuration options
3. Add error handling
4. Include logging
5. Test with different activity modes
