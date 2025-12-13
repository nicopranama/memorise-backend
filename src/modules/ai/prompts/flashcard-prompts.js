const truncateText = (text = '', limit) => {
    if (!text || typeof text !== 'string') {
        return '';
    }
    return text.length > limit ? text.substring(0, limit) : text;
};

export const buildExtractTextPrompt = ({ isPDF }) =>
    `Extract all text from this ${isPDF ? 'PDF document' : 'image'}. 
    Return only the extracted text without any additional explanation or formatting. 
    If there's no text, return "No text found in the document."`;


export const buildFlashcardsPrompt = ({
    extractedText,
    format,
    formatType,
    cardAmount,
    totalRequestedCards,
    batchNumber,
    totalBatches,
}) =>
    `You are an expert at creating educational flashcards. Based on the following text content, 
    generate exactly ${cardAmount} flashcards in ${formatType} format and propose a concise deck title 
    (maximum 50 characters) that summarizes the material.
    Context:
    - The user requested ${totalRequestedCards} cards in total.
    - This request is batch ${batchNumber} of ${totalBatches}. Ensure these cards stay unique within the deck.
    Requirements:
    - Generate exactly ${cardAmount} flashcards for this batch
    - Each flashcard should have a clear front side and back side
    - Front side: ${format === 'definition' ? 'term or concept' : 'question'}
    - Back side: ${format === 'definition' ? 'definition or meaning' : 'answer'}
    - Make sure the content is accurate and educational
    - Keep front side concise (max 100 words)
    - Keep back side informative but concise (max 200 words)
    Return the response strictly as valid JSON (no markdown, no code blocks) using this structure:
    {
        "deckTitle": "short descriptive deck title",
        "cards": [{"front": "front side content", "back": "back side content"}]
    }

    Text content:${truncateText(extractedText, 30000)}`;


export const buildQuizPrompt = ({ cards }) => {
    const itemsText = cards.map(c =>
        `ID: ${c._id}\nFront (Question): ${c.front}\nBack (Answer): ${c.back}`
    ).join('\n---\n');

    return `You are an expert quiz generator. For each Flashcard provided below, create a multiple-choice question data structure.

    Task for each card:
    1. Generate exactly 3 INCORRECT but plausible options (distractors) that are:
    - Related to the topic but clearly wrong
    - Similar in length and style to the correct answer
    - Realistic enough to be believable but distinct from the correct answer
    2. Generate a concise Explanation (max 2 sentences) explaining why the correct Answer is the right one.

    Input Cards:
    ${itemsText}

    CRITICAL: 
    1. You MUST return a valid JSON array. Use the EXACT ID values provided above (as strings).
    2. Each distractor must be a meaningful, plausible wrong answer - NOT generic placeholders like "Option A".

    Output Requirement:
    Return ONLY a valid JSON array (no markdown, no code blocks, no explanations) using this exact structure:
    [
        {
            "id": "${cards[0]?._id || 'EXACT_ID_FROM_INPUT'}",
            "distractors": ["First wrong but plausible answer", "Second wrong but plausible answer", "Third wrong but plausible answer"],
            "explanation": "Brief explanation why the correct answer is right"
        }
    ]

    IMPORTANT: 
    - Use the EXACT ID string from the input (e.g., "${cards[0]?._id || '69286864d7ead18814744c8d'}")
    - Generate REAL distractors, not placeholders
    - Return valid JSON only, no markdown formatting
    
    CRITICAL JSON RULE:
    - Do NOT excape quotes manually
    - End the response immediately after the final closing bracket ]`;

};

