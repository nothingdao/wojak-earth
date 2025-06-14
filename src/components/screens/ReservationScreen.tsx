// src/components/screens/ReservationScreen.tsx
import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { useNetwork } from '@/contexts/NetworkContext';
import { Button } from '@/components/ui/button';
import { Loader2, Database, Activity, AlertCircle, ArrowLeft } from 'lucide-react';
import { saveReservationToSupabase, getReservationFromSupabase, updateReservationStatus } from '@/lib/supabase-reservations';
import { TopControls } from '../TopControls';
import { Connection, clusterApiUrl } from '@solana/web3.js';


interface ReservationScreenProps {
  onReservationComplete?: () => void;
  onBackToNetworkSelect?: () => void;
}

export function ReservationScreen({ onReservationComplete, onBackToNetworkSelect }: ReservationScreenProps) {
  const { connection: walletConnection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  // Restore original network context after testing
  // const { isMainnet, getExplorerUrl } = useNetwork();

  // Force Devnet for testing purposes
  const FORCE_DEVNET = import.meta.env.VITE_FORCE_DEVNET === 'true';
  const { isMainnet: originalIsMainnet, getExplorerUrl } = useNetwork();
  const isMainnet = FORCE_DEVNET ? false : originalIsMainnet;

  // Override connection when forcing devnet
  const connection = FORCE_DEVNET
    ? new Connection(clusterApiUrl('devnet'), 'confirmed')
    : walletConnection;

  // Log network info  
  console.log('Network:', isMainnet ? 'Mainnet' : 'Devnet');

  const [isProcessing, setIsProcessing] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reservationPrice] = useState(1); // 0.05 SOL - adjust as needed

  // Get treasury wallet from environment variables
  const TREASURY_WALLET = import.meta.env.VITE_TREASURY_WALLET_ADDRESS;

  const [existingReservation, setExistingReservation] = useState(null);
  const [checkingReservation, setCheckingReservation] = useState(true);

  useEffect(() => {
    if (publicKey) {
      checkExistingReservation(publicKey.toString());
    } else {
      setCheckingReservation(false);
    }
  }, [publicKey]);

  const checkExistingReservation = async (walletAddress: string) => {
    try {
      const reservation = await getReservationFromSupabase(walletAddress);
      setExistingReservation(reservation);
    } catch (error) {
      console.error('Error checking existing reservation:', error);
      setError('Failed to check existing reservation');
    } finally {
      setCheckingReservation(false);
    }
  };

  const validateEnvironment = () => {
    if (!TREASURY_WALLET) {
      throw new Error('Treasury wallet address not configured. Please set NEXT_PUBLIC_TREASURY_WALLET_ADDRESS or VITE_TREASURY_WALLET_ADDRESS in your environment variables.');
    }

    try {
      new PublicKey(TREASURY_WALLET);
    } catch {
      throw new Error('Invalid treasury wallet address format');
    }
  };

  const handleReservation = async () => {
    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Validate environment
      validateEnvironment();

      const treasuryPubkey = new PublicKey(TREASURY_WALLET!);
      const lamports = Math.floor(reservationPrice * LAMPORTS_PER_SOL);

      // Check wallet balance
      const balance = await connection.getBalance(publicKey);
      if (balance < lamports + 5000) { // 5000 lamports for transaction fee
        throw new Error(`Insufficient balance. You need at least ${reservationPrice + 0.005} SOL (including transaction fees)`);
      }

      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: treasuryPubkey,
          lamports,
        })
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Send transaction
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      console.log('Transaction sent:', signature);

      // Save initial reservation with pending status
      await saveReservationToSupabase({
        wallet_address: publicKey.toString(),
        transaction_signature: signature,
        amount_sol: reservationPrice,
        status: 'pending'
      });


      // Wait for confirmation with timeout
      const confirmationPromise = connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
      }, 'confirmed');

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Transaction confirmation timeout')), 60000)
      );

      await Promise.race([confirmationPromise, timeoutPromise]);

      // Update reservation status to confirmed
      await updateReservationStatus(signature, 'confirmed');

      setTxSignature(signature);
      onReservationComplete?.();

    } catch (error: any) {
      console.error('Payment failed:', error);

      let errorMessage = 'Payment failed. Please try again.';
      if (error.message?.includes('User rejected')) {
        errorMessage = 'Transaction was cancelled by user';
      } else if (error.message?.includes('Insufficient')) {
        errorMessage = error.message;
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Transaction is taking longer than expected. Please check your transaction status.';
      } else if (error.message?.includes('Treasury wallet')) {
        errorMessage = 'Configuration error. Please contact support.';
      }

      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Error display component
  const ErrorDisplay = ({ message }: { message: string }) => (
    <div className="bg-red-950/20 border border-red-500/30 rounded p-4 mb-4">
      <div className="flex items-center gap-2 text-red-400">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );

  // Show loading while checking reservation
  if (checkingReservation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto bg-background border border-primary/30 rounded-lg p-6 font-mono">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Checking reservation status...</p>
          </div>
        </div>
      </div>
    );
  }

  // If user already has reservation, show confirmation UI
  if (existingReservation || txSignature) {
    const signature = txSignature || existingReservation?.transaction_signature;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <TopControls />
        <div className="w-full max-w-md mx-auto bg-background border border-success rounded-lg p-6 font-mono">
          {/* Terminal Header */}
          <div className="flex items-center justify-between mb-4 border-b border-success pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-success" />
              <span className="text-success font-bold text-sm">RESERVATION_CONFIRMED v2.089</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-success" />
              <span className="text-success text-xs">VERIFIED</span>
            </div>
          </div>

          {/* Success Message */}
          <div className="border border-success rounded p-4 mb-4">
            <div className="text-center">
              <div className="text-success font-bold mb-1">RESERVATION_SECURED</div>
              <div className="text-success text-xs">
                PRIORITY_ACCESS_GRANTED
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Welcome to the EARTH 2089 whitelist! Your spot is secured for the NFT launch.
              </p>
            </div>

            {/* Transaction Details */}
            <div className="bg-muted/20 border border-primary/10 rounded p-3">
              <div className="text-xs text-muted-foreground font-mono">
                <div className="text-success text-xs font-bold mb-2">[TRANSACTION_DETAILS]</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>AMOUNT:</span>
                    <span className="text-success">{reservationPrice} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span>STATUS:</span>
                    <span className="text-success">CONFIRMED</span>
                  </div>
                  <div className="break-all">
                    <span>TX: </span>
                    <a
                      href={getExplorerUrl(signature)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      {signature?.slice(0, 12)}...{signature?.slice(-12)}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={() => {
                  onBackToNetworkSelect?.() // ✅ This will close the reservation screen
                }}
                className="w-full font-mono text-sm h-10"
                variant="outline"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                RETURN_TO_REGISTRY
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                To help test the game, switch to Devnet and create a burner character
              </p>


            </div>
          </div>

          {/* Footer */}
          <div className="text-xs text-muted-foreground/60 font-mono text-center border-t border-success pt-3 mt-4">
            RESERVATION_SYSTEM_v2089 | WHITELIST_CONFIRMED
          </div>
        </div>
      </div>
    );
  }

  // Main reservation interface
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <TopControls />

      <div className="w-full max-w-md mx-auto bg-background border border-primary/30 rounded-lg p-6 font-mono">
        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <span className="text-primary font-bold text-sm">EARTH_2089_RESERVATIONS v2.089</span>
          </div>
          <div className="flex items-center gap-3">
            {onBackToNetworkSelect && (
              <button
                onClick={onBackToNetworkSelect}
                className="text-muted-foreground hover:text-primary transition-colors"
                title="Back to network selection"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 animate-pulse text-primary" />
              <span className="text-primary text-xs">{isMainnet ? 'MAINNET' : 'DEVNET'}</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && <ErrorDisplay message={error} />}

        {/* Project Header */}
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-primary font-bold text-lg mb-2">EARTH_2089_RESERVATION</div>
            <div className="text-muted-foreground text-sm mb-4">
              Secure early access to exclusive EARTH NFTs
            </div>
          </div>

          {/* Benefits Card */}
          <div className="border border-primary/20 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success" />
                <span className="font-bold text-primary">EARLY ACCESS BENEFITS</span>
              </div>
              <span className="text-xs text-success">WHITELIST</span>
            </div>
            <div className="text-xs text-muted-foreground mb-3">
              • Priority minting access to EARTH NFTs<br />
              • Exclusive character traits and abilities<br />
              • Beta game access on Devnet<br />
              • Future airdrop eligibility
            </div>
          </div>

          {/* Pricing Card */}
          <div className="border border-primary/20 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="font-bold text-primary">RESERVATION COST</span>
              </div>
              <span className="text-xs text-primary">{isMainnet ? 'MAINNET' : 'DEVNET'}</span>
            </div>
            <div className="text-center mt-3">
              <div className="text-2xl font-bold text-success font-mono mb-1">
                {reservationPrice} SOL
              </div>
              <div className="text-xs text-muted-foreground">
                {isMainnet ? 'One-time reservation fee' : 'Test reservation (Devnet)'}
              </div>
            </div>
          </div>

          {!publicKey ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your wallet to reserve your spot in the EARTH 2089 whitelist
                </p>
              </div>
              <WalletMultiButton className="w-full !bg-primary hover:!bg-primary/90 !font-mono" />
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={handleReservation}
                disabled={isProcessing || !TREASURY_WALLET}
                className={`w-full font-mono text-sm ${isProcessing || !TREASURY_WALLET
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90'
                  }`}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    PROCESSING_RESERVATION
                  </div>
                ) : !TREASURY_WALLET ? (
                  'CONFIGURATION_ERROR'
                ) : (
                  `RESERVE_WHITELIST_SPOT`
                )}
              </Button>

              <Button
                onClick={() => {
                  // Allow testing reservation flow on both networks
                  onReservationComplete?.();
                }}
                variant="outline"
                className="w-full font-mono text-sm"
              >
                {isMainnet ? 'SKIP_TO_GAME_TESTING' : 'ACCESS_GAME_FREE'}
              </Button>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-muted/20 border border-primary/10 rounded p-3">
            <div className="text-xs text-muted-foreground font-mono">
              <div className="text-primary text-xs font-bold mb-2">[RESERVATION_INFO]</div>
              <div className="space-y-1">
                <div>• Payment processed on Solana {isMainnet ? 'Mainnet' : 'Devnet'}</div>
                <div>• Whitelist status confirmed on blockchain</div>
                <div>• NFT launch notifications via X (Twitter)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground/60 font-mono text-center border-t border-primary/20 pt-3 mt-4">
          RESERVATION_SYSTEM_v2089 | EARLY_ACCESS_PROTOCOL
        </div>
      </div>
    </div>
  );
}
