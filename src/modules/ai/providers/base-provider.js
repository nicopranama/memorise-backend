import { aiConfig, AI_PARAMS, getApiKey, getProviderConfig } from '../../../config/ai.js';
import { logger as defaultLogger } from '../../../shared/utils/logger.js';

export class BaseAIProvider {
    constructor(config, apiKey, options = {}) {
        if (new.target === BaseAIProvider) {
            throw new Error('BaseAIProvider is abstract and cannot be instantiated directly');
        }
        if (!config || !config.baseUrl || !config.model) {
            throw new Error('Invalid provider configuration: baseUrl and model are required');
        }
        if(!apiKey) {
            throw new Error('API key is required');
        }

        this.config = config;
        this.apiKey = apiKey;
        this.logger = options.logger || defaultLogger;
        this.providerName = config.provider || 'unknown';
        this.fallbackEnabled = aiConfig.fallbackEnabled;
    }

    async generate(prompt, options = {}, isFallback = false) {
        this.logGeneration(prompt, options);
        const merged = this.mergeOptions(options);
        const url = this.buildApiUrl('generate');
        const headers = this.getRequestHeaders();
        const body = this.buildRequestBody(prompt, merged);

        try {
            await this.checkRateLimit();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), merged.timeout);
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(`${this.providerName} API Error: ${data?.error?.message || data?.message || 'Unknown error'}`);
            }

            const result = this.parseResponse(data);
            return { ...result, provider: this.providerName };
        } catch (err) {
            this.logger.error(`[${this.providerName}] Generation failed: ${err.message}`);

            if (!isFallback && this.fallbackEnabled && aiConfig.fallback) {
                const { provider } = aiConfig.fallback;
                this.logger.warn(`[${this.providerName}] Switching to fallback provider: ${provider}`);

                const { default: ProviderClass } = await import (`./${provider}-provider.js`);
                const fallbackProvider = new ProviderClass(
                    getProviderConfig(provider),
                    getApiKey(provider)
                );

                return fallbackProvider.generate(prompt, options, true);
            }

            throw err;
        }
    }

    buildRequestBody(prompt, options) {
        throw new Error(`${this.providerName}: buildRequestBody() must be implemented`);
    }

    parseResponse(data) {
        throw new Error(`${this.providerName}: parseResponse() must be implemented`);
    }

    buildApiUrl(endpoint) {
        return `${this.config.baseUrl}/${endpoint}`;
    }

    getRequestHeaders() {
        return {
            'Content-Type': 'application/json',
        };
    }

    async checkRateLimit() {
        const { requestsPerMinute } = this.config.rateLimit || {};
        if (requestsPerMinute) {
            this.logger.debug(`[${this.providerName}] Rate limit check`, { requestsPerMinute });
        }
    }

    mergeOptions(options = {}) {
        return {
            maxTokens: options.maxTokens || this.config.maxTokens || AI_PARAMS.maxTokens,
            temperature: options.temperature ?? this.config.temperature ?? AI_PARAMS.temperature,
            topP: options.topP || this.config.topP || AI_PARAMS.topP,
            topK: options.topK || this.config.topK || AI_PARAMS.topK,
            timeout: options.timeout || this.config.timeout || AI_PARAMS.timeout,
        };
    }

    logGeneration(prompt, options) {
        this.logger.debug(`[${this.providerName}] Generating`, {
            promptLength: prompt?.length,
            model: this.config.model,
            temperature: options.temperature,
        });
    }
}

export default BaseAIProvider;