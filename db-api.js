// Full CRUD API for Earth 2089 Database
// Matches exact database structure for any query needed

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
  )
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export class EarthDB {
  // LOCATIONS TABLE - Main game locations
  async locations(query = {}) {
    let q = supabase.from('locations').select('*')

    // Apply any filters
    Object.entries(query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        q = q.in(key, value)
      } else if (typeof value === 'string' && value.includes('%')) {
        q = q.ilike(key, value)
      } else {
        q = q.eq(key, value)
      }
    })

    const { data, error } = await q
    return { data, error, count: data?.length || 0 }
  }

  async locationCount(filters = {}) {
    const result = await this.locations(filters)
    return result.count
  }

  async updateLocation(id, updates) {
    const { data, error } = await supabase
      .from('locations')
      .update(updates)
      .eq('id', id)
      .select()
    return { data, error }
  }

  async createLocation(locationData) {
    const { data, error } = await supabase
      .from('locations')
      .insert(locationData)
      .select()
    return { data, error }
  }

  async deleteLocation(id) {
    const { data, error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id)
      .select()
    return { data, error }
  }

  // CHARACTERS TABLE
  async characters(query = {}) {
    let q = supabase.from('characters').select('*')
    Object.entries(query).forEach(([key, value]) => {
      q = q.eq(key, value)
    })
    const { data, error } = await q
    return { data, error, count: data?.length || 0 }
  }

  // ITEMS TABLE
  async items(query = {}) {
    let q = supabase.from('items').select('*')
    Object.entries(query).forEach(([key, value]) => {
      q = q.eq(key, value)
    })
    const { data, error } = await q
    return { data, error, count: data?.length || 0 }
  }

  // MARKET LISTINGS TABLE
  async marketListings(query = {}) {
    let q = supabase.from('market_listings').select('*')
    Object.entries(query).forEach(([key, value]) => {
      q = q.eq(key, value)
    })
    const { data, error } = await q
    return { data, error, count: data?.length || 0 }
  }

  // TRANSACTIONS TABLE
  async transactions(query = {}) {
    let q = supabase.from('transactions').select('*')
    Object.entries(query).forEach(([key, value]) => {
      q = q.eq(key, value)
    })
    const { data, error } = await q
    return { data, error, count: data?.length || 0 }
  }

  // CHAT MESSAGES TABLE
  async chatMessages(query = {}) {
    let q = supabase.from('chat_messages').select('*')
    Object.entries(query).forEach(([key, value]) => {
      q = q.eq(key, value)
    })
    const { data, error } = await q
    return { data, error, count: data?.length || 0 }
  }

  // LOCATION RESOURCES TABLE
  async locationResources(query = {}) {
    let q = supabase.from('location_resources').select('*')
    Object.entries(query).forEach(([key, value]) => {
      q = q.eq(key, value)
    })
    const { data, error } = await q
    return { data, error, count: data?.length || 0 }
  }

  // RAW SQL for complex queries
  async query(sql) {
    const { data, error } = await supabase.rpc('exec_sql', { query: sql })
    return { data, error }
  }

  // AGGREGATION HELPERS
  async countBy(table, field) {
    const { data } = await supabase.from(table).select(field)
    const counts = {}
    data?.forEach(row => {
      const value = row[field] || 'null'
      counts[value] = (counts[value] || 0) + 1
    })
    return counts
  }

  async distinct(table, field) {
    const { data } = await supabase.from(table).select(field)
    return [...new Set(data?.map(row => row[field]).filter(Boolean))]
  }

  // COMMON QUERIES FOR DISCUSSIONS
  async territoryStats() {
    return await this.countBy('locations', 'territory')
  }

  async biomeStats() {
    return await this.countBy('locations', 'biome')
  }

  async locationsWithSVG() {
    return await this.locations({ svg_path_id: '!null' })
  }

  async locationsWithoutSVG() {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .is('svg_path_id', null)
    return { data, count: data?.length || 0 }
  }

  async parentChildRelationships() {
    const { data } = await supabase
      .from('locations')
      .select('id, name, territory, parent_location_id')
      .not('parent_location_id', 'is', null)
      .order('parent_location_id')
    return { data, count: data?.length || 0 }
  }
}

// Create global instance
const db = new EarthDB()

// Export for command line usage
if (process.argv[1]?.includes('db-api.js')) {
  const [method, ...params] = process.argv.slice(2)

  if (method && db[method]) {
    db[method](...params).then(result => {
      if (result.data) {
        console.table(result.data)
      } else {
        console.log(result)
      }
    }).catch(console.error)
  } else {
    console.log('Available methods:', Object.getOwnPropertyNames(EarthDB.prototype).filter(m => m !== 'constructor'))
  }
}

export default db
