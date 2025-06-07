# Solana Pay Integration for Wojak Earth NFT Minting

This implementation adds a .1 SOL payment requirement before users can mint their Wojak Earth character NFTs using Solana Pay protocol.

## 🎯 Features

- **Solana Pay Protocol**: Industry standard payment flow with QR codes
- **Payment Verification**: On-chain transaction verification before minting
- **Secure Flow**: Prevents double-spending and ensures payment before NFT creation
- **User-Friendly**: QR code scanning + manual verification options
- **Time-Limited**: Payment requests expire after 30 minutes
- **Database Tracking**: Full payment lifecycle tracking

## 🚀 Setup Instructions

### 1. Environment Variables

Add these to your Netlify environment variables:

```bash
# Treasury wallet that receives payments (REQUIRED)
TREASURY_WALLET_ADDRESS=YourTreasuryWalletPublicKeyHere

# Existing variables (make sure these are set)
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SOLANA_RPC_URL=https://api.devnet.solana.com
SERVER_KEYPAIR_SECRET=[your,server,keypair,array]
```

### 2. Database Setup

Run the SQL migration in your Supabase SQL editor:

```sql
-- Copy and paste the contents of database-migration-pending-payments.sql
```

### 3. Update Your Character Creation Flow

Replace your existing character creation component with the new payment flow:

```tsx
import SolanaPayment from '@/components/SolanaPayment'

// In your character creation component:
const [showPayment, setShowPayment] = useState(false)
const [paymentId, setPaymentId] = useState<string | null>(null)

const handleStartCreation = () => {
  // Show payment component instead of directly creating character
  setShowPayment(true)
}

const handlePaymentVerified = (verifiedPaymentId: string) => {
  setPaymentId(verifiedPaymentId)
  setShowPayment(false)
  // Now proceed with character creation using the paymentId
}

const handleMintNFT = async () => {
  // Include paymentId in your mint request
  const response = await fetch('/.netlify/functions/mint-nft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress: publicKey.toString(),
      gender,
      imageBlob,
      selectedLayers,
      paymentId, // ← NEW: Include payment ID
    }),
  })
}
```

## 🔄 Payment Flow

1. **User initiates character creation**
2. **Payment request created** via `create-payment-request` function
3. **QR code displayed** for user to scan with their Solana wallet
4. **User pays .1 SOL** to the treasury wallet
5. **Payment verification** via `verify-payment` function
6. **NFT minting** proceeds only after payment verification
7. **Payment marked as used** to prevent reuse

## 🔧 New API Endpoints

### POST /.netlify/functions/create-payment-request

Creates a new Solana Pay payment request.

**Request:**

```json
{
  "walletAddress": "user_wallet_public_key",
  "characterData": {
    /* character creation data */
  }
}
```

**Response:**

```json
{
  "success": true,
  "paymentId": "uuid",
  "paymentUrl": "solana:pay_url",
  "qrCode": "<svg>...</svg>",
  "amount": 2,
  "treasuryWallet": "treasury_public_key",
  "memo": "wojak-nft-uuid",
  "expiresAt": "2025-01-01T00:30:00Z",
  "message": "Please pay .1 SOL to mint your Wojak Earth NFT"
}
```

### POST /.netlify/functions/verify-payment

Verifies a Solana payment transaction.

**Request:**

```json
{
  "paymentId": "uuid",
  "signature": "transaction_signature"
}
```

**Response:**

```json
{
  "success": true,
  "verified": true,
  "paymentId": "uuid",
  "transactionSignature": "signature",
  "amountReceived": 2.0,
  "message": "Payment verified successfully!"
}
```

### Updated POST /.netlify/functions/mint-nft

Now requires a verified payment ID.

**Request (updated):**

```json
{
  "walletAddress": "user_wallet_public_key",
  "gender": "male",
  "imageBlob": "base64_image_data",
  "selectedLayers": {
    /* layer data */
  },
  "paymentId": "verified_payment_uuid" // ← NEW REQUIRED FIELD
}
```

## 💾 Database Schema

New `pending_payments` table:

```sql
CREATE TABLE pending_payments (
  id UUID PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  amount DECIMAL(10, 9) NOT NULL,
  status TEXT DEFAULT 'PENDING',
  character_data JSONB,
  memo TEXT,
  treasury_wallet TEXT NOT NULL,
  transaction_signature TEXT,
  amount_received DECIMAL(10, 9),
  nft_minted BOOLEAN DEFAULT FALSE,
  character_id UUID REFERENCES characters(id),
  nft_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  minted_at TIMESTAMP WITH TIME ZONE
);
```

## 🛡️ Security Features

- **On-chain verification**: All payments verified against Solana blockchain
- **Amount validation**: Ensures exactly .1 SOL was paid
- **Treasury validation**: Confirms payment went to correct wallet
- **Expiration handling**: Payments expire after 30 minutes
- **Single-use**: Each payment can only mint one NFT
- **Wallet verification**: Payment must come from the requesting wallet

## 🧪 Testing

1. **Set up a devnet treasury wallet**
2. **Fund your user wallet with devnet SOL**
3. **Test the payment flow end-to-end**
4. **Verify payments appear in your treasury wallet**
5. **Confirm NFTs are minted only after payment**

## 🚨 Important Notes

- **Treasury Wallet**: Make sure to set a secure treasury wallet address
- **Network Consistency**: Use same network (devnet/mainnet) for all operations
- **Error Handling**: Payment failures are logged and can be retried
- **Monitoring**: Monitor the `pending_payments` table for stuck payments

## 🔍 Troubleshooting

### Common Issues:

1. **"Payment not found"**: User trying to mint without paying first
2. **"Payment expired"**: User took too long to complete payment
3. **"Payment already used"**: User trying to mint multiple times with same payment
4. **"Treasury wallet not found"**: Payment didn't go to correct address
5. **"Insufficient amount"**: User paid less than .1 SOL

### Debug Steps:

1. Check environment variables are set correctly
2. Verify treasury wallet address is valid
3. Check Supabase connection and table exists
4. Monitor Netlify function logs for errors
5. Verify user has sufficient SOL balance

## 📈 Future Enhancements

- **Dynamic pricing**: Variable NFT prices based on demand
- **Bulk discounts**: Lower prices for multiple NFT purchases
- **Refund system**: Automatic refunds for failed mints
- **Payment analytics**: Dashboard for tracking payment metrics
- **Multi-token support**: Accept other SPL tokens as payment

---

✅ **Your Wojak Earth NFTs now require payment before minting!**

Users must pay .1 SOL before they can create their character NFT, ensuring a monetized and secure minting process.
