export const handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=3600'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const metadata = {
    name: "Wojak Earth Characters",
    description: "Unique character NFTs from Wojak Earth, a Web3 MMORPG built on Solana. Each character is a playable avatar with real game stats, inventory, and progression stored on-chain.",
    image: "https://earth.ndao.computer/wojak.png", // Using your existing wojak image for now
    external_url: "https://earth.ndao.computer",

    attributes: [
      { trait_type: "Collection", value: "Wojak Earth Characters" },
      { trait_type: "Game_Type", value: "Web3 MMORPG" },
      { trait_type: "Blockchain", value: "Solana" }
    ],

    properties: {
      category: "image",
      collection: {
        name: "Wojak Earth Characters",
        family: "Wojak Earth"
      }
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(metadata, null, 2)
  }
}
