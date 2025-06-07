-- Database Migration: Add pending_payments table for Solana Pay integration
-- Run this in your Supabase SQL editor or wherever you manage your database

CREATE TABLE IF NOT EXISTS pending_payments (
  id TEXT PRIMARY KEY, -- Changed to TEXT to match your ID format
  wallet_address TEXT NOT NULL,
  amount DECIMAL(10, 9) NOT NULL, -- SOL amounts with 9 decimal places
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'EXPIRED', 'FAILED')),
  character_data JSONB,
  memo TEXT,
  treasury_wallet TEXT NOT NULL,
  transaction_signature TEXT,
  amount_received DECIMAL(10, 9),
  nft_minted BOOLEAN DEFAULT FALSE,
  character_id TEXT REFERENCES characters(id), -- Changed to TEXT
  nft_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  minted_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pending_payments_wallet_address ON pending_payments(wallet_address);
CREATE INDEX IF NOT EXISTS idx_pending_payments_status ON pending_payments(status);
CREATE INDEX IF NOT EXISTS idx_pending_payments_created_at ON pending_payments(created_at);
CREATE INDEX IF NOT EXISTS idx_pending_payments_expires_at ON pending_payments(expires_at);

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE pending_payments ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see their own payments
CREATE POLICY "Users can view their own payments" ON pending_payments
  FOR SELECT USING (auth.uid()::text = wallet_address OR auth.role() = 'service_role');

-- Policy to allow service role to manage all payments
CREATE POLICY "Service role can manage all payments" ON pending_payments
  FOR ALL USING (auth.role() = 'service_role');

-- Optional: Add a function to auto-expire old payments
CREATE OR REPLACE FUNCTION expire_old_payments()
RETURNS void AS $$
BEGIN
  UPDATE pending_payments 
  SET status = 'EXPIRED'
  WHERE status = 'PENDING' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to run the expiration function
-- (This would need to be set up in your database scheduler)
-- SELECT cron.schedule('expire-payments', '*/5 * * * *', 'SELECT expire_old_payments();');

COMMENT ON TABLE pending_payments IS 'Stores pending Solana Pay payment requests for NFT minting';
COMMENT ON COLUMN pending_payments.id IS 'Unique payment ID, also used as Solana Pay reference';
COMMENT ON COLUMN pending_payments.wallet_address IS 'User wallet address making the payment';
COMMENT ON COLUMN pending_payments.amount IS 'Expected payment amount in SOL';
COMMENT ON COLUMN pending_payments.status IS 'Payment status: PENDING, VERIFIED, EXPIRED, FAILED';
COMMENT ON COLUMN pending_payments.character_data IS 'JSON data for character creation';
COMMENT ON COLUMN pending_payments.memo IS 'Solana Pay memo for transaction identification';
COMMENT ON COLUMN pending_payments.treasury_wallet IS 'Treasury wallet address that should receive payment';
COMMENT ON COLUMN pending_payments.transaction_signature IS 'Solana transaction signature after payment';
COMMENT ON COLUMN pending_payments.amount_received IS 'Actual amount received (may differ slightly due to fees)';
COMMENT ON COLUMN pending_payments.nft_minted IS 'Whether the NFT has been minted for this payment';
COMMENT ON COLUMN pending_payments.character_id IS 'Character ID after successful minting';
COMMENT ON COLUMN pending_payments.nft_address IS 'NFT mint address after successful minting';

