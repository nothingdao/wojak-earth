# Agent Devnet Wallet

Agents may use the local devnet-only keypair for ASTRDS testing and smoke scripts.

- Address: `EG577dpsjxBQGDJNhDH4e8mCfCRtah6A6ZkahTH8ANvi`
- Local keypair path: `.keys/agent-devnet.json`
- Cluster: Solana devnet only
- Purpose: pay fees/rent for test transactions, smoke tests, and devnet-only operational checks

This wallet must never be used on mainnet and must never hold mainnet funds.

If the balance is low, agents may ask Josh to fund it with devnet SOL.

Example balance check:

```bash
solana balance EG577dpsjxBQGDJNhDH4e8mCfCRtah6A6ZkahTH8ANvi --url devnet
```

Example funding command:

```bash
solana transfer EG577dpsjxBQGDJNhDH4e8mCfCRtah6A6ZkahTH8ANvi 5 --url devnet
```

or, if faucet is available:

```bash
solana airdrop 5 EG577dpsjxBQGDJNhDH4e8mCfCRtah6A6ZkahTH8ANvi --url devnet
```
