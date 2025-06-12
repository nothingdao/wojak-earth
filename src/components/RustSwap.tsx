import React, { useState, useEffect } from 'react';
import { ArrowUpDown, X, Zap, AlertTriangle } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface RustSwapProps {
  isOpen: boolean;
  onClose: () => void;
  currentRate: number;
}

const RustSwap: React.FC<RustSwapProps> = ({ isOpen, onClose, currentRate }) => {
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [fromToken, setFromToken] = useState('SOL');
  const [toToken, setToToken] = useState('RUST');
  const [isProcessing, setIsProcessing] = useState(false);
  const [characterId, setCharacterId] = useState('player_123'); // TODO: Get from auth context

  const wallet = useWallet();
  const { publicKey } = wallet;

  console.log('Available wallet methods:', Object.keys(wallet));

  // Calculate conversion
  useEffect(() => {
    if (fromAmount && !isNaN(parseFloat(fromAmount))) {
      const amount = parseFloat(fromAmount);
      if (fromToken === 'SOL') {
        setToAmount((amount * currentRate).toFixed(2));
      } else {
        setToAmount((amount / currentRate).toFixed(6));
      }
    } else {
      setToAmount('');
    }
  }, [fromAmount, fromToken, toToken, currentRate]);

  const flipTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
  };

  const executeSwap = async () => {
    if (!publicKey) {
      alert('Wallet not connected');
      return;
    }

    setIsProcessing(true);

    try {
      const swapType = fromToken === 'SOL' ? 'SOL_TO_RUST' : 'RUST_TO_SOL';
      const amount = parseFloat(fromAmount);

      if (swapType === 'SOL_TO_RUST') {
        const connection = new Connection(import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com');
        const treasuryAddress = new PublicKey(import.meta.env.VITE_TREASURY_WALLET_ADDRESS);

        // Create transfer instruction
        const transferInstruction = SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: treasuryAddress,
          lamports: Math.floor(amount * LAMPORTS_PER_SOL)
        });

        // Create transaction with the instruction
        const transaction = new Transaction().add(transferInstruction);

        console.log('Sending transaction with sendTransaction...');
        const signature = await wallet.sendTransaction(transaction, connection);

        console.log('Transaction signature:', signature);
        // Send to backend with signature
        const response = await fetch('/.netlify/functions/rust-swap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            swapType: 'SOL_TO_RUST',
            amount,
            characterId,
            userWallet: publicKey.toString(),
            transactionSignature: signature,
            currentRate
          })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        console.log('✅ SOL→RUST swap completed:', result);

      } else {
        // RUST to SOL swap
        const response = await fetch('/.netlify/functions/rust-swap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            swapType: 'RUST_TO_SOL',
            amount,
            characterId,
            userWallet: publicKey.toString(),
            currentRate
          })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        console.log('✅ RUST→SOL swap completed:', result);
      }

      // Reset form and close
      setFromAmount('');
      setToAmount('');
      onClose();

    } catch (error) {
      console.error('Swap failed:', error);
      alert(`Swap failed: ${error.message}`);
    }

    setIsProcessing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-background border border-primary/30 rounded-lg p-4 font-mono text-xs text-primary">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4" />
            <span className="text-primary font-bold">SWAP_TERMINAL v2.089</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wallet Display */}
        {publicKey && (
          <div className="bg-muted/50 border border-primary/20 p-3 rounded mb-4">
            <div className="text-muted-foreground text-xs mb-1">CONNECTED_WALLET</div>
            <div className="text-primary font-bold text-xs">
              {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
            </div>
          </div>
        )}

        {/* Rate Display */}
        <div className="bg-muted/50 border border-primary/20 p-3 rounded mb-4">
          <div className="text-muted-foreground text-xs mb-1">EXCHANGE_RATE</div>
          <div className="text-primary font-bold">
            1 SOL = {currentRate.toFixed(2)} RUST
          </div>
          <div className="text-muted-foreground text-xs mt-1">
            {'>'} LIVE_FEED_ACTIVE
          </div>
        </div>

        {/* From Token */}
        <div className="mb-3">
          <div className="text-muted-foreground text-xs mb-2">FROM:</div>
          <div className="bg-muted/30 border border-primary/20 p-3 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-primary font-bold">{fromToken}</span>
              <span className="text-muted-foreground text-xs">BAL: 0.000</span>
            </div>
            <input
              type="number"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent text-primary text-lg font-bold outline-none placeholder-muted-foreground/50"
            />
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center mb-3">
          <button
            onClick={flipTokens}
            className="bg-muted/30 border border-primary/20 p-2 rounded hover:border-primary/50 transition-colors"
          >
            <ArrowUpDown className="w-4 h-4 text-primary" />
          </button>
        </div>

        {/* To Token */}
        <div className="mb-4">
          <div className="text-muted-foreground text-xs mb-2">TO:</div>
          <div className="bg-muted/30 border border-primary/20 p-3 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-primary font-bold">{toToken}</span>
              <span className="text-muted-foreground text-xs">BAL: 0.000</span>
            </div>
            <div className="text-primary text-lg font-bold">
              {toAmount || '0.00'}
            </div>
          </div>
        </div>

        {/* Warning */}
        {fromAmount && parseFloat(fromAmount) > 0.1 && (
          <div className="bg-destructive/10 border border-destructive/50 p-3 rounded mb-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">PRICE_IMPACT: HIGH</span>
            </div>
          </div>
        )}

        {/* Execute Button */}
        <button
          onClick={executeSwap}
          disabled={!fromAmount || parseFloat(fromAmount) <= 0 || isProcessing || !publicKey}
          className="w-full bg-primary/10 border border-primary text-primary p-3 rounded font-bold hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-4 h-4 animate-pulse" />
              PROCESSING_SWAP...
            </div>
          ) : !publicKey ? (
            `WALLET_NOT_CONNECTED`
          ) : (
            `EXECUTE_SWAP`
          )}
        </button>

        {/* Footer */}
        <div className="mt-4 pt-2 border-t border-primary/20 text-muted-foreground/60 text-xs text-center">
          {'>'} EARTH_TREASURY_AMM_v2.089
        </div>
      </div>
    </div>
  );
};

export default RustSwap;
