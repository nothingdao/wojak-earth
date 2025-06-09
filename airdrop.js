import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from '@solana/web3.js';
import {
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import fs from 'fs';
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

// Wallet addresses to airdrop to
const RECIPIENT_WALLETS = [
  'F1yVm294Pm5vcH4rjEXUkJEkfKhgaYajprnvW2Aco3Au',
  'H3DCknMcx9QWfimDZRBs1mtVcDoc8WRTtgwVvVitYVRZ',
  '2FyTvP1XPqgk2e3dgJvMrhL8qSfNeGJpJhK8qQswSzUq',
  'FBUdvgsTxGkAnSJvcMrRPYHax4NuHKPTvXhGp1sCpWw9',
  'DX58cLaXZMhry3Ph9nxrCmTRVzPTbce8cDAixing7b3p',
  '2Mo9qEoRRfuFqyDthggA5CkNdd4gHWtFBYMPxxWB81iX',
  '8L2VLyk1p1fSQZQ15SKXhqP25wkM3RnVqZvJ9CUVx7pj',
  'DNTHqaf4hjpoh1Z1WXDseazg5pSTbsuMs5cBjpv29EY8',
  '8v91CRMgP87E8SmwGzhqen83CnnsyY9JwaxXfBwMLyGQ',
  '5eixNTVXbnvFskgVTWAFt4kzBAbram8BGXy8tMjbC7wv'
];

// Token mint address (leave empty for SOL airdrop)
const TOKEN_MINT = ''; // e.g., 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' for USDC devnet

// Amount to airdrop (in tokens or SOL)
const AIRDROP_AMOUNT = 0.75; // 0.1 SOL or 0.1 tokens

async function airdropSOL() {
  console.log('Starting SOL airdrop...');
  console.log(`Sender: ${senderKeypair.publicKey.toString()}`);

  // Check sender balance
  const balance = await connection.getBalance(senderKeypair.publicKey);
  console.log(`Sender balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  const totalRequired = RECIPIENT_WALLETS.length * AIRDROP_AMOUNT + 0.01; // +0.01 for fees
  if (balance / LAMPORTS_PER_SOL < totalRequired) {
    console.error(`Insufficient balance. Required: ${totalRequired} SOL, Available: ${balance / LAMPORTS_PER_SOL} SOL`);
    return;
  }

  for (let i = 0; i < RECIPIENT_WALLETS.length; i++) {
    const recipient = RECIPIENT_WALLETS[i];

    try {
      console.log(`\nAirdropping to ${recipient} (${i + 1}/${RECIPIENT_WALLETS.length})`);

      const recipientPublicKey = new PublicKey(recipient);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderKeypair.publicKey,
          toPubkey: recipientPublicKey,
          lamports: AIRDROP_AMOUNT * LAMPORTS_PER_SOL,
        })
      );

      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [senderKeypair],
        { commitment: 'confirmed' }
      );

      console.log(`✅ Success! Transaction: ${signature}`);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Failed to airdrop to ${recipient}:`, error.message);
    }
  }

  console.log('\nSOL airdrop completed!');
}

async function airdropTokens() {
  console.log('Starting token airdrop...');
  console.log(`Sender: ${senderKeypair.publicKey.toString()}`);
  console.log(`Token Mint: ${TOKEN_MINT}`);

  const mintPublicKey = new PublicKey(TOKEN_MINT);

  // Get sender's token account
  const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    senderKeypair,
    mintPublicKey,
    senderKeypair.publicKey
  );

  console.log(`Sender token account: ${senderTokenAccount.address.toString()}`);

  // Check sender token balance
  const tokenBalance = await connection.getTokenAccountBalance(senderTokenAccount.address);
  console.log(`Sender token balance: ${tokenBalance.value.uiAmount}`);

  const totalRequired = RECIPIENT_WALLETS.length * AIRDROP_AMOUNT;
  if (tokenBalance.value.uiAmount < totalRequired) {
    console.error(`Insufficient token balance. Required: ${totalRequired}, Available: ${tokenBalance.value.uiAmount}`);
    return;
  }

  for (let i = 0; i < RECIPIENT_WALLETS.length; i++) {
    const recipient = RECIPIENT_WALLETS[i];

    try {
      console.log(`\nAirdropping to ${recipient} (${i + 1}/${RECIPIENT_WALLETS.length})`);

      const recipientPublicKey = new PublicKey(recipient);

      // Get or create recipient's token account
      const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        senderKeypair,
        mintPublicKey,
        recipientPublicKey
      );

      console.log(`Recipient token account: ${recipientTokenAccount.address.toString()}`);

      const transaction = new Transaction().add(
        createTransferInstruction(
          senderTokenAccount.address,
          recipientTokenAccount.address,
          senderKeypair.publicKey,
          AIRDROP_AMOUNT * Math.pow(10, tokenBalance.value.decimals), // Convert to base units
          [],
          TOKEN_PROGRAM_ID
        )
      );

      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [senderKeypair],
        { commitment: 'confirmed' }
      );

      console.log(`✅ Success! Transaction: ${signature}`);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Failed to airdrop to ${recipient}:`, error.message);
    }
  }

  console.log('\nToken airdrop completed!');
}

async function main() {
  try {
    if (!TOKEN_MINT || TOKEN_MINT === '') {
      await airdropSOL();
    } else {
      await airdropTokens();
    }
  } catch (error) {
    console.error('Airdrop failed:', error);
  }
}

// Run the airdrop
main().catch(console.error);

