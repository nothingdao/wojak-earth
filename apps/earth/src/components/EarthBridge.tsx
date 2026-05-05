/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/EarthBridge.tsx - Fixed and accurate
import React, { useState, useEffect } from 'react';
import { ArrowUpDown, X, Zap, AlertTriangle, Database, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import {
  createTransferInstruction, // for swaps later
  getAssociatedTokenAddress,
  getAccount,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { useGame } from '@/providers/GameProvider';
import { SERVER_URL } from '@/config/functionsBase';

interface EarthBridgeProps {
  isOpen: boolean;
  onClose: () => void;
  onCharacterUpdate?: () => Promise<void>;
}

interface BridgeStatus {
  treasuryEarthBalance: number;
  inGameCirculation: number;
  bridgeRatio: number;
  maxWithdrawal: number;
  backing: string;
  healthStatus: string;
  recentActivity: any[];
}

const EarthBridge: React.FC<EarthBridgeProps> = ({ isOpen, onClose, onCharacterUpdate }) => {
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
  const [isProcessing, setIsProcessing] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus | null>(null);
  const [userEarthBalance, setUserEarthBalance] = useState(0);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [lastError, setLastError] = useState<string>('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const wallet = useWallet();
  const { publicKey, sendTransaction } = wallet;
  const { state } = useGame();
  const character = state.character;

  // Environment variables
  const EARTH_MINT_ADDRESS = import.meta.env.VITE_EARTH_MINT_ADDRESS;
  const TREASURY_WALLET_ADDRESS = import.meta.env.VITE_TREASURY_WALLET_ADDRESS;
  const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    setDebugLogs(prev => [...prev.slice(-9), logEntry]); // Keep last 10 logs
  };

  const getMaxAmount = () => {
    if (direction === 'DEPOSIT') {
      return userEarthBalance;
    } else {
      return character?.earth || 0;
    }
  };

  const setMaxAmount = () => {
    setAmount(getMaxAmount().toString());
  };

  const getAvailableBalance = () => {
    return direction === 'DEPOSIT' ? userEarthBalance : (character?.earth || 0);
  };

  const executeWithdraw = async (bridgeAmount: number) => {
    if (!character) {
      throw new Error('Character not found');
    }

    addDebugLog(`Starting withdrawal of ${bridgeAmount} EARTH`);
    addDebugLog(`Character: ${character.name} (${character.id})`);
    addDebugLog(`Current in-game balance: ${character.earth} EARTH`);

    if (character.earth < bridgeAmount) {
      throw new Error(`Insufficient in-game EARTH. Have: ${character.earth}, Need: ${bridgeAmount}`);
    }

    addDebugLog('Calling bridge API for withdrawal...');

    try {
      const response = await fetch(`${SERVER_URL}/earth/bridge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'WITHDRAW',
          amount: bridgeAmount,
          characterId: character.id,
          userWallet: publicKey?.toString()
        })
      });

      addDebugLog(`Withdrawal API response status: ${response.status}`);
      addDebugLog(`Withdrawal API response ok: ${response.ok}`);

      if (!response.ok) {
        const errorText = await response.text();
        addDebugLog(`Withdrawal API error response: ${errorText}`);
        throw new Error(`Withdrawal API failed with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      addDebugLog(`Withdrawal API success response: ${JSON.stringify(result)}`);

      if (!result.success) {
        addDebugLog(`Withdrawal API returned success=false: ${result.error}`);
        throw new Error(result.error || 'Withdrawal API call failed');
      }

      addDebugLog('✅ Withdrawal API call successful');
      return result;

    } catch (apiError) {
      addDebugLog(`❌ Withdrawal API failed: ${apiError.message}`);
      throw new Error(`Withdrawal failed: ${apiError.message}`);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBridgeStatus();
      fetchUserEarthBalance();
    }
  }, [isOpen]);

  const fetchBridgeStatus = async () => {
    setIsLoadingStatus(true);
    try {
      addDebugLog('Fetching bridge status...');
      const response = await fetch(`${SERVER_URL}/earth/bridge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'STATUS' })
      });

      const data = await response.json();
      if (data.success) {
        setBridgeStatus(data.bridgeStatus);
        addDebugLog(`Bridge status: ${data.bridgeStatus.healthStatus}`);

        addDebugLog('=== TREASURY ANALYSIS ===');
        addDebugLog(`Treasury EARTH balance: ${data.bridgeStatus.treasuryEarthBalance}`);
        addDebugLog(`Total in-game EARTH: ${data.bridgeStatus.inGameCirculation}`);
        addDebugLog(`Bridge ratio: ${(data.bridgeStatus.bridgeRatio * 100).toFixed(2)}%`);
        addDebugLog(`Max withdrawal: ${data.bridgeStatus.maxWithdrawal}`);

        if (data.bridgeStatus.recentActivity && data.bridgeStatus.recentActivity.length > 0) {
          addDebugLog('=== RECENT BRIDGE ACTIVITY ===');
          data.bridgeStatus.recentActivity.forEach((activity, idx) => {
            addDebugLog(`${idx + 1}. ${activity.type} - ${activity.from_units || activity.quantity} EARTH at ${activity.created_at}`);
          });
        }

        const expectedTreasuryBalance = data.bridgeStatus.inGameCirculation;
        const actualTreasuryBalance = data.bridgeStatus.treasuryEarthBalance;
        const difference = actualTreasuryBalance - expectedTreasuryBalance;

        if (Math.abs(difference) > 0.01) {
          addDebugLog('🚨 TREASURY MISMATCH DETECTED!');
          addDebugLog(`Expected treasury: ${expectedTreasuryBalance} EARTH`);
          addDebugLog(`Actual treasury: ${actualTreasuryBalance} EARTH`);
          addDebugLog(`Difference: ${difference} EARTH`);

          if (difference > 0) {
            addDebugLog('Treasury has MORE than expected (excess EARTH)');
          } else {
            addDebugLog('Treasury has LESS than expected (MISSING EARTH!)');
          }
        } else {
          addDebugLog('✅ Treasury balance matches in-game circulation');
        }

      } else {
        addDebugLog(`Bridge status error: ${data.error}`);
        console.error('Failed to fetch bridge status:', data.error);
      }
    } catch (error) {
      addDebugLog(`Bridge status fetch failed: ${error.message}`);
      console.error('Failed to fetch bridge status:', error);
    }
    setIsLoadingStatus(false);
  };

  const fetchUserEarthBalance = async () => {
    try {
      if (!publicKey || !EARTH_MINT_ADDRESS) {
        addDebugLog('Missing publicKey or EARTH_MINT_ADDRESS for balance fetch');
        return;
      }

      addDebugLog('Fetching user EARTH balance...');
      const connection = new Connection(SOLANA_RPC_URL);
      const earthMint = new PublicKey(EARTH_MINT_ADDRESS);
      const userTokenAccount = await getAssociatedTokenAddress(earthMint, publicKey);

      addDebugLog(`User token account: ${userTokenAccount.toString()}`);
      addDebugLog(`EARTH mint: ${EARTH_MINT_ADDRESS}`);
      addDebugLog(`User wallet: ${publicKey.toString()}`);

      try {
        const balance = await connection.getTokenAccountBalance(userTokenAccount);
        addDebugLog(`Raw balance response: ${JSON.stringify(balance)}`);

        const earthBalance = parseFloat(balance.value.uiAmount || '0');
        setUserEarthBalance(earthBalance);
        addDebugLog(`Final user EARTH balance: ${earthBalance}`);

      } catch (error) {
        addDebugLog(`Balance fetch error: ${error.message}`);
        if (error.message.includes('could not find account')) {
          addDebugLog('User has no EARTH token account yet');
          setUserEarthBalance(0);
        } else {
          addDebugLog(`Unexpected error: ${error.message}`);
          setUserEarthBalance(0);
        }
      }
    } catch (error) {
      addDebugLog(`Balance fetch outer error: ${error.message}`);
      console.error('Failed to fetch user EARTH balance:', error);
      setUserEarthBalance(0);
    }
  };

  const executeDeposit = async (bridgeAmount: number) => {
    if (!publicKey || !character || !EARTH_MINT_ADDRESS || !TREASURY_WALLET_ADDRESS) {
      throw new Error('Missing required data for deposit');
    }

    addDebugLog(`Starting deposit of ${bridgeAmount} EARTH`);

    const connection = new Connection(SOLANA_RPC_URL);
    const earthMint = new PublicKey(EARTH_MINT_ADDRESS);
    const treasuryWallet = new PublicKey(TREASURY_WALLET_ADDRESS);

    // First, get the mint info to check decimals
    addDebugLog('Fetching mint info for decimals...');
    const mintInfo = await connection.getParsedAccountInfo(earthMint);
    let decimals = 9; // Default assumption

    if (mintInfo.value && mintInfo.value.data && 'parsed' in mintInfo.value.data) {
      decimals = mintInfo.value.data.parsed.info.decimals;
      addDebugLog(`EARTH token decimals: ${decimals}`);
    } else {
      addDebugLog('Could not fetch mint info, assuming 9 decimals');
    }

    // Get token accounts
    const userTokenAccount = await getAssociatedTokenAddress(earthMint, publicKey);
    const treasuryTokenAccount = await getAssociatedTokenAddress(earthMint, treasuryWallet);

    addDebugLog(`User token account: ${userTokenAccount.toString()}`);
    addDebugLog(`Treasury token account: ${treasuryTokenAccount.toString()}`);

    // Check if user has token account and sufficient balance
    let userAccount;
    try {
      userAccount = await getAccount(connection, userTokenAccount);
      const userBalance = Number(userAccount.amount) / Math.pow(10, 9); // Assuming 9 decimals

      addDebugLog(`User balance check: ${userBalance} EARTH`);

      if (userBalance < bridgeAmount) {
        throw new Error(`Insufficient EARTH balance. Have: ${userBalance}, Need: ${bridgeAmount}`);
      }
    } catch (error) {
      if (error.message.includes('could not find account')) {
        throw new Error('No EARTH token account found. You need EARTH tokens first.');
      }
      throw error;
    }

    // Check if treasury token account exists, create if needed
    let treasuryAccount;
    let needsCreateTreasuryAccount = false;

    try {
      treasuryAccount = await getAccount(connection, treasuryTokenAccount);
      addDebugLog('Treasury token account exists');
    } catch (error) {
      if (error.message.includes('could not find account')) {
        addDebugLog('Treasury token account does not exist - will create it');
        needsCreateTreasuryAccount = true;
      } else {
        throw error;
      }
    }

    // Build transaction
    const transaction = new Transaction();

    // Add create treasury account instruction if needed
    if (needsCreateTreasuryAccount) {
      addDebugLog('Adding create treasury token account instruction');
      const createAccountInstruction = createAssociatedTokenAccountInstruction(
        publicKey,        // payer
        treasuryTokenAccount, // associated token account
        treasuryWallet,   // owner
        earthMint         // mint
      );
      transaction.add(createAccountInstruction);
    }

    // Convert to the smallest unit using actual decimals
    const amountInBaseUnits = BigInt(Math.floor(bridgeAmount * Math.pow(10, decimals)));
    addDebugLog(`Transfer amount: ${bridgeAmount} EARTH = ${amountInBaseUnits.toString()} base units (decimals: ${decimals})`);

    // Create amount as Uint8Array buffer (8 bytes for u64)
    const amountBuffer = new ArrayBuffer(8);
    const amountView = new DataView(amountBuffer);

    // Write the BigInt as little-endian u64
    const amountNumber = Number(amountInBaseUnits);
    if (amountNumber > Number.MAX_SAFE_INTEGER) {
      throw new Error(`Amount too large: ${amountNumber}`);
    }

    // Write as little-endian 64-bit unsigned integer
    amountView.setUint32(0, amountNumber & 0xFFFFFFFF, true); // Low 32 bits
    amountView.setUint32(4, Math.floor(amountNumber / 0x100000000), true); // High 32 bits

    const amountUint8Array = new Uint8Array(amountBuffer);
    addDebugLog(`Amount as Uint8Array: [${Array.from(amountUint8Array).join(', ')}]`);

    // Create instruction data using Uint8Array
    const instructionDiscriminator = new Uint8Array([3]); // Transfer instruction
    const instructionData = new Uint8Array(instructionDiscriminator.length + amountUint8Array.length);
    instructionData.set(instructionDiscriminator, 0);
    instructionData.set(amountUint8Array, instructionDiscriminator.length);

    addDebugLog(`Instruction data: [${Array.from(instructionData).join(', ')}]`);

    // Create transfer instruction manually with proper data layout
    const transferInstruction = new TransactionInstruction({
      keys: [
        { pubkey: userTokenAccount, isSigner: false, isWritable: true },      // source
        { pubkey: treasuryTokenAccount, isSigner: false, isWritable: true },  // destination
        { pubkey: publicKey, isSigner: true, isWritable: false },             // owner
      ],
      programId: TOKEN_PROGRAM_ID,
      data: instructionData,
    });

    addDebugLog('✅ Created manual transfer instruction with Uint8Array amount');
    transaction.add(transferInstruction);

    addDebugLog('Sending transaction for user signature...');

    // Send transaction (this will prompt user for signature)
    const signature = await sendTransaction(transaction, connection);

    addDebugLog(`Transaction sent: ${signature}`);
    addDebugLog('Waiting for confirmation...');

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    addDebugLog('✅ Transaction confirmed on-chain');

    // Call bridge API to update character balance
    addDebugLog('Calling bridge API to update character...');

    try {
      const response = await fetch(`${SERVER_URL}/earth/bridge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DEPOSIT',
          amount: bridgeAmount,
          characterId: character.id,
          userWallet: publicKey.toString(),
          txSignature: signature
        })
      });

      addDebugLog(`Bridge API response status: ${response.status}`);
      addDebugLog(`Bridge API response ok: ${response.ok}`);

      if (!response.ok) {
        const errorText = await response.text();
        addDebugLog(`Bridge API error response: ${errorText}`);
        throw new Error(`Bridge API failed with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      addDebugLog(`Bridge API success response: ${JSON.stringify(result)}`);

      if (!result.success) {
        addDebugLog(`Bridge API returned success=false: ${result.error}`);
        throw new Error(result.error || 'Bridge API call failed');
      }

      addDebugLog('✅ Bridge API call successful');
      return result;

    } catch (apiError) {
      addDebugLog(`❌ CRITICAL: Bridge API failed but Solana transaction succeeded!`);
      addDebugLog(`Solana transaction: ${signature}`);
      addDebugLog(`Amount lost: ${bridgeAmount} EARTH`);
      addDebugLog(`API Error: ${apiError.message}`);

      // This is a critical error - Solana succeeded but backend failed
      alert(`🚨 CRITICAL ERROR: 
Solana transaction succeeded but backend failed!
- Transaction: ${signature}
- Amount: ${bridgeAmount} EARTH 
- Status: EARTH transferred but not credited
- Action: Contact support with this transaction ID`);

      throw new Error(`Backend API failed after successful Solana transaction: ${apiError.message}`);
    }
  };

  const executeBridge = async () => {
    if (!amount || parseFloat(amount) <= 0 || !publicKey || !character) return;

    setIsProcessing(true);
    setLastError('');
    setDebugLogs([]); // Clear previous logs

    try {
      const bridgeAmount = parseFloat(amount);
      addDebugLog(`=== STARTING ${direction} PROCESS ===`);
      addDebugLog(`Amount: ${bridgeAmount} EARTH`);
      addDebugLog(`Character: ${character.name} (${character.id})`);
      addDebugLog(`Wallet: ${publicKey.toString()}`);

      let result;

      if (direction === 'DEPOSIT') {
        result = await executeDeposit(bridgeAmount);
        addDebugLog('✅ DEPOSIT COMPLETED SUCCESSFULLY');
        alert(`✅ Successfully deposited ${bridgeAmount} EARTH!\nNew balance: ${result.newBalance} EARTH\nTx: ${result.transactionSignature}`);
      } else {
        result = await executeWithdraw(bridgeAmount);
        addDebugLog('✅ WITHDRAWAL COMPLETED SUCCESSFULLY');
        alert(`✅ Successfully withdrew ${bridgeAmount} EARTH!\nNew balance: ${result.newBalance} EARTH\nTx: ${result.transactionSignature}`);
      }

      // Multiple ways to refresh data after successful operation
      await Promise.all([
        fetchBridgeStatus(),
        fetchUserEarthBalance(),
      ]);

      // Use the passed-in character refresh function
      if (onCharacterUpdate) {
        addDebugLog('Refreshing character data via prop...');
        await onCharacterUpdate();
        addDebugLog('✅ Character data refreshed via prop');
      } else {
        addDebugLog('⚠️ onCharacterUpdate prop not available');

        // Fallback to GameProvider if available
        if (state.actions?.refetchCharacter) {
          addDebugLog('Trying GameProvider refetchCharacter as fallback...');
          await state.actions.refetchCharacter();
          addDebugLog('✅ Character data refreshed via GameProvider');
        } else {
          addDebugLog('⚠️ No character refresh method available');
        }
      }

      // Reset form
      setAmount('');

    } catch (error) {
      addDebugLog(`❌ ${direction} FAILED: ${error.message}`);
      console.error('Bridge operation failed:', error);
      setLastError(error.message);
      alert(`❌ Bridge failed: ${error.message}`);
    }

    setIsProcessing(false);
  };

  // Check if amount exceeds available balance
  const amountExceedsBalance = () => {
    if (!amount) return false;
    const inputAmount = parseFloat(amount);
    const availableBalance = getAvailableBalance();
    return inputAmount > availableBalance;
  };

  // Check if amount exceeds withdrawal limit (removed - no artificial limits)
  // Only check user's actual in-game balance

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-background border border-primary/30 rounded-lg p-4 font-mono text-xs text-primary max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span className="text-primary font-bold">EARTH_BRIDGE v2.089</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchBridgeStatus();
                fetchUserEarthBalance();
              }}
              disabled={isLoadingStatus}
              className="text-primary hover:text-primary/70 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingStatus ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Environment Check */}
        <div className="mb-4 grid grid-cols-3 gap-2 text-xs">
          <div className={`p-2 rounded border ${EARTH_MINT_ADDRESS ? 'border-success/50 bg-success/10' : 'border-destructive/50 bg-destructive/10'}`}>
            <div className="text-muted-foreground">EARTH_MINT</div>
            <div className={EARTH_MINT_ADDRESS ? 'text-success' : 'text-destructive'}>
              {EARTH_MINT_ADDRESS ? `${EARTH_MINT_ADDRESS.slice(0, 8)}...` : 'MISSING'}
            </div>
          </div>
          <div className={`p-2 rounded border ${TREASURY_WALLET_ADDRESS ? 'border-success/50 bg-success/10' : 'border-destructive/50 bg-destructive/10'}`}>
            <div className="text-muted-foreground">TREASURY</div>
            <div className={TREASURY_WALLET_ADDRESS ? 'text-success' : 'text-destructive'}>
              {TREASURY_WALLET_ADDRESS ? `${TREASURY_WALLET_ADDRESS.slice(0, 8)}...` : 'MISSING'}
            </div>
          </div>
          <div className={`p-2 rounded border ${character ? 'border-success/50 bg-success/10' : 'border-destructive/50 bg-destructive/10'}`}>
            <div className="text-muted-foreground">CHARACTER</div>
            <div className={character ? 'text-success' : 'text-destructive'}>
              {character ? character.name : 'NOT_FOUND'}
            </div>
          </div>
        </div>

        {/* Bridge Status */}
        {bridgeStatus && (
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-muted/50 border border-primary/20 p-3 rounded">
              <div className="text-muted-foreground text-xs mb-1">TREASURY</div>
              <div className="text-primary font-bold">{bridgeStatus.treasuryEarthBalance.toFixed(2)}</div>
              <div className="text-muted-foreground text-xs">EARTH</div>
            </div>
            <div className="bg-muted/50 border border-primary/20 p-3 rounded">
              <div className="text-muted-foreground text-xs mb-1">IN_GAME</div>
              <div className="text-primary font-bold">{bridgeStatus.inGameCirculation.toFixed(2)}</div>
              <div className="text-muted-foreground text-xs">EARTH</div>
            </div>
            <div className="bg-muted/50 border border-primary/20 p-3 rounded">
              <div className="text-muted-foreground text-xs mb-1">RATIO</div>
              <div className={`font-bold ${bridgeStatus.healthStatus === 'HEALTHY' ? 'text-success' : 'text-error'}`}>
                {(bridgeStatus.bridgeRatio * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-muted/50 border border-primary/20 p-3 rounded">
              <div className="text-muted-foreground text-xs mb-1">STATUS</div>
              <div className={`font-bold text-xs ${bridgeStatus.healthStatus === 'HEALTHY' ? 'text-success' : 'text-error'}`}>
                {bridgeStatus.healthStatus}
              </div>
            </div>
          </div>
        )}

        {/* User Balances */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-muted/30 border border-primary/20 p-3 rounded">
            <div className="text-muted-foreground text-xs mb-2">YOUR_BALANCES</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">WALLET:</span>
                <span className="text-primary font-bold">{userEarthBalance.toFixed(2)} EARTH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">IN_GAME:</span>
                <span className="text-primary font-bold">{character?.earth?.toFixed(2) || '0.00'} EARTH</span>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 border border-primary/20 p-3 rounded">
            <div className="text-muted-foreground text-xs mb-2">CONNECTION_STATUS</div>
            <div className="space-y-1">
              <div className={`text-xs ${publicKey ? 'text-success' : 'text-destructive'}`}>
                WALLET: {publicKey ? 'CONNECTED' : 'DISCONNECTED'}
              </div>
              <div className={`text-xs ${character ? 'text-success' : 'text-destructive'}`}>
                CHARACTER: {character ? 'LOADED' : 'MISSING'}
              </div>
              <div className={`text-xs ${getAvailableBalance() > 0 ? 'text-success' : 'text-warning'}`}>
                {direction === 'DEPOSIT' ? 'WALLET_EARTH' : 'GAME_EARTH'}: {getAvailableBalance() > 0 ? 'AVAILABLE' : 'NONE'}
              </div>
            </div>
          </div>
        </div>

        {/* Bridge Direction Toggle */}
        <div className="mb-4">
          <div className="text-muted-foreground text-xs mb-2">BRIDGE_OPERATION:</div>
          <div className="bg-muted/30 border border-primary/20 p-3 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className={`font-bold flex items-center gap-1 ${direction === 'DEPOSIT' ? 'text-success' : 'text-warning'}`}>
                {direction === 'DEPOSIT' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {direction === 'DEPOSIT' ? 'DEPOSIT_TO_GAME' : 'WITHDRAW_TO_WALLET'}
              </span>
              <button
                onClick={() => {
                  setDirection(direction === 'DEPOSIT' ? 'WITHDRAW' : 'DEPOSIT');
                  setAmount('');
                }}
                className="bg-muted/30 border border-primary/20 p-1 rounded hover:border-primary/50 transition-colors"
                title="Toggle between deposit and withdrawal"
              >
                <ArrowUpDown className="w-3 h-3 text-primary" />
              </button>
            </div>
            <div className="text-xs text-muted-foreground">
              {direction === 'DEPOSIT'
                ? 'Transfer EARTH from your wallet to treasury, receive equal in-game EARTH'
                : 'Convert in-game EARTH to wallet EARTH via treasury transfer'
              }
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <div className="text-muted-foreground text-xs mb-2">{direction === 'DEPOSIT' ? 'DEPOSIT_AMOUNT' : 'WITHDRAWAL_AMOUNT'}:</div>
          <div className="bg-muted/30 border border-primary/20 p-3 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-primary font-bold">EARTH</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">
                  MAX: {getMaxAmount().toFixed(2)}
                </span>
                <button
                  onClick={setMaxAmount}
                  className="text-primary text-xs hover:underline"
                >
                  MAX
                </button>
              </div>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              max={getMaxAmount()}
              step="0.01"
              className="w-full bg-transparent text-primary text-lg font-bold outline-none placeholder-muted-foreground/50"
            />
          </div>
        </div>

        {/* Warnings */}
        {amountExceedsBalance() && (
          <div className="bg-destructive/10 border border-destructive/50 p-3 rounded mb-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">
                INSUFFICIENT_{direction === 'DEPOSIT' ? 'WALLET' : 'GAME'}_EARTH_BALANCE
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Available: {getAvailableBalance().toFixed(2)} EARTH, Requested: {amount || '0'} EARTH
            </div>
          </div>
        )}

        {lastError && (
          <div className="bg-destructive/10 border border-destructive/50 p-3 rounded mb-4">
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-bold">LAST_ERROR</span>
            </div>
            <div className="text-xs text-muted-foreground whitespace-pre-wrap">{lastError}</div>
          </div>
        )}

        {/* Debug Logs */}
        {debugLogs.length > 0 && (
          <div className="mb-4">
            <div className="text-muted-foreground text-xs mb-2">DEBUG_LOG:</div>
            <div className="border border-primary/20 rounded p-2 max-h-32 overflow-y-auto font-mono text-xs">
              {debugLogs.map((log, idx) => (
                <div key={idx} className="text-muted-foreground/80 py-0.5">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Execute Button */}
        <button
          onClick={executeBridge}
          disabled={
            !amount ||
            parseFloat(amount) <= 0 ||
            amountExceedsBalance() ||
            isProcessing ||
            !publicKey ||
            !character ||
            !EARTH_MINT_ADDRESS ||
            !TREASURY_WALLET_ADDRESS
          }
          className="w-full bg-action/10 border border-primary text-primary p-3 rounded font-bold hover:bg-action/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-4 h-4 animate-pulse" />
              PROCESSING_{direction}...
            </div>
          ) : !publicKey ? (
            `CONNECT_WALLET`
          ) : !character ? (
            `CREATE_CHARACTER_FIRST`
          ) : !EARTH_MINT_ADDRESS || !TREASURY_WALLET_ADDRESS ? (
            `MISSING_ENV_VARS`
          ) : getAvailableBalance() === 0 ? (
            direction === 'DEPOSIT' ? `NO_WALLET_EARTH` : `NO_GAME_EARTH`
          ) : amountExceedsBalance() ? (
            `INSUFFICIENT_BALANCE`
          ) : (
            `${direction}_${amount || '0'}_EARTH`
          )}
        </button>

        {/* Footer */}
        <div className="mt-4 pt-2 border-t border-primary/20 text-muted-foreground/60 text-xs text-center">
          {'>'} DEVNET_BRIDGE_v2.089 | DEPOSIT_WITHDRAW_ENABLED
        </div>
      </div>
    </div>
  );
};

export default EarthBridge;
