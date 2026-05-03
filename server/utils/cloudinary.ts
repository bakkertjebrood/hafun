import { v2 as cloudinary } from 'cloudinary'

let configured = false

function configure() {
  if (configured) return
  const config = useRuntimeConfig()
  const cloudName = config.public.cloudinaryCloudName as string
  const apiKey = config.cloudinaryApiKey as string
  const apiSecret = config.cloudinaryApiSecret as string
  if (!cloudName || !apiKey || !apiSecret) return
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  })
  configured = true
}

export function isCloudinaryConfigured(): boolean {
  const config = useRuntimeConfig()
  return !!(
    config.public.cloudinaryCloudName
    && config.cloudinaryApiKey
    && config.cloudinaryApiSecret
  )
}

export interface SignedUploadParams {
  cloudName: string
  apiKey: string
  timestamp: number
  signature: string
  folder: string
  publicId: string
}

/**
 * Maakt een signed upload-payload zodat de browser direct naar Cloudinary kan
 * uploaden zonder ons bestand-bestand te streamen. De server bepaalt de folder
 * + public_id zodat de gebruiker geen vrije keuze heeft over de naamgeving.
 */
export function signBoatPhotoUpload(boatId: string): SignedUploadParams {
  configure()
  if (!isCloudinaryConfigured()) {
    throw createError({ statusCode: 500, message: 'Cloudinary is niet geconfigureerd' })
  }

  const config = useRuntimeConfig()
  const cloudName = config.public.cloudinaryCloudName as string
  const apiKey = config.cloudinaryApiKey as string
  const apiSecret = config.cloudinaryApiSecret as string

  const timestamp = Math.floor(Date.now() / 1000)
  const folder = `boats/${boatId}`
  const publicId = `boat-${Date.now()}`

  const signature = cloudinary.utils.api_sign_request(
    {
      folder,
      public_id: publicId,
      timestamp
    },
    apiSecret
  )

  return { cloudName, apiKey, timestamp, signature, folder, publicId }
}

/**
 * Verwijdert een afbeelding uit Cloudinary. Genegeerd als de configuratie
 * ontbreekt zodat lokale dev niet faalt op deze cleanup.
 */
export async function deleteCloudinaryImage(publicId: string): Promise<void> {
  configure()
  if (!isCloudinaryConfigured()) return
  try {
    await cloudinary.uploader.destroy(publicId, { invalidate: true })
  } catch (err) {
    console.warn('[cloudinary] failed to delete', publicId, err)
  }
}
