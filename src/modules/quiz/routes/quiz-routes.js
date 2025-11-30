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
    validateRequest(startQuizSchema, 'params'), // Validasi deckId
    startQuiz
);

// 2. Submit Hasil
router.post(
    '/submit', 
    validateRequest(submitQuizSchema, 'body'), // Validasi data skor & jawaban
    submitResult
);

// 3. List Riwayat (Tidak butuh validator khusus, cuma token)
router.get('/history', getHistory);

// 4. Detail Riwayat (Review)
router.get(
    '/:quizId', 
    validateRequest(quizDetailSchema, 'params'), // Validasi quizId
    getQuizDetail
);

export default router;