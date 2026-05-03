// Ensure Stripe webhook endpoint receives raw body (not parsed JSON)
// Nitro parses JSON by default, but Stripe signature verification needs the raw body
export default defineEventHandler((event) => {
  if (event.path === '/api/stripe/webhook') {
    // Mark this request to skip JSON body parsing — readRawBody will work
    event._requestBody = undefined
  }
})
