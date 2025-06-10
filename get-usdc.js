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
} from '@solana/spl-token';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const DEVNET_RPC_URL = 'https://api.devnet.solana.com';
const connection = new Connection(DEVNET_RPC_URL, 'confirmed');

// USDC mint address on devnet
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

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

async function getUSDC() {
  try {
    console.log('Getting USDC tokens for your wallet...');
    
    // Create or get the associated token account for USDC
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      senderKeypair,
      USDC_MINT,
      senderKeypair.publicKey
    );
    
    console.log(`✅ Token account created/found: ${tokenAccount.address.toString()}`);
    
    // Check current balance
    const balance = await connection.getTokenAccountBalance(tokenAccount.address);
    console.log(`Current USDC balance: ${balance.value.uiAmount || 0}`);
    
    console.log('\n🎉 Your wallet now has a USDC token account!');
    console.log('\nTo get test USDC tokens on devnet, you can:');
    console.log('1. Use the Solana faucet at: https://faucet.solana.com/');
    console.log('2. Or visit: https://spl-token-faucet.com/?token-name=USDC-Dev');
    console.log('3. Enter your wallet address: ' + senderKeypair.publicKey.toString());
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getUSDC().catch(console.error);

