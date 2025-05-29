// netlify/functions/get-market.js - Updated version
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const locationId = event.queryStringParameters?.locationId
    const limit = parseInt(event.queryStringParameters?.limit || '20')

    if (!locationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Location ID is required' })
      }
    }

    // Get location with parent info
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        parentLocation: true
      }
    })

    if (!location) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Location not found' })
      }
    }

    if (!location.hasMarket) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'No market available',
          message: 'This location does not have a market'
        })
      }
    }

    let allMarketListings = []

    // Get local market listings (items specifically at this location)
    const localListings = await prisma.marketListing.findMany({
      where: {
        locationId: locationId
      },
      include: {
        item: true,
        seller: {
          select: {
            id: true,
            name: true,
            characterType: true
          }
        }
      }
    })

    // If this is a child location, also get parent location's items (global market)
    let globalListings = []
    if (location.parentLocationId) {
      globalListings = await prisma.marketListing.findMany({
        where: {
          locationId: location.parentLocationId
        },
        include: {
          item: true,
          seller: {
            select: {
              id: true,
              name: true,
              characterType: true
            }
          }
        }
      })
    }

    // Combine and mark items appropriately
    const combinedListings = [
      ...localListings.map(listing => ({ ...listing, isLocalSpecialty: true })),
      ...globalListings.map(listing => ({ ...listing, isLocalSpecialty: false }))
    ]

    // If no listings exist at all, create some default items
    if (combinedListings.length === 0) {
      // Get some items to create system listings for
      const availableItems = await prisma.item.findMany({
        where: {
          category: {
            in: ['HAT', 'CLOTHING', 'ACCESSORY', 'CONSUMABLE']
          }
        },
        take: 6
      })

      // Create system market listings
      const systemListings = await Promise.all(
        availableItems.map(item => {
          // Price based on rarity
          let price = 10
          switch (item.rarity) {
            case 'UNCOMMON': price = 25; break
            case 'RARE': price = 50; break
            case 'EPIC': price = 100; break
            case 'LEGENDARY': price = 250; break
          }

          return prisma.marketListing.create({
            data: {
              locationId: locationId,
              itemId: item.id,
              price: price,
              quantity: item.category === 'CONSUMABLE' ? 5 : 1,
              isSystemItem: true
            },
            include: {
              item: true,
              seller: {
                select: {
                  id: true,
                  name: true,
                  characterType: true
                }
              }
            }
          })
        })
      )

      // Use the newly created listings
      allMarketListings = systemListings.map(listing => ({ ...listing, isLocalSpecialty: true }))
    } else {
      allMarketListings = combinedListings
    }

    // Transform listings for frontend
    const transformedListings = allMarketListings
      .sort((a, b) => {
        // Sort: local specialties first, then by creation date
        if (a.isLocalSpecialty && !b.isLocalSpecialty) return -1
        if (!a.isLocalSpecialty && b.isLocalSpecialty) return 1
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      .slice(0, limit)
      .map(listing => ({
        id: listing.id,
        price: listing.price,
        quantity: listing.quantity,
        isSystemItem: listing.isSystemItem,
        isLocalSpecialty: listing.isLocalSpecialty,
        seller: listing.seller ? {
          id: listing.seller.id,
          name: listing.seller.name,
          characterType: listing.seller.characterType
        } : null,
        item: {
          id: listing.item.id,
          name: listing.item.name,
          description: listing.item.description,
          category: listing.item.category,
          rarity: listing.item.rarity,
          imageUrl: listing.item.imageUrl,
          layerType: listing.item.layerType,
          energyEffect: listing.item.energyEffect,
          healthEffect: listing.item.healthEffect
        },
        createdAt: listing.createdAt
      }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        items: transformedListings,
        totalCount: transformedListings.length,
        locationId: locationId,
        locationName: location.name,
        isChildLocation: !!location.parentLocationId,
        parentLocationName: location.parentLocation?.name,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error fetching market items:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to fetch market items'
      })
    }
  } finally {
    await prisma.$disconnect()
  }
}
