import { BaseAIProvider } from './base-provider.js';
import { getApiKey } from '../../../config/ai.js'; 
import { logger } from '../../../shared/utils/logger.js';

export class GroqProvider extends BaseAIProvider {
    constructor(config) {
        const apiKey = getApiKey('groq');
        super({ ...config, provider: 'groq' }, apiKey, { logger });
    }

    buildApiUrl(endpoint) {
        let finalEndpoint = endpoint;
        if (endpoint === 'generate') {
            finalEndpoint = 'chat/completions';
        }
        return `${this.config.baseUrl}/${finalEndpoint}`;
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
    
    async generateWithVision(prompt, imageBuffer, mimeType, options = {}) {
        const visionModel = 'llama-3.2-11b-vision-preview';
        this.logGeneration(prompt, {
            ...options,
            model: visionModel,
            hasImage: true
        });

        const url = this.buildApiUrl('chat/completions');
        const headers = this.getRequestHeaders();

        const body = {
            model: visionModel,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType};base64,${imageBuffer.toString('base64')}`
                            }
                        }
                    ]
                }
            ],
            temperature: options.temperature,
            max_tokens: options.maxTokens || 1024,
            top_p: options.topP
        };

        try {
            await this.checkRateLimit();

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                throw this.handleError(data, response.status);
            }

            return this.parseResponse(data);
        } catch (error) {
            this.logger.error(`[GroqProvider] Vision generation failed: ${err.message}`);
            throw error;
        }
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