/**
 * Spaced Repetition Algorithm Helper
 * Based on SM-2 algorithm (Simplified)
 */

/**
 * Calculate next review date and updated study data based on quiz result
 * @param {Object} currentStudyData - Current study data of the card
 * @param {boolean} isCorrect - Whether the answer was correct
 * @returns {Object} Updated study data with nextReview, interval, and easeFactor
 */
export const calculateNextReview = (currentStudyData, isCorrect) => {
  const now = new Date();
  let {
    timesStudied = 0,
    interval = 1,
    easeFactor = 2.5,
    lastStudied = null
  } = currentStudyData || {};

  timesStudied += 1;

  if (isCorrect) {
    if (timesStudied === 1) {
      interval = 1;
    } else if (timesStudied === 2) {
      interval = 3;
    } else {
      interval = Math.round(interval * easeFactor);
    }

    easeFactor = Math.min(2.5, easeFactor + 0.1);
  } else {
    interval = 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  }

  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    timesStudied,
    lastStudied: now,
    nextReview,
    interval,
    easeFactor: Math.round(easeFactor * 100) / 100 
  };
};

/**
 * Determine card status based on current status and quiz performance
 * @param {string} currentStatus - Current status of the card
 * @param {boolean} isCorrect - Whether the answer was correct
 * @param {number} timesStudied - Number of times the card has been studied
 * @returns {string} New status for the card
 */
export const determineCardStatus = (currentStatus, isCorrect, timesStudied) => {
  if (currentStatus === 'not_studied') {
    return isCorrect ? 'learning' : 'not_studied';
  }

  if (currentStatus === 'learning') {
    if (isCorrect && timesStudied >= 3) {
      return 'mastered';
    }

    return 'learning';
  }

  if (currentStatus === 'mastered') {
    if (!isCorrect) {
      return 'learning';
    }

    return 'mastered';
  }

  return currentStatus;
};

