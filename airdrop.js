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
  '2Mo9qEoRRfuFqyDthggA5CkNdd4gHWtFBYMPxxWB81iX',
  'F1yVm294Pm5vcH4rjEXUkJEkfKhgaYajprnvW2Aco3Au',
  'DNTHqaf4hjpoh1Z1WXDseazg5pSTbsuMs5cBjpv29EY8',
  '5eixNTVXbnvFskgVTWAFt4kzBAbram8BGXy8tMjbC7wv',
  '2SU1tf5qHoWyG3scQvdGKCuQ5HMT8skVzdjYYNuX7MHF',
  'DX58cLaXZMhry3Ph9nxrCmTRVzPTbce8cDAixing7b3p',
  '8L2VLyk1p1fSQZQ15SKXhqP25wkM3RnVqZvJ9CUVx7pj',
  'H3DCknMcx9QWfimDZRBs1mtVcDoc8WRTtgwVvVitYVRZ',
  '2FyTvP1XPqgk2e3dgJvMrhL8qSfNeGJpJhK8qQswSzUq',
  '8v91CRMgP87E8SmwGzhqen83CnnsyY9JwaxXfBwMLyGQ',
  'FBUdvgsTxGkAnSJvcMrRPYHax4NuHKPTvXhGp1sCpWw9',
  'Ho4BsEyJqSQKAkJgkXVC4ZYLzCZmV4Mf7RP8HmvStsLn',
  'CWuwkJf7neeaiw2nReGviPz9naHFMAg5zUGJbv8tmV3z',
  '7nBh5DVPKCWeToachcM18zb3JZvk5VsNQec3hz4d9XtM',
  '9Lkq3aqWStwruzA6Y8T6MybjLyhizfVokqDPess9pCVv',
  '33uJHYhxsg7LZ9ysowXf7ung86mp916AHxXrvBr5bK3m',
  '8T8jDyTzKwcwDC1TZQhNxX9RTFTk8MeSbiGeKcVv8Ajd',
  '89b2bYVd8fQpY8kWzBoYr5yd7b7HncWXKsXZoAmGyt4d',
  'HdjkvUznVhgwHKnqezcnyWEbjg7Q1S1TZBMFx6DQYVyN',
  'DPbsqS2vgJ49yza29TxupiyCzXbyXFc5cqCv8awo9gkc',
  'EkfAmCwB1tVwxYikavxT6ywMXpbtFdejBWbRUdVt7rKq',
  '7uzWVd7BQiqRWfkkjC3yX3Mybb4sXoHGx8fi1Skzpjdc',
  '6RGqUFiFhuXUyafTqccqGGBWvfJDX7LuQdZqw9vnPThR',
  'FWDfWnyihaKapWfq8qwyaf1BWbf4GKtDjHADpBiin4iL',
  'FM8Ee2jKbPx77uL7P6HqmSm45GB17mSR6H2xag4E2PMN',
  'B7aRS6LBhD9v6AX8UDRxQP6vZycrGwC5F5rp9qwQRLmj',
  '9MXK1B96oZKmCTAe2LypDGq7hZdQjqrh6Cea82KtkDkG',
  'GE998KfsyrQVVmVjBA3ZZwcgEecseW63CwLeVSoYSxKE',
  'G6TD7HvhmYe6NJq84wH37YFwdN7HnUfwXoz25vcVZVrq',
  '8v3UJEpsWhfGN3Ku2KPUipYTmo7PmpMXvVCgwyF6bHpD',
  '2Q4mUgCVwRxsj3u9ZJt36aRVAZE2AAKBzHhxq2RghC3n',
  'B4yAsACX7C7YRXXaFJz6nJsjEVoSG16voUejZWgegVT9',
  '4xPPH3kNdFrevgGuwPwYNqyESsu6bmnypVmynr2mwJVU',
  'FNKSHWnFYgPESCSwMoQgHxXJc7LmLKmNVVhrSzRpLDuV',
  '26Eo3Cd7ZtkqGxAptr91Nc7M9m3gzgdkoXMfTJajGRy6',
  'J9S9nMfYko9JNEMyHd6X6eAaJqR2haDSevej7E6A7Sg9',
  'CxZHDKnC9dxoFr8HZZmwVnvH7Z9fLJbPsVLiqdvSmqBw',
  'ArH7ZYyX3ur4vLiancJYRPVqg1Y2aPPh4iECuvRceFWF',
  '8qJkuTyQ7VbT1LD4pMNE2SSy7fxzcLxxEAgxGK9v9dsk',
  'AwZqCaBijW6qBvarakeEkR7Jj2cc9WYvbhinRa4s8DLn',
  '7wXvPhrYurM9aoWDYJwA2rGJ3PTYj7XFT3hG7u6xz1dK',
  '6GHJYroAxBSTwmWqTKFfg8CoPnuJf1WgfmG6LX3eUJgK',
  '9G4TJj8vd9z6ANNf4w132CuY2vBUysgaBnVaTVkseF7p',
  'Buxx6TdR2ZU35EAHTzmWTYdkPu39YH2YyphZSSJXMFiX',
  'Crn6ycMJJC3ZrA3h6pNgVHwBSXeyB3x9s113PiQqVgn5',
  'HohApTWaVrddnEpY4EHZZp86J1G9JotDNDypgoihCKcy',
  'BERCauu3bpEqM3i4Lm8VrAZ2mURJZcnv3PJnyUchJfg7',
  '8apdGv5FaQrmS7wfU1SPKayWaAsnuvNYsFjX8MqWYpPa',
  '6GxWEkZPSuVCV4FLKTFhYrFT9M4zERKgwWVpjTcNBrJj',
  '6T2oTcbQpbesX3MsQtYrwwX7yMw5u4zLoQiv2ezpu6Wh',
  'HWwcoDGzVMAMGmKr3JS4VGjMcWu673MGCnDdVuKcHYnv',
  '5y8UicL3YBketVfaud3NU9PwhxGrH7eY3JXekTbiEEjJ',
  '27eroAnS8e7ppGMjtveUExNTSE9hMvgJbBHW22yontF7',
  'ANDrob5MoixeDd1oXJw6bBiV8wevYao9sqVWUE2AUGTi',
  '4sJzrFftjwE1xgZbTw8SbDY4BDoH4z8bBR3Q3bK3VMHu',
  '9ecAiNmUMXpaVpvAEwDcACYs4XLbtAtLUfh49g5cNhUU',
  'GE8Se7HjaUCMY41TsSs5vtvbu1Vz6WtZwLvhSkk4VmFn',
  'FWyFkqFepdLrkzwkKvzqFrnGEovmHWStcwV6ZBqaXtt6',
  'Dp8R1jNexc1xDTW6LqmM6t4vy8wPgtYzMNEypL5MKFwh',
  '7iHVZNyt7oymVAqqc5u78NczCsd4yevjG5fpC2khhQJf',
  '7hRjf71Q6qJPQD4Qfh7pdv5tRGaBtBN2vyHrSDUKEA8Q',
  'CfNFQftZD3YKAg6w6W6qam32GGtKYmPn2Doo1PVxDv7N',
  'DjrtRMJYV7pKivwhXpPbAoW9VZbbTFMgCcLpyARnLwJo',
  'BA3wmYWG2r5pA5CVbTLSQ23SkDG8kRacRSHt9iPdzZBx',
  '8PLJUSx5K1BvTn5fobyDLZ9NdSKs3hFyt5xcBiKrWQvL',
  '5knEweG4pMebfkhQXuaTnw3S8z7U63nXDuP2iUxAoFRY',
  '4UGY5K9f4fJX82T6Dss6JTHP6YdZcVxmrQTu1jSAPdmj',
  'FrcvFtxCGSZjR7vvoQ5AN6MSAR8VCXcqd8gxtrCABqai',
  '9g45KVuyhwieFsz6YcWjsZrAxZXKCbYp97j4e7STq6si',
  'BTmyw3zghVMrqPaL8ha4dWkDKMCjTLwkTUX2EtyEWp5c',
  '3A8A9w55UhfQUHxKDrJmD6DtrBFZRZd8QHhsit6dNCEk',
  'A7XrjadMApWtuRaKcTuQtCaUmXQuM8hpash4pAEVWo8i',
  'GABkThwkBh5WedHGjNb5XMc4Wws9GaiMuUbuvmKEhERA',
  'AWKgjUkA1sVC6tWnr9hAi1hPj6iWgSeSaNMPr366AT3B',
  'BYzY1Q8C8j1hp8HpTGXTm9UcUdZ7n465QBFq54Xa7HCJ',
  'H6PXXBYbKbb5T6hojZtuXVkhbw3eSKMbxtH6W9LEPV9D',
  '32mQLZY8joFBgACSZehtwRCVFY2RUgSg2BwL8PkNKC6Z',
  'F165znGwQrDgTAgktRCgesK9QJthuAgnf2b15RuiqZVX',
  'EhYrS7oAKjGrwaNAC63e466hKd7F4trnF4oFRoL89ffz',
  '9ym4otq5aNsNWB2c6qgDxLMPNsxrav2SrxieBNAdHCVB'
];

// Token mint address (leave empty for SOL airdrop)
const TOKEN_MINT = 'Dw59L2Rxcs6yHS3nQi1Uiobh1i4TDi3MtfLEGe1hanZm'; // Your test USDC token mint

// Amount to airdrop (in tokens or SOL)
const AIRDROP_AMOUNT = 0.1; // 0.1 SOL or 0.1 tokens

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

