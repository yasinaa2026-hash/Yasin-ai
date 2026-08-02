import { OpenAICompatibleProvider } from "./providers/openai-compatible.js";

export function createProvider() {
  const providerName = process.env.AI_PROVIDER || "openai-compatible";

  if (providerName === "openai-compatible") {
    return new OpenAICompatibleProvider({
      apiKey: process.env.AI_API_KEY,
      apiUrl: process.env.AI_API_URL,
      model: process.env.AI_MODEL
    });
  }

  throw new Error(`Unsupported provider: ${providerName}`);
}