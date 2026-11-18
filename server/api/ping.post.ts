export default defineEventHandler(async (event) => {
  const received = await readBody(event)
  console.log('[ping]', received)

  return {
    success: true,
    message: 'Pong!',
    received: received ?? null,
    timestamp: new Date().toISOString(),
  }
})
