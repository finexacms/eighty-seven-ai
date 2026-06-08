import ZAI from "z-ai-web-dev-sdk";

// Singleton pattern — create once, reuse everywhere
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

export async function getZaiClient() {
  if (zaiInstance) return zaiInstance;

  // For Vercel / production: use environment variables
  // For local dev: SDK auto-reads from /etc/.z-ai-config or ~/.z-ai-config
  if (process.env.ZAI_API_KEY && process.env.ZAI_BASE_URL) {
    zaiInstance = await ZAI.create({
      baseUrl: process.env.ZAI_BASE_URL,
      apiKey: process.env.ZAI_API_KEY,
    });
  } else {
    // Fallback: SDK reads config file automatically (local dev)
    zaiInstance = await ZAI.create();
  }

  return zaiInstance;
}
