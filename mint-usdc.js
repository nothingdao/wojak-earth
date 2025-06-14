import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const DEVNET_RPC_URL = 'https://api.devnet.solana.com';
const connection = new Connection(DEVNET_RPC_URL, 'confirmed');

// Load your wallet keypair from environment variable
let senderKeypair;

try {
  if (!process.env.SERVER_KEYPAIR_SECRET) {
    throw new Error('SERVER_KEYPAIR_SECRET environment variable not found');
  }

  // Parse the secret key (should be array of numbers or base58 string)
  let secretKey;
  if (process.env.SERVER_KEYPAIR_SECRET.startsWith('[')) {
    // Array format: [123, 45, 67, ...]
    secretKey = JSON.parse(process.env.SERVER_KEYPAIR_SECRET);
  } else {
    // Base58 string format
    const bs58 = await import('bs58');
    secretKey = bs58.default.decode(process.env.SERVER_KEYPAIR_SECRET);
  }

  senderKeypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
  console.log(`✅ Loaded wallet: ${senderKeypair.publicKey.toString()}`);
} catch (error) {
  console.error('Error loading wallet keypair:', error.message);
  console.log('Please ensure SERVER_KEYPAIR_SECRET environment variable is set');
  process.exit(1);
}

async function createAndMintUSDC() {
  try {
    console.log('Creating your own USDC-like token for testing...');

    // Create a new mint (this will be your test USDC)
    const mint = await createMint(
      connection,
      senderKeypair,
      senderKeypair.publicKey, // mint authority
      null, // freeze authority
      6 // decimals (USDC has 6 decimals)
    );

    console.log(`✅ Created mint: ${mint.toString()}`);

    // Create token account for your wallet
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      senderKeypair,
      mint,
      senderKeypair.publicKey
    );

    console.log(`✅ Created token account: ${tokenAccount.address.toString()}`);

    // Mint 1000 tokens to your account
    const amount = 1000 * Math.pow(10, 6); // 1000 tokens with 6 decimals
    await mintTo(
      connection,
      senderKeypair,
      mint,
      tokenAccount.address,
      senderKeypair.publicKey,
      amount
    );

    console.log(`✅ Minted 1000 test USDC tokens to your wallet`);
    console.log(`\n🎉 Success! You now have test USDC tokens.`);
    console.log(`\nUpdate your airdrop.js file with this mint address:`);
    console.log(`const TOKEN_MINT = '${mint.toString()}';`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

createAndMintUSDC().catch(console.error);

