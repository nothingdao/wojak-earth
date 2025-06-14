// netlify/functions/get-character.js
import supabaseAdmin from "../../src/utils/supabase-admin.js"

export const handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS"
  }

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" }
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    }
  }

  try {
    const wallet_address = event.queryStringParameters?.wallet_address

    if (!wallet_address) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Wallet address is required" })
      }
    }

    console.log("🔍 Fetching character for wallet:", wallet_address)

    // First check if character exists at all without status filter
    const { data: checkData, error: checkError } = await supabaseAdmin
      .from("characters")
      .select("*")
      .eq("wallet_address", wallet_address)

    console.log("🔍 Initial check result:", { checkData, checkError })

    // Get character with all related data
    const { data: character, error } = await supabaseAdmin
      .from("characters")
      .select(`
        *,
        location:locations(*),
        inventory:inventory(
          id,
          item:items(*),
          quantity,
          is_equipped
        ),
        stats:character_stats(*)
      `)
      .eq("wallet_address", wallet_address)
      .eq("status", "ACTIVE")
      .single()

    console.log("📊 Full query result:", { character, error })

    if (error) {
      if (error.code === "PGRST116") {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: "Character not found",
            message: "No active character found for this wallet address"
          })
        }
      }
      throw error
    }

    // Transform the data for the frontend
    const transformedCharacter = {
      ...character,
      equipped_items: character.inventory
        .filter(item => item.is_equipped)
        .reduce((acc, item) => {
          acc[item.item.slot] = item.item
          return acc
        }, {}),
      inventory: character.inventory.map(inv => ({
        ...inv.item,
        quantity: inv.quantity,
        is_equipped: inv.is_equipped
      })),
      stats: character.stats || {}
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        character: transformedCharacter
      })
    }

  } catch (error) {
    console.error("Error in get-character:", error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message
      })
    }
  }
}
