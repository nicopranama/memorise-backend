import { BaseAIProvider } from './base-provider.js';
import { getApiKey } from '../../../config/ai.js'; 
import { logger } from '../../../shared/utils/logger.js';

export class GroqProvider extends BaseAIProvider {
    constructor(config) {
        const apiKey = getApiKey('Groq');
        super({ ...config, provider: 'groq' }, apiKey, { logger });
    }

    buildApiUrl(endpoint) {
        return `${this.config.baseUrl}/${endpoint}`;
    }

    getRequestHeaders() {
        return {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
        };
    }

    buildRequestBody(prompt, options) {
        if (!prompt || typeof prompt !== 'string') {
            throw new Error('[GroqProvider] Prompt must be a non-empty string');
        }

        return {
            model: this.config.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: options.temperature,
            top_p: options.topP,
            max_tokens: options.maxTokens,
        };
    }
    
    parseResponse(data) {
        const text = data?.choices?.[0]?.message?.content || '';
        if (!text) {
            throw new Error('[GroqProvider] Empty response from API');
        }

        return {
            text,
            model: data?.model || this.config.model,
            usage: {
                promptTokens: data?.usage?.prompt_tokens || 0,
                completionTokens: data?.usage?.completion_tokens || 0,
                totalTokens: data?.usage?.total_tokens || 0,
            },
        };
    }

    handleError(data, status = 500) {
        const message = data?.error?.message || `Groq API Error (${status})`;
        const error = new Error(message);
        error.code = status;
        error.provider = 'groq';
        error.data = data;
        return error;
    }
}

export default GroqProvider;