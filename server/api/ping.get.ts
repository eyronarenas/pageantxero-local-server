export default defineEventHandler(() => ({
  success: true,
  message: 'Pong!',
  timestamp: new Date().toISOString(),
}))
