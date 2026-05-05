# Algebra Subgraph

This repository contains subgraphs for the Algebra Protocol, supporting multi-network deployments with a unified configuration system.

## Available Subgraphs

- **analytics** - Core Algebra protocol analytics (pools, swaps, liquidity, etc.)
- **farming** - Algebra farming protocol events and positions
- **blocks** - Block data indexing
- **limits** - Limit order protocol events

## Quick Start

### 1. Install Dependencies

```bash
yarn install
```

### 2. Configure Network

Create network configuration files in `config/<project-name-network>/`, e.g. 'clamm-base-sepolia':

**config/project-name-network/config.json:**
```json
{
  "network": "network",
  "startBlock": 12345678
}
```

**config/project-name-network/chain.ts:**

Update all analytics contract addresses 
```typescript
import { BigDecimal } from '@graphprotocol/graph-ts'

export const FACTORY_ADDRESS = '0x5E4F01767A1068C5570c29fDF9bf743b0Aa637d7'
export const NONFUNGIBLE_POSITION_MANAGER_ADDRESS = '0x9ea4459c8defbf561495d95414b9cf1e2242a3e2'
```

Update the list of tokens that will be used for pricing
```typescript
export const REFERENCE_TOKEN = '0x4200000000000000000000000000000000000006' // Wrapped ETH
export const STABLE_TOKEN_POOL = '0x47e8ca40666102ac217286e51660a4e6e6d7f9a3' // USDC/WETH pool

// Minimum reference token locked in pool for pricing calculations
export const MINIMUM_NATIVE_LOCKED = BigDecimal.fromString('0')

// Token lists for tracking volume and liquidity
export const WHITELIST_TOKENS: string[] = [
  '0x4200000000000000000000000000000000000006', // WETH
  '0xABAC6F23FDF1313FC2E9C9244F666157CCD32990' // USDC
]

// Stable coins for USD pricing (tokens with stable $1 value)
export const STABLE_COINS: string[] = [
  '0xABAC6F23FDF1313FC2E9C9244F666157CCD32990' // USDC
]
```

If you will use farming or limit orders also update
```typescript
// Addresses for farming subgraph
// Farming contracts
export const ETERNAL_FARMING_ADDRESS = '0x0000000000000000000000000000000000000000'  

// Addresses for limit order subgraph
// Limit order contract
export const LIMIT_ORDER_ADDRESS = '0x822ddb9EECc3794790B8316585FebA5b8F7C7507'
```

### 3. Prepare Network Configuration

```bash
# Prepare configuration
yarn prepare-network '<project-name-network>'
```

This will:
- Generate `subgraph.yaml` files for all subgraphs
- Copy network-specific chain configuration
- Normalize all addresses to lowercase

### 4. Build Subgraphs

Build subgraphs:
```bash
# Build specific subgraph
yarn build-subgraph analytics

# Or build all subgraphs
yarn build-all
```

### 5. Deploy Subgraphs

#### Deploy to The Graph Studio

First, create your subgraph at https://thegraph.com/studio/

Then authenticate with The Graph Studio:
```bash
# Authenticate with your deploy key
yarn graph auth <DEPLOY_KEY>
```

Then deploy your subgraph:
```bash
# Deploy subgraph (use the subgraph name from Studio)
yarn deploy-subgraph analytics studio your-subgraph-name --access-token YOUR_ACCESS_TOKEN

# Examples
yarn deploy-subgraph analytics studio algebra-analytics-polygon
yarn deploy-subgraph farming studio algebra-farming-polygon --access-token YOUR_TOKEN
```

#### Deploy to Custom Graph Node

```bash
# Deploy to custom endpoint
yarn deploy-subgraph analytics custom your-subgraph-name \
  --node http://your-graph-node:8020 \
  --ipfs http://your-ipfs:5001 \
  --access-token YOUR_TOKEN
```

#### Deploy to Goldsky

```bash
# Deploy to goldsky
goldsky subgraph deploy your-subgraph-name --path ./subgraphs/analytics

# Examples
goldsky subgraph deploy blocks/v1.0.0 --path ./subgraphs/blocks
```

## Network Configuration Tips

1. **Start Block**: Use the block number when the factory contract was deployed
2. **Reference Token**: Should be the most liquid token (usually native token)
3. **Stable Token Pool**: Use the highest liquidity stable/native token pool for USD pricing
4. **Whitelist Tokens**: Include major tokens for volume/liquidity tracking
5. **Stable Coins**: Include all stable coins for accurate USD pricing

## Cypher V4 Trimmed Indexing Profile

This repository has been trimmed for the Cypher V4 pool metadata use case. The active target is the `cypher-v4` network config and the analytics subgraph only. The older multi-subgraph setup and stale network configs were removed because the application does not query farming, limits, positions, swaps, liquidity, fee analytics, daily/hourly snapshots, USD pricing, or aggregate protocol metrics from this subgraph.

### Active config

Only `config/cypher-v4` is checked in:

```text
config/cypher-v4/config.json
config/cypher-v4/chain.ts
```

`config/cypher-v4/config.json` contains only the Graph network name and the factory deployment block:

```json
{
  "network": "mainnet",
  "startBlock": 23739977
}
```

`config/cypher-v4/chain.ts` contains only the factory address:

```ts
export const FACTORY_ADDRESS = '0xfb8ed3485efa29a0e4bed93351dd51b59fc4b0f0'
```

The `startBlock` is the factory creation block. Starting there lets Graph Node process pool creation events emitted after the factory exists without scanning unrelated earlier mainnet history.

### Active entities

The analytics schema intentionally contains only two entities:

```graphql
type Token @entity(immutable: false) {
  id: ID!
  symbol: String!
  name: String!
  decimals: BigInt!
}

type Pool @entity(immutable: false) {
  id: ID!
  createdAtBlockNumber: BigInt!
  token0: Token!
  token1: Token!
  deployer: Bytes!
  plugin: Bytes!
  pluginConfig: Int!
  fee: BigInt!
  communityFee: BigInt!
  tickSpacing: BigInt!
}
```

These fields cover the pool list and pool-by-id query shape used by the application. Removed entities include factory aggregates, bundle/pricing entities, swaps, mints, burns, collects, ticks, positions, position snapshots, transactions, pool day/hour data, token day/hour data, plugin fee analytics, and cache entities.

### Indexed events

The Factory datasource indexes pool creation only:

```yaml
- event: Pool(indexed address,indexed address,address)
  handler: handlePoolCreated
- event: CustomPool(indexed address,indexed address,indexed address,address)
  handler: handleCustomPoolCreated
```

Both events create a `Pool` entity and create or load the corresponding `Token` entities. `CustomPool` is indexed the same way as a normal pool, except its `deployer` field comes from the event. Normal pools use the zero address for `deployer`.

During pool creation the mapping binds the created pool contract and reads the initial pool metadata:

- `fee`
- `globalState().pluginConfig`
- `globalState().communityFee`
- `plugin`
- `tickSpacing`

Because the Factory handler performs these pool contract calls, the Factory datasource must include the `Pool` ABI in its manifest `abis` list.

The Pool template only tracks metadata updates needed to keep queried fields current:

```yaml
- event: Fee(uint16)
  handler: handleChangeFee
- event: CommunityFee(uint16)
  handler: handleSetCommunityFee
- event: TickSpacing(int24)
  handler: handleSetTickSpacing
- event: Plugin(address)
  handler: handlePlugin
- event: PluginConfig(uint8)
  handler: handlePluginConfig
```

### Removed active indexing surface

The Cypher V4 analytics manifest no longer includes:

- `NonfungiblePositionManager`
- farming datasources
- limits datasources
- blocks datasources
- swap, mint, burn, collect, initialize, fee cache, pricing, and interval update handlers
- token total supply indexing
- whitelist/stable/reference-token config

The stale config directories for non-Cypher networks were also removed because they referenced the old multi-subgraph configuration model and were not valid for this trimmed deployment.

### Build and deployment flow

Prepare Cypher V4:

```bash
yarn prepare-network cypher-v4
```

Build analytics:

```bash
yarn build-subgraph analytics
```

`scripts/prepare-network.ts` now defaults to `cypher-v4`, reads only `FACTORY_ADDRESS`, and generates only `subgraphs/analytics/subgraph.yaml`.

### Supported application queries

Pool by id:

```graphql
query ($id: ID!) {
  pool(id: $id) {
    id
    token0 { id symbol name decimals }
    token1 { id symbol name decimals }
    createdAtBlockNumber
    deployer
    plugin
    pluginConfig
    fee
    communityFee
    tickSpacing
  }
}
```

Paginated pools:

```graphql
query ($pageSize: Int!, $cursor: ID!) {
  pools(
    first: $pageSize
    orderBy: id
    orderDirection: asc
    where: { id_gt: $cursor }
  ) {
    id
    token0 { id symbol name decimals }
    token1 { id symbol name decimals }
    createdAtBlockNumber
    deployer
    plugin
    pluginConfig
    fee
    communityFee
    tickSpacing
  }
}
```

A minimal id-only query is also supported:

```graphql
query ($id: ID!) {
  pool(id: $id) {
    id
  }
}
```

### Verification performed

The trimmed Cypher V4 subgraph was verified with:

```bash
COREPACK_ENABLE_AUTO_PIN=0 corepack yarn prepare-network cypher-v4
COREPACK_ENABLE_AUTO_PIN=0 corepack yarn build-subgraph analytics
```

Linting is currently blocked before source checks by the repository ESLint config referencing `prettier/@typescript-eslint`, which was removed from `eslint-config-prettier` in v8.
