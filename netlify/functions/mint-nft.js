// netlify/functions/mint-nft.js
import { Metaplex, keypairIdentity } from "@metaplex-foundation/js"
import { Connection, Keypair, PublicKey } from "@solana/web3.js"

export const handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { walletAddress, playerName, playerAttributes } = JSON.parse(event.body)

    // Validate input
    if (!walletAddress || !playerName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: walletAddress, playerName' })
      }
    }

    // Validate wallet address
    let userWallet
    try {
      userWallet = new PublicKey(walletAddress)
    } catch (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid wallet address' })
      }
    }

    // Create connection
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
      "confirmed"
    )

    // Server keypair for minting (you need to set this in Netlify env vars)
    if (!process.env.SERVER_KEYPAIR_SECRET) {
      console.error('SERVER_KEYPAIR_SECRET environment variable not set')
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server configuration error: missing keypair' })
      }
    }

    let serverKeypair
    try {
      serverKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(process.env.SERVER_KEYPAIR_SECRET))
      )
    } catch (error) {
      console.error('Failed to parse SERVER_KEYPAIR_SECRET:', error.message)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server configuration error: invalid keypair format' })
      }
    }

    // Create Metaplex instance without Bundlr storage (use default)
    const metaplex = Metaplex.make(connection)
      .use(keypairIdentity(serverKeypair))

    // Create a simple metadata JSON object  
    const metadata = {
      name: playerName,
      description: `Player character NFT for ${playerName}`,
      image: "/layers/bases/male.png", // Relative URL works fine
      attributes: [
        { trait_type: "Type", value: "Player Character" },
        { trait_type: "Level", value: playerAttributes?.level?.toString() || "1" },
        { trait_type: "Class", value: playerAttributes?.class || "Adventurer" },
        { trait_type: "Minted", value: new Date().toISOString().split('T')[0] }
      ],
      properties: {
        files: [
          {
            uri: "/layers/bases/male.png",
            type: "image/png"
          }
        ],
        category: "image"
      }
    }

    console.log('Creating NFT for player:', playerName)


    // Upload the metadata to your own storage or use a metadata endpoint
    const metadataUri = await metaplex.nfts().uploadMetadata(metadata)

    // Mint NFT with the uploaded metadata
    const nft = await metaplex.nfts().create({
      uri: metadataUri.uri,
      name: playerName,
      symbol: "PLAYER",
      sellerFeeBasisPoints: 0,
      creators: [
        {
          address: serverKeypair.publicKey,
          verified: true,
          share: 100
        }
      ],
      tokenOwner: userWallet,
    })

    console.log('NFT minted successfully:', nft.mintAddress.toBase58())

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        mintAddress: nft.mintAddress.toBase58(),
        signature: nft.response.signature,
        metadataUri: metadataUri.uri,
        message: `Player character "${playerName}" minted successfully!`
      })
    }

  } catch (error) {
    console.error('Error minting NFT:', error)

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to mint NFT'
      })
    }
  }
}
