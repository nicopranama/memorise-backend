import Joi from 'joi';

const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ID format');

export const startQuizSchema = Joi.object({
  deckId: objectId.required()
});

export const quizDetailSchema = Joi.object({
  quizId: objectId.required()
});

export const submitQuizSchema = Joi.object({
  deckId: objectId.required(),
  totalQuestions: Joi.number().integer().min(1).required(),
  correctAnswers: Joi.number().integer().min(0).max(Joi.ref('totalQuestions')).required(),
  details: Joi.array().items(
    Joi.object({
      cardId: objectId.required(),
      isCorrect: Joi.boolean().required(),
      userAnswer: Joi.string().allow('').required(), 
      correctAnswer: Joi.string().required(),
      explanation: Joi.string().allow('').optional() 
    })
  ).min(1).required() 
});