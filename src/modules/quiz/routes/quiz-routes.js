import express from 'express';
import { authenticate } from '../../auth/middleware/authenticate.js';
import { validateRequest } from '../../../shared/middleware/validate-request.js'; // <-- Import Middleware
import { 
    startQuiz, 
    submitResult, 
    getHistory, 
    getQuizDetail 
} from '../controllers/quiz-controller.js';
import { 
    startQuizSchema, 
    submitQuizSchema, 
    quizDetailSchema 
} from '../validators/quiz-validator.js'; 

const router = express.Router();

router.use(authenticate);

// 1. Mulai Quiz
router.get(
    '/start/:deckId', 
    validateRequest(startQuizSchema, 'params'), 
    startQuiz
);

// 2. Submit Hasil
router.post(
    '/submit', 
    validateRequest(submitQuizSchema, 'body'), 
    submitResult
);

// 3. List Riwayat 
router.get('/history', getHistory);

// 4. Detail Riwayat 
router.get(
    '/:quizId', 
    validateRequest(quizDetailSchema, 'params'), 
    getQuizDetail
);

export default router;