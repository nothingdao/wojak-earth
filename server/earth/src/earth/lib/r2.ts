import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL! // e.g. https://pub-xxx.r2.dev or custom domain

const hasR2Config = Boolean(
  R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_PUBLIC_URL
)

export const r2 = hasR2Config
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  : null

export async function uploadImage(
  bucket: string,
  key: string,
  imageData: string | Buffer
): Promise<string> {
  let buffer: Buffer
  if (typeof imageData === 'string') {
    const base64 = imageData.replace(/^data:image\/[a-z]+;base64,/, '')
    buffer = Buffer.from(base64, 'base64')
  } else {
    buffer = imageData
  }

  if (!r2 || !R2_PUBLIC_URL) {
    // Local/dev fallback: keep character creation unblocked when R2 secrets are
    // not configured. Production should always set R2_* env vars.
    if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
      console.warn('R2 is not configured; using inline data URL for character image')
      return imageData
    }
    throw new Error('R2 storage is not configured')
  }

  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: 'image/png',
    })
  )

  return `${R2_PUBLIC_URL}/${key}`
}
