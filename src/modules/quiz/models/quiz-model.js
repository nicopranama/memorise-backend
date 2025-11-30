import mongoose from 'mongoose';

const quizResultSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    deckId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Deck',
        required: true,
        index: true
    },
    totalQuestions: {
        type: Number,
        required: true
    },
    correctAnswers: {
        type: Number,
        required: true
    },
    score: {
        type: Number,
        required: true
    },
    details: [{
        cardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
        isCorrect: Boolean,
        userAnswer: String,
        correctAnswer: String,
        explanation: String
    }]
}, { timestamps: true });

quizResultSchema.index({ userId: 1, createdAt: -1 });
quizResultSchema.index({ deckId: 1, userId: 1 });

const QuizResult = mongoose.models.QuizResult || mongoose.model('QuizResult', quizResultSchema);
export default QuizResult;