export default defineEventHandler(() => ({
  success: true,
  status: 'online',
  application: 'PageantXero Local Server',
  timestamp: new Date().toISOString(),
}))
