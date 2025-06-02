# Technical Documentation

## Architecture

### Frontend

- React 18 with TypeScript
- Tailwind CSS for styling
- Shadcn/ui component library
- Real-time state management with optimistic updates

### Backend

- Netlify Functions (serverless)
- PostgreSQL database
- Prisma ORM with type safety
- 13 API endpoints covering all game operations

### Database Schema

```
Users, Characters, Locations, Items, Equipment
Inventories, Markets, Transactions, Chat
NFTMetadata, TokenBalances, Governance
```

## API Endpoints

### Core Game Operations

- `POST /character` - Character creation and updates
- `GET /locations` - World data and location details
- `POST /mine` - Resource extraction with energy costs
- `POST /trade` - Market transactions and item exchanges
- `GET /inventory` - Player inventory management
- `POST /equip` - Equipment system with visual updates

### Social Features

- `POST /chat` - Real-time messaging system
- `GET /players` - Active player tracking
- `POST /social` - Community interaction logging

### Crypto Infrastructure (Inactive)

- `POST /mint-nft` - Character NFT generation
- `POST /token-purchase` - USDC/SOL to game currency
- `GET /nft-metadata` - Dynamic NFT trait generation
- `POST /bridge` - Off-chain to on-chain conversion
- `POST /governance` - Community voting mechanisms

## Installation

```bash
git clone [repository-url]
cd wojak-earth
npm install
```

### Environment Setup

```bash
cp .env.example .env.local
# Configure database URL
# Add API keys (when crypto features activate)
```

### Database Setup

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

### Development

```bash
npm run dev           # Start development server
npm run build         # Production build
npm run setup:world   # Complete world initialization
```

## Game Systems

### Mining System

- Location-based resource spawning
- Energy costs and tool requirements
- Configurable spawn rates and resource scarcity
- Anti-exploitation measures

### Trading System

- Multi-tier markets with regional pricing
- Location-specific item availability
- Dynamic pricing based on supply/demand
- Transaction history and analytics

### Equipment System

- Visual equipment slots (head, body, accessory, tool)
- Auto-replacement logic for upgrades
- Category-based organization
- Real-time character rendering updates

### Social System

- Regional and local chat scopes
- Player presence tracking
- Activity status broadcasting
- Community interaction metrics

## NFT Infrastructure

### Dynamic Rendering

- Canvas-based layer composition
- Real-time image generation
- Multiple resolution outputs
- Asset caching and optimization

### Metadata Generation

```javascript
{
  "name": "Wojak #1337",
  "attributes": [
    {"trait_type": "Location", "value": "Crystal Caves"},
    {"trait_type": "Equipment", "value": "Miner's Helmet"},
    {"trait_type": "Status", "value": "Active Miner"}
  ],
  "image": "https://domain.com/nft/1337.png"
}
```

### Layer System

- Background (location-based)
- Base character model
- Equipment overlays
- Status effects and achievements
- Environmental modifiers

## Security

### Data Protection

- Input validation on all endpoints
- SQL injection prevention via Prisma
- Rate limiting on resource-intensive operations
- Secure session management

### Economic Safeguards (When Active)

- Transaction verification
- Balance validation
- Anti-manipulation measures
- Audit logging for all economic operations

## Performance

### Database Optimization

- Indexed queries for game operations
- Connection pooling
- Query optimization for real-time features
- Efficient data structures

### Frontend Performance

- Component memoization
- Lazy loading for non-critical features
- Optimistic UI updates
- Image optimization and caching

## Monitoring

### Game Metrics

- Player activity tracking
- Session duration analysis
- Feature usage statistics
- Community interaction patterns

### Technical Metrics

- API response times
- Database performance
- Error rates and debugging
- Resource utilization

## Deployment

### Production Stack

- Netlify hosting with edge functions
- PostgreSQL on managed service
- CDN for static assets
- SSL termination and security headers

### CI/CD Pipeline

- Automated testing
- Database migration validation
- Production deployment verification
- Rollback procedures

## Development Tools

### Game Master Interface

- Real-time world editing
- Economy balancing tools
- Player analytics dashboard
- Content management system

### Debug Features

- Console logging for game events
- State inspection tools
- Performance profiling
- Database query analysis
