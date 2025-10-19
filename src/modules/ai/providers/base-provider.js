import { aiConfig, AI_PARAMS, getApiKey, getProviderConfig } from '../../../config/ai.js';
import { logger } from '../../../shared/utils/logger.js';

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
        this.logger = options.logger;
        this.providerName = config.provider || 'unknown';
        this.fallbackEnabled = aiConfig.fallbackEnabled;
    }

    async
}