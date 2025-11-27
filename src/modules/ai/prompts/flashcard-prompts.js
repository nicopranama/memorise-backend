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

    Text content:${truncateText(extractedText, 8000)}`;

