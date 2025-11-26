import aiService from './ai-service.js';
import * as StorageService from '../../file/services/storage-service.js';
import { getFileBuffer } from '../../file/services/storage-service.js';
import { logger } from '../../../shared/utils/logger.js';

class FlashcardAIService {
    async extractTextFromFile(fileId, userId) {
        try {
            const fileMeta = await StorageService.getFileById(fileId, userId);
            const mimeType = fileMeta.contentType;
            const buffer = await getFileBuffer(fileId);
            const isImage = mimeType?.startsWith('image/');
            const isPDF = mimeType === 'application/pdf';

            if (!isImage && !isPDF) {
                throw new Error('FILE_TYPE_NOT_SUPPORTED: Only images and PDFs are supported for OCR');
            }

            const prompt = `Extract all text from this ${isPDF ? 'PDF document' : 'image'}. Return only the extracted text without any additional explanation or formatting. If there's no text, return "No text found in the document."`;

            const result = await this.geminiProvider.generateWithVision(
                prompt,
                buffer,
                mimeType,
                {
                    temperature: 0.1,
                    maxTokens: 4096,
                }
            );
            return result.text;
        } catch (error) {
            logger.error(`[FlashcardAI] OCR failed: ${error.message}`);
            throw new Error(`OCR_FAILED: ${error.message}`);
        }
    }


    async generateDeckTitle(extractedText) {
        try {
            const prompt = `Based on the following text content, generate a concise and descriptive title for a flashcard deck (maximum 50 characters). Return only the title, nothing else. 
            Text content:${extractedText.substring(0, 2000)}`;

            const result = await aiService.generate(prompt, {
                temperature: 0.7,
                maxTokens: 100,
            });

            let title = result.text.trim();
            title = title.replace(/^["']|["']$/g, '');
            title = title.substring(0, 50).trim();

            return title || 'AI Generated Deck';
        } catch (error) {
            logger.error(`[FlashcardAI] Title generation failed: ${error.message}`);
            return 'AI Generated Deck';
        }
    }


    async generateFlashcards(extractedText, format, cardAmount) {
        try {
            const formatType = format === 'definition' ? 'definition/meaning' : 'question/answer';
            
            const prompt = `You are an expert at creating educational flashcards. Based on the following text content, generate exactly ${cardAmount} flashcards in ${formatType} format.
            Requirements:
            - Generate exactly ${cardAmount} flashcards
            - Each flashcard should have a clear front side and back side
            - Front side: ${format === 'definition' ? 'term or concept' : 'question'}
            - Back side: ${format === 'definition' ? 'definition or meaning' : 'answer'}
            - Make sure the content is accurate and educational
            - Keep front side concise (max 100 words)
            - Keep back side informative but concise (max 200 words)
            Return the flashcards in the following JSON format (no markdown, no code blocks, just pure JSON):
            { "cards": [{"front": "front side content", "back": "back side content"}]}

            Text content:${extractedText.substring(0, 8000)}`;

            const result = await aiService.generate(prompt, {
                temperature: 0.7,
                maxTokens: 4096,
            });

            let jsonText = result.text.trim();
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            
            const firstBrace = jsonText.indexOf('{');
            const lastBrace = jsonText.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                jsonText = jsonText.substring(firstBrace, lastBrace + 1);
            }

            const parsed = JSON.parse(jsonText);
            
            if (!parsed.cards || !Array.isArray(parsed.cards)) {
                throw new Error('Invalid response format from AI: "cards" array missing');
            }

            const cards = parsed.cards
                .slice(0, cardAmount)
                .filter(card => card.front && card.back)
                .map(card => ({
                    front: card.front.trim(),
                    back: card.back.trim(),
                }));

            if (cards.length === 0) {
                throw new Error('No valid flashcards generated');
            }

            return cards;
        } catch (error) {
            logger.error(`[FlashcardAI] Flashcard generation failed: ${error.message}`);
            if (error instanceof SyntaxError) {
                throw new Error(`AI_RESPONSE_PARSE_ERROR: Failed to parse AI response. ${error.message}`);
            }
            throw new Error(`FLASHCARD_GENERATION_FAILED: ${error.message}`);
        }
    }


    async generateFlashcardsFromFile(fileId, userId, format, cardAmount) {
        try {
            logger.info(`[FlashcardAI] Starting OCR for file: ${fileId}`);
            const extractedText = await this.extractTextFromFile(fileId, userId);
            
            if (!extractedText || extractedText.trim().length === 0 || extractedText.includes('No text found')) {
                throw new Error('NO_TEXT_EXTRACTED: Could not extract text from the document');
            }

            logger.info(`[FlashcardAI] Generating deck title`);
            const deckTitle = await this.generateDeckTitle(extractedText);

            logger.info(`[FlashcardAI] Generating ${cardAmount} flashcards`);
            const cards = await this.generateFlashcards(extractedText, format, cardAmount);

            return {
                deckTitle,
                cards,
            };
        } catch (error) {
            logger.error(`[FlashcardAI] Full pipeline failed: ${error.message}`);
            throw error;
        }
    }
}

export default new FlashcardAIService();

