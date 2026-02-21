const DEPLOYED_FUNCTIONS_BASE = 'https://earth.ndao.computer/.netlify/functions'

export const FUNCTIONS_API_BASE =
  import.meta.env.VITE_FUNCTIONS_BASE_URL || DEPLOYED_FUNCTIONS_BASE

