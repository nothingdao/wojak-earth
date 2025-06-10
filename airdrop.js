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
  'FuuSf9DtXVA1etWYkBZFdEkxYKcHWYUMjNLsc287z3eh',
  // 'GE998KfsyrQVVmVjBA3ZZwcgEecseW63CwLeVSoYSxKE',
  // '33uJHYhxsg7LZ9ysowXf7ung86mp916AHxXrvBr5bK3m',
  // '6RGqUFiFhuXUyafTqccqGGBWvfJDX7LuQdZqw9vnPThR',
  // 'AwZqCaBijW6qBvarakeEkR7Jj2cc9WYvbhinRa4s8DLn',
  // '2Mo9qEoRRfuFqyDthggA5CkNdd4gHWtFBYMPxxWB81iX',
  // 'FrcvFtxCGSZjR7vvoQ5AN6MSAR8VCXcqd8gxtrCABqai',
  // 'DX58cLaXZMhry3Ph9nxrCmTRVzPTbce8cDAixing7b3p',
  // '9g45KVuyhwieFsz6YcWjsZrAxZXKCbYp97j4e7STq6si',
  // '89b2bYVd8fQpY8kWzBoYr5yd7b7HncWXKsXZoAmGyt4d',
  // '4xPPH3kNdFrevgGuwPwYNqyESsu6bmnypVmynr2mwJVU',
  // 'BTmyw3zghVMrqPaL8ha4dWkDKMCjTLwkTUX2EtyEWp5c',
  // '9MXK1B96oZKmCTAe2LypDGq7hZdQjqrh6Cea82KtkDkG',
  // '2SU1tf5qHoWyG3scQvdGKCuQ5HMT8skVzdjYYNuX7MHF',
  // 'ArH7ZYyX3ur4vLiancJYRPVqg1Y2aPPh4iECuvRceFWF',
  // '9ecAiNmUMXpaVpvAEwDcACYs4XLbtAtLUfh49g5cNhUU',
  // '6GxWEkZPSuVCV4FLKTFhYrFT9M4zERKgwWVpjTcNBrJj',
  // 'HWwcoDGzVMAMGmKr3JS4VGjMcWu673MGCnDdVuKcHYnv',
  // 'Ho4BsEyJqSQKAkJgkXVC4ZYLzCZmV4Mf7RP8HmvStsLn',
  // 'FWyFkqFepdLrkzwkKvzqFrnGEovmHWStcwV6ZBqaXtt6',
  // '8PLJUSx5K1BvTn5fobyDLZ9NdSKs3hFyt5xcBiKrWQvL',
  // 'FWDfWnyihaKapWfq8qwyaf1BWbf4GKtDjHADpBiin4iL',
  // 'HdjkvUznVhgwHKnqezcnyWEbjg7Q1S1TZBMFx6DQYVyN',
  // '26Eo3Cd7ZtkqGxAptr91Nc7M9m3gzgdkoXMfTJajGRy6',
  // 'DjrtRMJYV7pKivwhXpPbAoW9VZbbTFMgCcLpyARnLwJo',
  // '8qJkuTyQ7VbT1LD4pMNE2SSy7fxzcLxxEAgxGK9v9dsk',
  // 'Dp8R1jNexc1xDTW6LqmM6t4vy8wPgtYzMNEypL5MKFwh',
  // 'CxZHDKnC9dxoFr8HZZmwVnvH7Z9fLJbPsVLiqdvSmqBw',
  // '7hRjf71Q6qJPQD4Qfh7pdv5tRGaBtBN2vyHrSDUKEA8Q',
  // 'F1yVm294Pm5vcH4rjEXUkJEkfKhgaYajprnvW2Aco3Au',
  // '7uzWVd7BQiqRWfkkjC3yX3Mybb4sXoHGx8fi1Skzpjdc',
  // 'DPbsqS2vgJ49yza29TxupiyCzXbyXFc5cqCv8awo9gkc',
  // 'FM8Ee2jKbPx77uL7P6HqmSm45GB17mSR6H2xag4E2PMN',
  // '4UGY5K9f4fJX82T6Dss6JTHP6YdZcVxmrQTu1jSAPdmj',
  // 'CWuwkJf7neeaiw2nReGviPz9naHFMAg5zUGJbv8tmV3z',
  // 'EkfAmCwB1tVwxYikavxT6ywMXpbtFdejBWbRUdVt7rKq',
  // '2Q4mUgCVwRxsj3u9ZJt36aRVAZE2AAKBzHhxq2RghC3n',
  // '5knEweG4pMebfkhQXuaTnw3S8z7U63nXDuP2iUxAoFRY',
  // '8L2VLyk1p1fSQZQ15SKXhqP25wkM3RnVqZvJ9CUVx7pj',
  // 'FBUdvgsTxGkAnSJvcMrRPYHax4NuHKPTvXhGp1sCpWw9',
  // '27eroAnS8e7ppGMjtveUExNTSE9hMvgJbBHW22yontF7',
  // '9G4TJj8vd9z6ANNf4w132CuY2vBUysgaBnVaTVkseF7p',
  // '8apdGv5FaQrmS7wfU1SPKayWaAsnuvNYsFjX8MqWYpPa',
  // '9Lkq3aqWStwruzA6Y8T6MybjLyhizfVokqDPess9pCVv',
  // 'BERCauu3bpEqM3i4Lm8VrAZ2mURJZcnv3PJnyUchJfg7',
  // 'B7aRS6LBhD9v6AX8UDRxQP6vZycrGwC5F5rp9qwQRLmj',
  // '8T8jDyTzKwcwDC1TZQhNxX9RTFTk8MeSbiGeKcVv8Ajd',
  // 'ANDrob5MoixeDd1oXJw6bBiV8wevYao9sqVWUE2AUGTi',
  // '7nBh5DVPKCWeToachcM18zb3JZvk5VsNQec3hz4d9XtM',
  // '2FyTvP1XPqgk2e3dgJvMrhL8qSfNeGJpJhK8qQswSzUq',
  // '5eixNTVXbnvFskgVTWAFt4kzBAbram8BGXy8tMjbC7wv',
  // '4sJzrFftjwE1xgZbTw8SbDY4BDoH4z8bBR3Q3bK3VMHu',
  // 'B4yAsACX7C7YRXXaFJz6nJsjEVoSG16voUejZWgegVT9',
  // 'DNTHqaf4hjpoh1Z1WXDseazg5pSTbsuMs5cBjpv29EY8',
  // 'H3DCknMcx9QWfimDZRBs1mtVcDoc8WRTtgwVvVitYVRZ',
  // '7wXvPhrYurM9aoWDYJwA2rGJ3PTYj7XFT3hG7u6xz1dK',
  // 'G6TD7HvhmYe6NJq84wH37YFwdN7HnUfwXoz25vcVZVrq',
  // '6GHJYroAxBSTwmWqTKFfg8CoPnuJf1WgfmG6LX3eUJgK',
  // '8v91CRMgP87E8SmwGzhqen83CnnsyY9JwaxXfBwMLyGQ',
  // 'HohApTWaVrddnEpY4EHZZp86J1G9JotDNDypgoihCKcy',
  // 'Buxx6TdR2ZU35EAHTzmWTYdkPu39YH2YyphZSSJXMFiX',
  // 'Crn6ycMJJC3ZrA3h6pNgVHwBSXeyB3x9s113PiQqVgn5',
  // 'FNKSHWnFYgPESCSwMoQgHxXJc7LmLKmNVVhrSzRpLDuV',
  // '5y8UicL3YBketVfaud3NU9PwhxGrH7eY3JXekTbiEEjJ',
  // '6T2oTcbQpbesX3MsQtYrwwX7yMw5u4zLoQiv2ezpu6Wh',
  // 'J9S9nMfYko9JNEMyHd6X6eAaJqR2haDSevej7E6A7Sg9',
  // 'GE8Se7HjaUCMY41TsSs5vtvbu1Vz6WtZwLvhSkk4VmFn',
  // 'BA3wmYWG2r5pA5CVbTLSQ23SkDG8kRacRSHt9iPdzZBx',
  // 'CfNFQftZD3YKAg6w6W6qam32GGtKYmPn2Doo1PVxDv7N',
];

// Token mint address (leave empty for SOL airdrop)
const TOKEN_MINT = 'Dw59L2Rxcs6yHS3nQi1Uiobh1i4TDi3MtfLEGe1hanZm'; // Your test USDC token mint

// Amount to airdrop (in tokens or SOL)
const AIRDROP_AMOUNT = 0.55; // 0.1 SOL or 0.1 tokens

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
    if (!TOKEN_MINT | TOKEN_MINT === '') {
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

