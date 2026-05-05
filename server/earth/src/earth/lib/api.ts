const importModule = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<any>

export const api: any = (
  await importModule(new URL('../../../../../convex/_generated/api.js', import.meta.url).href)
).api
