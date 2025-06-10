// netlify/functions/get-local-radio.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { location_id } = event.queryStringParameters || {}

    /*
    ===============================
    🎵 RADIO STATION CURATION GUIDE
    ===============================
    
    HOW TO ADD MUSIC TO YOUR GAME:
    
    1. 📁 SUPABASE STORAGE SETUP:
       - Go to Supabase Dashboard → Storage → radio-music bucket
       - Create folders for each music style: default/, underground/, city/, mountain/, forest/, desert/
       - Upload WAV/MP3 files to appropriate folders
    
    2. 🗺️ LOCATION MAPPING:
       - Update the stationMappings object below to map location IDs to music folders
       - Use your actual location IDs from the locations table
       - Music folder names must match your storage folder names exactly
    
    3. 🎶 STATION NAMES & GENRES:
       - Update stationNames object to give each folder a proper radio station name
       - These names show up in the radio player UI
    
    4. 🔀 RANDOM SELECTION:
       - Radio automatically picks random tracks from the folder
       - Shuffles playlist for continuous playback
       - Multiple files = longer, more varied playlists
    
    EXAMPLE WORKFLOW:
    - Create "underground/" folder in storage
    - Upload: cave-ambience.wav, mining-sounds.wav, deep-rumbles.wav
    - Add location mapping: 'fungi-networks': 'underground'
    - Add station name: 'underground': 'Deep Underground Radio'
    - Players in Fungi Networks now hear underground music!
    */

    // Map location IDs to music folder names
    const stationMappings = {
      'default': 'default',
      // City/Urban locations → city folder
      'cmbbz9e4z000dmmlnxskk3lok': 'city', // Cyber City
      'cmbbz9e7d000fmmlnff3bvjcb': 'city', // Central Exchange  
      'cmbbz9e9i000hmmln03o8947y': 'city', // The Glitch Club

      // Mountain/Alpine locations → mountain folder
      'crystal-caves': 'mountain',
      'frostpine-reaches': 'mountain',
      'cmbbz9dw20007mmln9eyk7yyu': 'mountain', // Ironwood Trading Post (alpine)
      'cmbbz9dyi0009mmln9usma5zk': 'mountain', // Rimeglass Lake (alpine)
      'cmbbz9e0o000bmmlne7txx18q': 'mountain', // The Old Cairns (alpine)

      // Underground locations → underground folder
      'fungi-networks': 'underground',
      'cmbbz9ek2000pmmlnp7373c1m': 'underground', // Spore Exchange
      'cmbbz9em7000rmmln5nei3jte': 'underground', // The Great Mycelium

      // Desert locations → desert folder
      'cmbbz9e2t000cmmlnf6p20opz': 'desert', // Desert Outpost

      // Forest/Wilderness → forest folder
      'underland': 'forest' // wilderness biome
    }

    // You could also query your locations table for biome:
    // const { data: location } = await supabase
    //   .from('locations')
    //   .select('biome, theme')
    //   .eq('id', location_id)
    //   .single()

    let musicFolder = 'default'
    if (location_id && stationMappings[location_id]) {
      musicFolder = stationMappings[location_id]
    }

    // Get available music files for this location type
    const { data: files, error } = await supabase
      .storage
      .from('radio-music')
      .list(musicFolder, {
        limit: 10,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (error) {
      console.error('Storage error:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to load music files' })
      }
    }

    // Filter for audio files
    const audioFiles = files?.filter(file =>
      file.name.endsWith('.mp3') ||
      file.name.endsWith('.wav') ||
      file.name.endsWith('.ogg') ||
      file.name.endsWith('.m4a')
    ) || []

    if (audioFiles.length === 0) {
      // Fallback to default folder if no files in specific folder
      const { data: defaultFiles } = await supabase
        .storage
        .from('radio-music')
        .list('default')

      const defaultAudioFiles = defaultFiles?.filter(file =>
        file.name.endsWith('.mp3') ||
        file.name.endsWith('.wav') ||
        file.name.endsWith('.ogg') ||
        file.name.endsWith('.m4a')
      ) || []

      if (defaultAudioFiles.length === 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            station: null,
            message: 'No music files uploaded yet'
          })
        }
      }

      // Return all default files as playlist
      const playlist = defaultAudioFiles.map(file => {
        const { data: urlData } = supabase
          .storage
          .from('radio-music')
          .getPublicUrl(`default/${file.name}`)

        return {
          id: `default-${file.name}`,
          name: file.name.replace(/\.[^/.]+$/, "").replace(/-/g, ' '),
          url: urlData.publicUrl
        }
      })

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          station: {
            id: 'default-playlist',
            name: 'Ambient Soundscape',
            genre: 'Ambient',
            playlist: playlist
          },
          location_id: location_id || 'default'
        })
      }
    }

    // Create playlist from all available files
    const playlist = audioFiles.map(file => {
      const { data: urlData } = supabase
        .storage
        .from('radio-music')
        .getPublicUrl(`${musicFolder}/${file.name}`)

      return {
        id: `${musicFolder}-${file.name}`,
        name: file.name.replace(/\.[^/.]+$/, "").replace(/-/g, ' '),
        url: urlData.publicUrl
      }
    })

    // Station names that appear in the radio player UI
    const stationNames = {
      'default': 'Ambient Soundscape',
      'mountain': 'Alpine Radio',
      'city': 'Urban Beats',
      'underground': 'Deep Underground Radio', // 🎵 Your new station!
      'forest': 'Nature Sounds',
      'desert': 'Desert Winds'
    }

    const station = {
      id: `${musicFolder}-playlist`,
      name: stationNames[musicFolder] || 'Local Radio',
      genre: musicFolder.charAt(0).toUpperCase() + musicFolder.slice(1),
      playlist: playlist
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        station,
        location_id: location_id || 'default'
      })
    }

  } catch (error) {
    console.error('Error in get-local-radio:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    }
  }
}
