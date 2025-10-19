import dotenv from 'dotenv';
import { logger } from '../shared/utils/logger.js';

dotenv.config();

const PRIMARY_PROVIDER = process.env.AI_PROVIDER || 'gemini';
const FALLBACK_PROVIDER = process.env.AI_FALLBACK_PROVIDER || 'groq';
const VALID_PROVIDERS = ['gemini', 'groq'];

if (!VALID_PROVIDERS.includes(PRIMARY_PROVIDER)) {
    throw new Error(`Invalid AI_PROVIDER: ${PRIMARY_PROVIDER}. Use: ${VALID_PROVIDERS.join(', ')}`);
}

if (FALLBACK_PROVIDER && !VALID_PROVIDERS.includes(FALLBACK_PROVIDER)) {
  throw new Error(`Invalid AI_FALLBACK_PROVIDER: ${FALLBACK_PROVIDER}. Use: ${VALID_PROVIDERS.join(', ')}`);
}

if (PRIMARY_PROVIDER === FALLBACK_PROVIDER) {
  logger.warn('Primary and fallback providers are the same. Fallback disabled.');
}

const validateApiKey = (key, name, required = true) => {
  if (!key) {
    if (required) {
      throw new Error(`${name} is required but not set in environment variables`)
    }
    return null;
  }
  if (key.length < 20) {
    logger.warn(`${name} appears to be invalid (too short)`)
  }
  return key;
};

const API_KEYS = {
  gemini: validateApiKey(
    process.env.GEMINI_API_KEY,
    'GEMINI_API_KEY',
    PRIMARY_PROVIDER === 'gemini'
  ),
  groq: validateApiKey(
    process.env.GROQ_API_KEY,
    'GROQ_API_KEY',
    PRIMARY_PROVIDER === 'groq'
  ),
};

if (FALLBACK_PROVIDER && !API_KEYS[FALLBACK_PROVIDER]) {
  logger.warn(`Fallback provider '${FALLBACK_PROVIDER}' has no API key. Fallback disabled`)
}

export const PROVIDER_CONFIGS = {
  gemini: {
    baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    availableModels: [
      'gemini-2.5-flash',         
      'gemini-2.5-flash-lite',     
      'gemini-2.5-pro',  
    ],
    rateLimit: {
      requestsPerMinute: 15,
      tokensPerMinute: 1000000,
      requestPerDay: 1500,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  },
  groq: {
    baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
    model: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile',
    availableModels: [
      'llama-3.1-8b-instant',    
      'llama-3.1-70b-versatile',  
      'llama-3.3-70b-versatile',  
      'mixtral-8x7b-32768',     
      'gemma2-9b-it',          
    ],
    rateLimit: {
      requestsPerMinute: 30,
      tokensPerMinute: 14400,
      requestsPerDay: 14400,
    },
  },
};

export const AI_PARAMS = {
  maxTokens: Number(process.env.AI_MAX_TOKENS) || 4096,
  temperature: Number(process.env.AI_TEMPERATURE) || 0.7,
  topP: Number(process.env.AI_TOP_P) || 0.95,
  topK: Number(process.env.AI_TOP_K) || 40,
  timeout: Number(process.env.AI_TIMEOUT) || 20000,
};

export const aiConfig = {
  primary: {
    provider: PRIMARY_PROVIDER,
    ...PROVIDER_CONFIGS[PRIMARY_PROVIDER],
  },
  fallback:
    FALLBACK_PROVIDER && API_KEYS[FALLBACK_PROVIDER]
      ? {
          provider: FALLBACK_PROVIDER,
          ...PROVIDER_CONFIGS[FALLBACK_PROVIDER],
        }
      : null,
  params: AI_PARAMS,
  fallbackEnabled:
    !!(FALLBACK_PROVIDER && API_KEYS[FALLBACK_PROVIDER] && PRIMARY_PROVIDER !== FALLBACK_PROVIDER),
};

export const getApiKey = (provider) => {
  const key = API_KEYS[provider];
  if (!key) {
    throw new Error(`API key not configured for provider: ${provider}`);
  }
  return key;
};

export const getProviderConfig = (provider) => {
  const config = PROVIDER_CONFIGS[provider];
  if (!config) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  return config;
};

export const checkAIConfig = () => ({
  primary: {
    provider: PRIMARY_PROVIDER,
    model: aiConfig.primary.model,
    configured: !!API_KEYS[PRIMARY_PROVIDER],
  },
  fallback: aiConfig.fallbackEnabled
    ? {
        provider: FALLBACK_PROVIDER,
        model: aiConfig.fallback.model,
        configured: !!API_KEYS[FALLBACK_PROVIDER],
      }
    : null,
  fallbackEnabled: aiConfig.fallbackEnabled,
});

logger.info(`Primary AI provider: ${PRIMARY_PROVIDER} (${aiConfig.primary.model})`);
if (aiConfig.fallbackEnabled) {
  logger.info(`Fallback AI provider: ${FALLBACK_PROVIDER} (${aiConfig.fallback.model})`);
} else {
  logger.warn('No fallback provider configured or fallback disabled.');
}

export default aiConfig;