import QuizResult from '../models/quiz-model.js';
import * as CardService from '../../deck/services/card-service.js';
import FlashcardAIService from '../../ai/services/flashcard-ai-service.js';
import { logger } from '../../../shared/utils/logger.js';
import { calculateNextReview, determineCardStatus } from '../../deck/utils/spaced-repetition.js';

export const generateQuizForDeck = async (deckId, userId) => {
    const cards = await CardService.getCardsByDeck(deckId, userId);

    if (cards.length < 1) {
        throw new Error('QUIZ_EMPTY: Deck has no cards to play');
    }

    const quizContent = await FlashcardAIService.generateQuizOptions(cards);

    return {
        deckId,
        totalQuestions: quizContent.length,
        questions: quizContent
    };
};

export const submitQuizResult = async (userId, { deckId, totalQuestions, correctAnswers, details }) => {
    let score = 0;
    if (totalQuestions > 0) {
        score = Math.round((correctAnswers / totalQuestions) * 100);
    }

    const result = await QuizResult.create({
        userId,
        deckId,
        totalQuestions,
        correctAnswers,
        score,
        details
    });

    try {
        const updatePromises = details.map(async (detail) => {
            try {
                const card = await CardService.getCardById(detail.cardId, userId);
                
                const newStudyData = calculateNextReview(
                    card.studyData,
                    detail.isCorrect
                );

                const newStatus = determineCardStatus(
                    card.status,
                    detail.isCorrect,
                    newStudyData.timesStudied
                );


                await CardService.updateStudyData(detail.cardId, userId, newStudyData);

                if (newStatus !== card.status) {
                    await CardService.updateCardStatus(detail.cardId, userId, newStatus);
                }

                logger.debug(`Card ${detail.cardId} updated: status=${newStatus}, timesStudied=${newStudyData.timesStudied}`);
            } catch (error) {
                logger.error(`Failed to update card ${detail.cardId} after quiz: ${error.message}`);
            }
        });

        await Promise.all(updatePromises);
        logger.info(`Updated ${details.length} cards after quiz submission`);
    } catch (error) {
        logger.error(`Error updating cards after quiz: ${error.message}`);
    }

    logger.info(`Quiz submitted for user ${userId}, Score: ${score}`);
    return result;
};

export const getUserQuizHistory = async (userId) => {
    const history = await QuizResult.find({ userId })
        .sort({ createdAt: -1 })
        .populate('deckId', 'name')
        .select('-details')
        .limit(50);
    
        return history;
};

export const getQuizDetail = async (quizId, userId) => {
    const quiz = await QuizResult.findOne({ _id: quizId, userId })
        .populate('deckId', 'name')
        .populate('details.cardId', 'front back');
    
        if (!quiz) {
            throw new Error('QUIZ_NOT_FOUND: Quiz result not found');
        }

        return quiz;
}
