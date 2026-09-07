import { v2 as cloudinary } from 'cloudinary'
export default defineEventHandler(async event => {
  await requireAdmin(event)
  const c = useRuntimeConfig()
  if (!c.cloudinaryApiSecret || !c.cloudinaryCloudName || !c.cloudinaryApiKey) throw createError({ statusCode: 503, statusMessage: 'Cloudinary no está configurado' })
  const params = { timestamp: Math.floor(Date.now()/1000), folder: 'esencia', upload_preset: 'esencia_signed' }
  return { ...params, signature: cloudinary.utils.api_sign_request(params, c.cloudinaryApiSecret), api_key: c.cloudinaryApiKey, cloud: c.cloudinaryCloudName }
})
