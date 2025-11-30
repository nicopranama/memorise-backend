import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import { successResponse, createdResponse } from '../../../shared/utils/response-utils.js';
import * as QuizService from '../services/quiz-service.js';

/**
 * GET /api/quiz/start/:deckId
 */
export const startQuiz = asyncHandler(async (req, res) => {
    const { deckId } = req.params;
    const quizData = await QuizService.generateQuizForDeck(deckId, req.user.id);

    return successResponse(res, 200, { data: quizData });
});

/**
 * POST /api/quiz/submit
 */
export const submitResult = asyncHandler(async (req, res) => {
    const result = await QuizService.submitQuizResult(req.user.id, req.body);

    return createdResponse(res, 'Quiz submitted successfully', result);
});

/**
 * GET /api/quiz/history
 */
export const getHistory = asyncHandler(async (req, res) => {
    const history = await QuizService.getUserQuizHistory(req.user.id);

    return successResponse(res, 200, { data: history });
});

/**
 * GET /api/quiz/:quizId
 */
export const getQuizDetail = asyncHandler(async (req, res) => {
    const { quizId } = req.params;
    const detail = await QuizService.getQuizDetail(quizId, req.user.id);

    return successResponse(res, 200, { data: detail });
});