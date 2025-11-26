import { aiConfig } from '../../../config/ai.js';
import { GeminiProvider } from '../providers/gemini-provider.js';
import { GroqProvider } from '../providers/groq-provider.js';
import { logger } from '../../../shared/utils/logger.js';

class AIService {
    constructor() {
        this.providers = {};

        try {
            if (aiConfig.primary) {
                this.providers.gemini = new GeminiProvider(
                    aiConfig.primary.provider === 'gemini'
                        ? aiConfig.primary
                        : aiConfig.fallback || aiConfig.primary
                );
            }
            logger.debug('Gemini provider initialized');
        } catch (error) {
            logger.warn(`Gemini provider not initialized: ${error.message}`);
        }

        try {
            if (aiConfig.primary) {
                this.providers.groq = new GroqProvider(
                    aiConfig.primary.provider === 'groq'
                        ? aiConfig.primary
                        : aiConfig.fallback || aiConfig.primary
                );
            }
            logger.debug('Groq provider initialized');
        } catch (error) {
            logger.warn(`Groq provider not initialized: ${error.message}`);
        }

        this.stats = {
            totalRequests: 0,
            primarySuccesses: 0,
            primaryFailures: 0,
            fallbackSuccesses: 0,
            fallbackFailures: 0,
            lastFallbackTime: null,
            providerUsage: {
                gemini: 0,
                groq: 0,
            },
        };

        logger.info('AI Service initialized');
    }

    async generate(prompt, options = {}) {
        this.stats.totalRequests++;

        const primaryProvider = aiConfig.primary.provider;
        const fallbackProvider = aiConfig.fallback?.provider;

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            throw new Error('Prompt must be a non-empty string');
        }

        try {
            logger.debug(`Generating with primary provider: ${primaryProvider}`);

            const provider = this.providers[primaryProvider];
            if (!provider) {
                throw new Error(`Provider not initialized: ${primaryProvider}`);
            }

            const result = await provider.generate(prompt, options);

            this.stats.primarySuccesses++;
            this.stats.providerUsage[primaryProvider]++;

            return {
                ...result,
                provider: primaryProvider,
                fallbackUsed: false,
                timestamp: new Date().toISOString(),
            };

        } catch (primaryError) {
            this.stats.primaryFailures++;
            logger.error(`Primary provider (${primaryProvider}) failed: ${primaryError.message}`, {
                code: primaryError.code,
            });

            if (!aiConfig.fallbackEnabled) {
                logger.warn('Fallback is not enabled');
                throw primaryError;
            }

            if (!this.shouldFallback(primaryError)) {
                logger.warn('Error is not eligible for fallback; rethrowing');
                throw primaryError;
            }

            try {
                logger.warn(`Attempting fallback to: ${fallbackProvider}`);
                this.stats.lastFallbackTime = new Date();

                const provider = this.providers[fallbackProvider];
                if (!provider) {
                    throw new Error(`Fallback provider not initialized: ${fallbackProvider}`);
                }

                const result = await provider.generate(prompt, options);

                this.stats.fallbackSuccesses++;
                this.stats.providerUsage[fallbackProvider]++;

                logger.info(`Fallback successful with ${fallbackProvider}`);

                return {
                    ...result,
                    provider: fallbackProvider,
                    fallbackUsed: true,
                    primaryError: primaryError.message,
                    timestamp: new Date().toISOString(),
                };
            } catch (fallbackError) {
                this.stats.fallbackFailures++;
                logger.error(
                    `Fallback provider (${fallbackProvider}) also failed: ${fallbackError.message}`
                );

                const combinedError = new Error(
                    `Both AI providers failed:\n` +
                        `Primary (${primaryProvider}): ${primaryError.message}\n` +
                        `Fallback (${fallbackProvider}): ${fallbackError.message}`
                );
                combinedError.code = 'BOTH_PROVIDERS_FAILED';
                combinedError.primaryError = primaryError;
                combinedError.fallbackError = fallbackError;

                throw combinedError;
            }
        }
    }

    shouldFallback(error) {
        const fallbackKeywords = [
            'rate_limit',
            'rate limit',
            'quota',
            'timeout',
            'service_unavailable',
            'unavailable',
            '429',
            '500',
            '502',
            '503',
            '504',
            'TIMEOUT',
            'ECONNREFUSED',
            'ETIMEDOUT',
            'ENOTFOUND',
        ];

        const msg = (error.message || '').toLowerCase();
        const code = (error.code || '').toLowerCase();

        const isEligible = fallbackKeywords.some(
            (word) => msg.includes(word) || code.includes(word)
        );

        logger.debug(`Should fallback: ${isEligible}`, { message: msg, code });
        return isEligible;
    }

    async generateWithVision(prompt, imageBuffer, mimeType, options = {}) {
        const primaryProviderName = aiConfig.primary.provider;
        const fallbackProviderName = aiConfig.fallback?.provider;
        const fallbackEnabled = aiConfig.fallbackEnabled;

        try {
            logger.debug(`Generating vision with primary provider: ${primaryProviderName}`);
            return await this._executeVision(primaryProviderName, prompt, imageBuffer, mimeType, options);
        } catch (primaryError) {
            logger.error(`Primary provider (${primaryProviderName}) vision failed: ${primaryError.message}`);

            if (!fallbackEnabled || !fallbackProviderName) {
                throw primaryError;
            }

            try {
                logger.warn(`Attempting vision fallback to: ${fallbackProviderName}`);
                const result = await this._executeVision(fallbackProviderName, prompt, imageBuffer, mimeType, options);
                return {
                    ...result,
                    fallbackUsed: true
                };
            } catch (fallbackError) {
                logger.error(`Fallback provider (${fallbackProviderName}) also failed: ${fallbackError.message}`);
                throw new Error(
                    `Vision generation failed on both providers.\n` +
                    `Primary (${primaryProviderName}): ${primaryError.message}\n` +
                    `Fallback (${fallbackProviderName}): ${fallbackError.message}`
                );
            }
        }
    }

    async _executeVision(providerName, prompt, imageBuffer, mimeType, options) {
        const provider = this.providers[providerName];

        if (!provider) {
            throw new Error(`Provider ${providerName} not initialized`);
        }

        if (typeof provider.generateWithVision !== 'function') {
            throw new Error(`Provider ${providerName} does not support Vision capabilities`);
        }

        const result = await provider.generateWithVision(prompt, imageBuffer, mimeType, options);
        return {
            ...result,
            provider: providerName
        };
    }

    getStats() {
        const total = this.stats.totalRequests;
        const totalSuccesses = this.stats.primarySuccesses + this.stats.fallbackSuccesses;

        return {
            ...this.stats,
            successRate:
                total > 0 ? `${((totalSuccesses / total) * 100).toFixed(2)}%` : '0%',
            fallbackRate:
                total > 0
                    ? `${((this.stats.fallbackSuccesses / total) * 100).toFixed(2)}%`
                    : '0%',
            primaryProvider: aiConfig.primary.provider,
            fallbackProvider: aiConfig.fallback?.provider || 'none',
        };
    }

    resetStats() {
        this.stats = {
            totalRequests: 0,
            primarySuccesses: 0,
            primaryFailures: 0,
            fallbackSuccesses: 0,
            fallbackFailures: 0,
            lastFallbackTime: null,
            providerUsage: { gemini: 0, groq: 0 },
        };

        logger.info('AI Service statistics reset');
    }

    async checkHealth() {
        const results = {
            primary: await this.testProvider(aiConfig.primary.provider),
            fallback: aiConfig.fallbackEnabled
                ? await this.testProvider(aiConfig.fallback.provider)
                : { available: false, reason: 'Not configured' },
            fallbackEnabled: aiConfig.fallbackEnabled,
            stats: this.getStats(),
        };

        return results;
    }

    async testProvider(providerName) {
        try {
            const provider = this.providers[providerName];
            if (!provider) {
                return {
                    provider: providerName,
                    available: false,
                    reason: 'Provider not initialized',
                };
            }

            const result = await provider.generate('Say "OK"', {
                maxTokens: 10,
                temperature: 0,
            });

            return {
                provider: providerName,
                model: result.model,
                available: true,
                responseTime: 'OK',
            };
        } catch (error) {
            logger.debug(`[AIService] ${providerName} health check failed: ${error.message}`);
            return {
                provider: providerName,
                available: false,
                reason: error.message,
            };
        }
    }
}

export default new AIService();
