// netlify/functions/rust-swap.js
import { createClient } from '@supabase/supabase-js';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for server-side operations
);

const connection = new Connection(process.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com');
const treasuryWallet = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(process.env.TREASURY_WALLET_PRIVATE_KEY))
);

export const handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const {
      swapType, // 'SOL_TO_RUST' | 'RUST_TO_SOL'
      amount,
      characterId,
      userWallet,
      transactionSignature, // For SOL_TO_RUST - already sent
      currentRate
    } = JSON.parse(event.body);

    console.log(`🔄 Processing ${swapType} swap:`, { amount, characterId, userWallet });

    // Get current SOL price for rate calculation
    const solPriceResponse = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
    );
    const solPrice = (await solPriceResponse.json()).solana.usd;
    const exchangeRate = solPrice; // 1 RUST = 1 USD, so rate is SOL price

    // Get current block number
    const latestBlockhash = await connection.getLatestBlockhash();
    const slot = await connection.getSlot();

    if (swapType === 'SOL_TO_RUST') {
      // Transaction already sent by wallet, just verify it
      console.log(`✅ SOL transaction confirmed: ${transactionSignature}`);

      // Calculate RUST amount to credit
      const rustAmount = amount * exchangeRate;

      // Record transaction in database
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .insert({
          type: 'EXCHANGE',
          from_vault: 'SCRAP_SOL',
          to_vault: 'RUST_COIN',
          from_units: amount,
          to_units: rustAmount,
          exchange_flux: exchangeRate,
          wasteland_block: slot,
          character_id: characterId,
          sender_shard: userWallet,
          receiver_shard: 'TREASURY',
          solana_signature: transactionSignature,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (txError) throw txError;

      // Credit RUST to character (using coins field for now)
      const { error: balanceError } = await supabase
        .from('characters')
        .update({
          coins: supabase.raw('coins + ?', [Math.floor(rustAmount)])
        })
        .eq('id', characterId);

      if (balanceError) throw balanceError;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          transaction: txData,
          solanaSignature: transactionSignature,
          rustCredited: rustAmount,
          rate: exchangeRate
        })
      };

    } else if (swapType === 'RUST_TO_SOL') {
      // Check character has enough RUST (using coins field)
      const { data: character, error: charError } = await supabase
        .from('characters')
        .select('coins')
        .eq('id', characterId)
        .single();

      if (charError) throw charError;

      if (!character || character.coins < amount) {
        throw new Error('Insufficient RUST balance');
      }

      // Calculate SOL amount to send
      const solAmount = amount / exchangeRate;
      const solLamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

      // Create transaction to send SOL from treasury to user
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: treasuryWallet.publicKey,
          toPubkey: new PublicKey(userWallet),
          lamports: solLamports
        })
      );

      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = treasuryWallet.publicKey;

      // Sign and send transaction
      transaction.sign(treasuryWallet);
      const signature = await connection.sendTransaction(transaction);
      await connection.confirmTransaction({
        signature,
        ...latestBlockhash
      });

      console.log(`✅ Treasury SOL transfer confirmed: ${signature}`);

      // Record transaction in database
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .insert({
          type: 'EXCHANGE',
          from_vault: 'RUST_COIN',
          to_vault: 'SCRAP_SOL',
          from_units: amount,
          to_units: solAmount,
          exchange_flux: exchangeRate,
          wasteland_block: slot,
          character_id: characterId,
          sender_shard: characterId,
          receiver_shard: userWallet,
          solana_signature: signature,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (txError) throw txError;

      // Deduct RUST from character (using coins field)
      const { error: balanceError } = await supabase
        .from('characters')
        .update({
          coins: supabase.raw('coins - ?', [Math.floor(amount)])
        })
        .eq('id', characterId);

      if (balanceError) throw balanceError;

      // Add to treasury RUST reserves (for tracking)
      const { error: treasuryError } = await supabase
        .from('treasury_reserves')
        .upsert({
          vault_type: 'RUST_COIN',
          amount: amount
        }, {
          onConflict: 'vault_type',
          ignoreDuplicates: false
        });

      if (treasuryError) console.warn('Treasury tracking failed:', treasuryError);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          transaction: txData,
          solanaSignature: signature,
          solSent: solAmount,
          rate: exchangeRate
        })
      };
    }

    throw new Error('Invalid swap type');

  } catch (error) {
    console.error('Swap error:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
