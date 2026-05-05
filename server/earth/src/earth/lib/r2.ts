import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL! // e.g. https://pub-xxx.r2.dev or custom domain

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

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
