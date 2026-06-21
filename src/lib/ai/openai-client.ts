import "server-only";
import OpenAI from "openai";

const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";

export class AIConfigurationError extends Error {
  constructor(message = "Coach non disponibile in questo momento.") {
    super(message);
    this.name = "AIConfigurationError";
  }
}

const globalForOpenAI = globalThis as typeof globalThis & {
  openaiClient?: OpenAI;
};

function getApiKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new AIConfigurationError();
  }

  return apiKey;
}

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

export function getOpenAIClient() {
  if (globalForOpenAI.openaiClient) {
    return globalForOpenAI.openaiClient;
  }

  const client = new OpenAI({
    apiKey: getApiKey(),
  });

  if (process.env.NODE_ENV !== "production") {
    globalForOpenAI.openaiClient = client;
  }

  return client;
}
