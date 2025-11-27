import { BaseAIProvider } from './base-provider.js';
import { getApiKey } from '../../../config/ai.js';
import { logger } from '../../../shared/utils/logger.js';

export class GeminiProvider extends BaseAIProvider {
    constructor(config) {
        const apiKey = getApiKey('gemini');
        super({ ...config, provider: 'gemini' }, apiKey, { logger });
    }

    buildApiUrl(endpoint) {
        let finalEndpoint = endpoint;
        if (endpoint === 'generate') {
            finalEndpoint = 'generateContent';
        }
        return `${this.config.baseUrl}/models/${this.config.model}:${finalEndpoint}?key=${this.apiKey}`;
    }

    getRequestHeaders() {
        return {
            'Content-Type': 'application/json',
        };
    }

    buildRequestBody(prompt, options) {
        if (!prompt || typeof prompt !== 'string') {
            throw new Error('[GeminiProvider] Prompt must be a non-empty string');
        }

        return {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: prompt }],
                },
            ],
            generationConfig: {
                temperature: options.temperature,
                topP: options.topP,
                topK: options.topK,
                maxOutputTokens: options.maxTokens,
            },
            safetySettings: this.config.safetySettings || [],
        };
    }

    buildVisionRequestBody(prompt, imageData, mimeType, options) {
        const parts = [{ text: prompt }];
        
        if (imageData) {
            parts.push({
                inlineData: {
                    data: imageData,
                    mimeType: mimeType || 'image/jpeg'
                }
            });
        }

        return {
            contents: [
                {
                    role: 'user',
                    parts: parts,
                },
            ],
            generationConfig: {
                temperature: options.temperature,
                topP: options.topP,
                topK: options.topK,
                maxOutputTokens: options.maxTokens,
            },
            safetySettings: this.config.safetySettings || [],
        };
    }

    async generateWithVision(prompt, imageBuffer, mimeType, options = {}) {
        this.logGeneration(prompt, { ...options, hasImage: true });
        const merged = this.mergeOptions(options);
        const url = this.buildApiUrl('generateContent');
        const headers = this.getRequestHeaders();
        
        const base64Image = imageBuffer.toString('base64');
        const body = this.buildVisionRequestBody(prompt, base64Image, mimeType, merged);

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
                throw this.handleError(data, response.status);
            }

            const result = this.parseResponse(data);
            return { ...result, provider: this.providerName };
        } catch (err) {
            this.logger.error(`[${this.providerName}] Vision generation failed: ${err.message}`);
            throw err;
        }
    }

    parseResponse(data) {
        if (!data?.candidates?.length) {
            throw new Error('[GeminiProvider] No candidates returned from API');
        }

        const text = data.candidates[0]?.content?.parts?.[0]?.text ||
                     data.candidates?.[0]?.contents?.[0]?.parts?.[0]?.text || 
                     '';

        if (!text) {
            throw new Error('[GeminiProvider] Empty reponse text');
        }

        return {
            text, 
            model: this.config.model,
            usage: {
                promptTokens: data?.usageMetadata?.promptTokenCount || data?.usage?.promptTokens || 0,
                completionTokens: data?.usageMetadata?.candidatesTokenCount || data?.usage?.completionTokens || 0,
                totalTokens: data?.usageMetadata?.totalTokenCount || data?.usage?.totalTokens || 0,
            },
        };
    }

    handleError(data, status = 500) {
        const message = data?.error?.message || `Gemini API Error (${status})`;
        const error = new Error(message);
        error.code = status;
        error.provider = 'gemini';
        error.data = data;
        return error;
    }
}

export default GeminiProvider;