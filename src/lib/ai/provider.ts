import { createOllamaProvider } from "./providers/ollama";
import type { AIProvider } from "./types";

export type {
  AIProvider,
  AIProviderInput,
  AIProviderOutput,
  AiProvider,
  AiProviderMessage,
  GenerateStructuredInput,
  GenerateTextInput,
} from "./types";

export { createOllamaProvider } from "./providers/ollama";

export function createAiProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER ?? "ollama").toLowerCase();

  if (provider === "ollama") {
    return createOllamaProvider();
  }

  if (provider === "openai") {
    throw new Error("OpenAI provider not implemented yet. Architecture ready.");
  }

  throw new Error(`Provider AI necunoscut: ${provider}`);
}
