import dotenv from 'dotenv';
import { logger } from '../shared/utils/logger.js';

dotenv.config();

const primaryProvider = process.env.AI_PROVIDER || 'gemini';
const fallbackProvider = process.env.AI_FALLBACK_PROVIDER || 'groq';
const validProviders = ['gemini', 'groq'];

if (!validProviders.includes(primaryProvider)) {
    throw new Error(`Invalid AI_PROVIDER: ${primaryProvider}. Use: ${validProviders.join(', ')}`);
}

if (fallbackProvider && !validProviders.includes(fallbackProvider)) {
  throw new Error(`Invalid AI_FALLBACK_PROVIDER: ${fallbackProvider}. Use: ${validProviders.join(', ')}`);
}

if (primaryProvider === fallbackProvider) {
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
    primaryProvider === 'gemini'
  ),
  groq: validateApiKey(
    process.env.GROQ_API_KEY,
    'GROQ_API_KEY',
    primaryProvider === 'groq'
  ),
};

if (fallbackProvider && !API_KEYS[fallbackProvider]) {
  logger.warn(`Fallback provider '${fallbackProvider}' has no API key. Fallback disabled`)
}

const PROVIDER_CONFIGS = {
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

const globalParams = {
  maxTokens: Number(process.env.AI_MAX_TOKENS) || 4096,
  temperature: Number(process.env.AI_TEMPERATURE) || 0.7,
  topP: Number(process.env.AI_TOP_P) || 0.95
};

const fallbackStats = {
  totalRequests: 0,
  primarySuccesses: 0,
  primaryFailures: 0,
  fallbackSuccesses: 0,
  fallbackFailures: 0,
  lastFallbackTime: null,
};

export const aiConfig = {
  primary: {
    provider: primaryProvider,
    model: PROVIDER_CONFIGS[primaryProvider].model,
    baseUrl: PROVIDER_CONFIGS[primaryProvider].baseUrl,
    availableModels: PROVIDER_CONFIGS[primaryProvider].availableModels,
    rateLimit: PROVIDER_CONFIGS[primaryProvider].rateLimit,
  },
  fallback: fallbackProvider && API_KEYS[fallbackProvider] ? {
    provider: fallbackProvider,
    model: PROVIDER_CONFIGS[fallbackProvider].model,
    baseUrl: PROVIDER_CONFIGS[fallbackProvider].baseUrl,
    availableModels: PROVIDER_CONFIGS[fallbackProvider].availableModels,
    rateLimit: PROVIDER_CONFIGS[fallbackProvider].rateLimit,
  } : null,
  params: globalParams,
  fallbackEnabled: !!(fallbackProvider && API_KEYS[fallbackProvider] && primaryProvider !== fallbackProvider),
};

export const getApiKey = (providerName) => {
  const key = API_KEYS[providerName];
  if (!key) {
    throw new Error(`API key not configured for provider: ${providerName}`);
  }
  return key;
};

export const getProviderConfig = (providerName) => {
  return PROVIDER_CONFIGS[providerName];
};

export const getRequestHeaders = (providerName) => {
  if (providerName === 'gemini') {
    return {
      'Content-Type': 'application/json',
    };
  } else if (providerName === 'groq') {
    return {
      'Authorization': `Bearer ${getApiKey(providerName)}`,
      'Content-Type': 'application/json',
    };
  }
  throw new Error(`Unknown provider: ${providerName}`);
};

export const buildApiUrl = (endpoint, providerName) => {
  const config = PROVIDER_CONFIGS[providerName];
  const apiKey = getApiKey(providerName);
  
  if (providerName === 'gemini') {
    return `${config.baseUrl}/models/${config.model}:${endpoint}?key=${apiKey}`;
  } else if (providerName === 'groq') {
    return `${config.baseUrl}${endpoint}`;
  }
  
  throw new Error(`Unknown provider: ${providerName}`);
};

const shouldFallback = (error) => {
  const fallbackErrors = [
    'rate_limit', 'quota_exceeded', 'service_unavailable', 'timeout', 
    'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'fetch failed', 
    '429', '500', '502', '503', '504',
  ];
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code?.toLowerCase() || '';
  
  return fallbackErrors.some(e => 
    errorMessage.includes(e.toLowerCase()) || 
    errorCode.includes(e.toLowerCase())
  );
};

export const generateWithFallback = async (prompt, options = {}) => {
  fallbackStats.totalRequests++;

  try {
    logger.debug(`Attempting with primary: ${primaryProvider}`);
    const result = await generateWithProvider(primaryProvider, options);
    fallbackStats.primarySuccesses;

    return {
      ...result,
      provider: primaryProvider,
      fallbackUsed: false,
    };
  } catch (primaryError) {
    fallbackStats.primaryFailures++;
    logger.error(`Primary provider (${primaryProvider}) failed:`, primaryError.message);

    if (!aiConfig.fallbackEnabled) {
      logger.warn('No fallback provider configured');
      throw primaryError;
    }

    if (!shouldFallback(primaryError)) {
      logger.warn('Error not fallback-worthy, throwing original error');
      throw primaryError;
    }

    try {
      logger.warn(`Falling back to: ${fallbackProvider}`);
      fallbackStats.lastFallbackTime = new Date();

      const result = await generateWithProvider(fallbackProvider, prompt, options);
      fallbackStats.fallbackSuccesses++;
      logger.info(`Fallback successful with ${fallbackProvider}`);

      return {
        ...result,
        provider: fallbackProvider,
        fallbackUsed: true,
        primaryError: primaryError.message,
      };
    } catch (fallbackError) {
      fallbackStats.fallbackFailures++;
      logger.error(`Fallback provider (${fallbackProvider}) also failed:`, fallbackError.message);

      const combinedError = new Error(
        `Both providers failed. Primary (${primaryProvider}): ${primaryError.message}. ` +
        `Fallback (${fallbackProvider}): ${fallbackError.message}`
      );
      combinedError.primaryError = primaryError;
      combinedError.fallbackError = fallbackError;
      throw combinedError;
    }
  }
};

async function generateWithGemini(prompt, options) {
  const url = buildApiUrl('generateContent', 'gemini');
  const config = PROVIDER_CONFIGS.gemini;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || globalParams.timeout);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getRequestHeaders('gemini'),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: options.maxTokens || globalParams.maxTokens,
          temperature: options.temperature ?? globalParams.temperature,
          topP: options.topP || globalParams.topP,
          topK: options.topK || globalParams.topK,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    
    if (!response.ok) {
      const error = new Error(data.error?.message || `Gemini API error: ${response.status}`);
      error.code = response.status.toString();
      error.data = data;
      throw error;
    }

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from Gemini');
    }

    return {
      text: data.candidates[0].content.parts[0].text,
      usage: data.usageMetadata,
      model: config.model,
    };
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Gemini request timeout after ${globalParams.timeout}ms`);
    }
    throw error;
  }
}

async function generateWithGroq(prompt, options) {
  const url = buildApiUrl('/chat/completions', 'groq');
  const config = PROVIDER_CONFIGS.groq;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || globalParams.timeout);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getRequestHeaders('groq'),
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || globalParams.maxTokens,
        temperature: options.temperature ?? globalParams.temperature,
        top_p: options.topP || globalParams.topP,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    
    if (!response.ok) {
      const error = new Error(data.error?.message || `Groq API error: ${response.status}`);
      error.code = response.status.toString();
      error.data = data;
      throw error;
    }

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from Groq');
    }

    return {
      text: data.choices[0].message.content,
      usage: data.usage,
      model: config.model,
    };
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Groq request timeout after ${globalParams.timeout}ms`);
    }
    throw error;
  }
}

export const getFallbackStats = () => {
  const total = fallbackStats.totalRequests;
  const successRate = total > 0 
    ? ((fallbackStats.primarySuccesses + fallbackStats.fallbackSuccesses) / total * 100).toFixed(2)
    : 0;
  const fallbackRate = total > 0
    ? (fallbackStats.fallbackSuccesses / total * 100).toFixed(2)
    : 0;

  return {
    ...fallbackStats,
    successRate: `${successRate}%`,
    fallbackRate: `${fallbackRate}%`,
    primaryProvider,
    fallbackProvider,
  };
};

export const resetFallbackStats = () => {
  fallbackStats.totalRequests = 0;
  fallbackStats.primarySuccesses = 0;
  fallbackStats.primaryFailures = 0;
  fallbackStats.fallbackSuccesses = 0;
  fallbackStats.fallbackFailures = 0;
  fallbackStats.lastFallbackTime = null;
};


export const checkAIHealth = async () => {
  const primaryHealth = await testProviderConnection(primaryProvider);
  const fallbackHealth = aiConfig.fallbackEnabled 
    ? await testProviderConnection(fallbackProvider)
    : { available: false, reason: 'Not configured' };

  return {
    primary: {
      provider: primaryProvider,
      model: aiConfig.primary.model,
      ...primaryHealth,
    },
    fallback: aiConfig.fallbackEnabled ? {
      provider: fallbackProvider,
      model: aiConfig.fallback.model,
      ...fallbackHealth,
    } : null,
    fallbackEnabled: aiConfig.fallbackEnabled,
    stats: getFallbackStats(),
  };
};

logger.info(`Primary AI: ${primaryProvider} (${aiConfig.primary.model})`);
if (aiConfig.fallbackEnabled) {
  logger.info(`Fallback AI: ${fallbackProvider} (${aiConfig.fallback.model})`);
} else {
  logger.warn('No fallback provider configured');
}

export default generateWithFallback;