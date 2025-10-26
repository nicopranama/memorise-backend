import express from 'express';
import { authenticate } from '../../auth/middleware/authenticate.js';
import { getHomeData } from '../controllers/deck-controller.js'; 

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/home - Get home data (folders and unassigned decks)
router.get('/', getHomeData);

export default router;
