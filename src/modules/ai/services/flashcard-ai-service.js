import aiService from './ai-service.js';
import mammoth from 'mammoth';
import * as StorageService from '../../file/services/storage-service.js';
import { getFileBuffer } from '../../file/services/storage-service.js';
import { logger } from '../../../shared/utils/logger.js';
import {
    buildExtractTextPrompt,
    buildFlashcardsPrompt,
    buildQuizPrompt
} from '../prompts/flashcard-prompts.js';

const MAX_CARDS_PER_REQUEST = 25;
const delay = (ms) => new Promise ((resolve) => setTimeout(resolve, ms));

class FlashcardAIService {
    _ensureBuffer(data) {
        if (Buffer.isBuffer(data)) {
            return data;
        }
        if (data instanceof Uint8Array) {
            return Buffer.from(data);
        }
        if (data && data.type === 'Buffer' && Array.isArray(data.data)) {
            return Buffer.from(data.data);
        }
        if (data instanceof ArrayBuffer) {
            return Buffer.from(data);
        }
        try {
            return Buffer.from(data);
        } catch (e) {
            throw new Error(`INVALID_BUFFER_TYPE: Received ${typeof data}`);
        }
    }

    async extractTextFromFile(fileId, userId) {
        try {
            const fileMeta = await StorageService.getFileById(fileId, userId);
            const mimeType = fileMeta.contentType;
            const rawData = await getFileBuffer(fileId);
            const buffer = this._ensureBuffer(rawData);
            const isImage = mimeType?.startsWith('image/');
            const isPDF = mimeType === 'application/pdf';
            const isDocx = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

            if (isDocx) {
                logger.info(`[FlashcardAI] Extracting text from DOCX locally: ${fileId}`);

                if (buffer.length === 0) {
                    throw new Error('DOCX file is empty');
                }

                try {
                    const result = await mammoth.extractRawText({ buffer: buffer });
                    const text = result.value.trim();
                    
                    if (result.messages && result.messages.length > 0) {
                        logger.debug(`[FlashcardAI] Mammoth messages: ${JSON.stringify(result.messages)}`);
                    }

                    if (!text) throw new Error('No text found in DOCX document');
                    return text; 
                } catch (err) {
                    throw new Error(`DOCX_EXTRACTION_FAILED: ${err.message}`);
                }
            }

            if (isImage || isPDF) {
                logger.info(`[FlashcardAI] Sending Image/PDF to Gemini Vision: ${fileId}`);
                
                const prompt = buildExtractTextPrompt({ isPDF });

                const result = await aiService.generateWithVision(
                    prompt,
                    buffer, 
                    mimeType,
                    {
                        temperature: 0.1,
                        maxTokens: 4096,
                    }
                );
                return result.text;
            }

            throw new Error('FILE_TYPE_NOT_SUPPORTED: Only images, PDFs, and DOCX are supported');

        } catch (error) {
            logger.error(`[FlashcardAI] OCR failed: ${error.message}`);
            if (error.message.includes('FILE_TYPE') || error.message.includes('DOCX_')) {
                throw error;
            }

            throw new Error(`OCR_FAILED: ${error.message}`);
        }
    }

    async generateFlashcards(extractedText, format, cardAmount) {
        try {
            logger.info(`[FlashcardAI] Extracted Text Length: ${extractedText.length} characters`);

            if (!extractedText || extractedText.length < 50) {
                throw new Error('Text extracted is too short or empty');
            }

            const formatType = format === 'definition' ? 'definition/meaning' : 'question/answer';
            const batches = this._splitIntoBatches(cardAmount);

            let resolvedDeckTitle = '';
            const aggregatedCards = [];

            for (let index = 0; index < batches.length; index += 1) {
                if (index > 0) {
                    logger.info(`[FlashcardAI] Rate limit guard: Cooling down for 4 seconds...`);
                    await delay(2000);
                }

                const batchSize = batches[index];
                const prompt = buildFlashcardsPrompt({
                    extractedText,
                    format,
                    formatType,
                    cardAmount: batchSize,
                    totalRequestedCards: cardAmount,
                    batchNumber: index + 1,
                    totalBatches: batches.length,
                });

                const result = await aiService.generate(prompt, {
                    temperature: 0.7,
                    maxTokens: 8192,
                    timeout: 120000,
                });

                const { deckTitle, cards } = this._parseFlashcardResponse(result.text, batchSize);

                if (!resolvedDeckTitle && deckTitle) {
                    resolvedDeckTitle = deckTitle;
                }

                aggregatedCards.push(...cards);
            }

            const normalizedTitle = (resolvedDeckTitle || 'AI Generated Deck')
                .trim()
                .replace(/^["']|["']$/g, '')
                .substring(0, 50)
                .trim();

            const trimmedCards = aggregatedCards.slice(0, cardAmount);

            if (trimmedCards.length === 0) {
                throw new Error('No valid flashcards generated');
            }

            return {
                deckTitle: normalizedTitle || 'AI Generated Deck',
                cards: trimmedCards,
            };
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

            logger.info(`[FlashcardAI] Generating deck title + ${cardAmount} flashcards (batched)`);
            const { deckTitle, cards } = await this.generateFlashcards(extractedText, format, cardAmount);

            return {
                deckTitle,
                cards,
            };
        } catch (error) {
            logger.error(`[FlashcardAI] Full pipeline failed: ${error.message}`);
            throw error;
        }
    }

    _splitIntoBatches(totalCards) {
        if (totalCards <= 0) {
            throw new Error('Card amount must be greater than zero');
        }

        const batches = [];
        let remaining = totalCards;

        while (remaining > 0) {
            const batchSize = Math.min(MAX_CARDS_PER_REQUEST, remaining);
            batches.push(batchSize);
            remaining -= batchSize;
        }

        return batches;
    }

    _parseFlashcardResponse(rawText, expectedCards) {
        let jsonText = rawText?.trim() || '';
        jsonText = jsonText.replace(/```json\n?/gi, '').replace(/```\n?/g, '');

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
            .filter(card => card?.front && card?.back)
            .slice(0, expectedCards)
            .map(card => ({
                front: card.front.trim(),
                back: card.back.trim(),
            }));

        if (cards.length === 0) {
            throw new Error('No valid flashcards generated');
        }

        const deckTitle = (parsed.deckTitle || '').trim();

        return { deckTitle, cards };
    }

    async generateQuizOptions(cards) {
        const BATCH_SIZE = 25;
        const batches = [];

        for (let i = 0; i < cards.length; i += BATCH_SIZE) {
            batches.push(cards.slice(i, i + BATCH_SIZE));
        }

        let quizData = [];

        logger.info(`[QuizAI] Generating quiz for ${cards.length} cards in ${batches.length} batches`);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            let result;
            try {
                const prompt = buildQuizPrompt({ cards: batch });

                result = await aiService.generate(prompt, {
                    temperature: 0.8,
                    maxTokens: 4096,
                    timeout: 60000
                });

                let jsonText = result.text.trim();
                jsonText = jsonText.replace(/```json\n?/gi, '').replace(/```\n?/g, '');

                const firstBracket = jsonText.indexOf('[');
                const lastBracket = jsonText.lastIndexOf(']');

                if (firstBracket !== -1 && lastBracket !== -1) {
                    jsonText = jsonText.substring(firstBracket, lastBracket + 1);
                    const parsedBatch = JSON.parse(jsonText);

                    if (Array.isArray(parsedBatch) && parsedBatch.length > 0) {
                        logger.info(`[QuizAI] Successfully parsed ${parsedBatch.length} quiz items from batch ${i + 1}`);
                        quizData = quizData.concat(parsedBatch);
                    } else {
                        logger.warn(`[QuizAI] Batch ${i + 1} returned empty or invalid array`);
                    }
                } else {
                    logger.warn(`[QuizAI] Batch ${i + 1} response does not contain valid JSON array`);
                    logger.debug(`[QuizAI] Response preview: ${result.text.substring(0, 200)}...`);
                }

                if (i < batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

            } catch (error) {
                logger.error(`[QuizAI] Failed batch ${i + 1} generation: ${error.message}`);
                if (result && result.text) {
                    logger.debug(`[QuizAI] Raw AI response: ${result.text.substring(0, 500)}...`);
                }
            }
        }

        logger.info(`[QuizAI] Total quiz data collected: ${quizData.length} items for ${cards.length} cards`);

        const finalQuiz = cards.map((card, index) => {
            const cardIdStr = card._id.toString();
            let aiResult = quizData.find(q => q.id === cardIdStr);
            
            if (!aiResult) {
                aiResult = quizData.find(q => 
                    q.id && (
                        q.id.toString() === cardIdStr ||
                        q.id.toString().toLowerCase() === cardIdStr.toLowerCase()
                    )
                );
            }

            let distractors;
            let explanation;
            
            if (aiResult && Array.isArray(aiResult.distractors) && aiResult.distractors.length >= 3) {
                distractors = aiResult.distractors.slice(0, 3);
                explanation = aiResult.explanation || `The correct answer is: ${card.back}`;
            } else {
                logger.warn(`[QuizAI] No valid AI result for card ${cardIdStr}, generating fallback distractors`);
                const otherCards = cards.filter((c, idx) => idx !== index && c.back !== card.back);
                const fallbackDistractors = [];
                
                for (let i = 0; i < 3 && i < otherCards.length; i++) {
                    const randomCard = otherCards[Math.floor(Math.random() * otherCards.length)];
                    if (randomCard && randomCard.back && !fallbackDistractors.includes(randomCard.back)) {
                        fallbackDistractors.push(randomCard.back);
                    }
                }
                
                while (fallbackDistractors.length < 3) {
                    fallbackDistractors.push(`Option ${String.fromCharCode(65 + fallbackDistractors.length)}`);
                }
                
                distractors = fallbackDistractors.slice(0, 3);
                explanation = `The correct answer is: ${card.back}`;
            }

            const allOptions = [card.back, ...distractors];
            const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);

            return {
                cardId: card._id,
                question: card.front,
                correctAnswer: card.back,
                options: shuffledOptions,
                explanation: explanation
            };
        });

        return finalQuiz;
    }
}

export default new FlashcardAIService();

