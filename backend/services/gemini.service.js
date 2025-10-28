// Fallback version without requiring the actual package
async function generateSummary(text, options = {}) {
  try {
    // Check if Gemini is available
    if (!process.env.GEMINI_API_KEY) {
      console.log('GEMINI_API_KEY not configured, using fallback');
      return {
        summary: 'AI summary unavailable - API key not configured',
        sentiment: 'neutral',
        error: 'API key not configured'
      };
    }

    // Import the correct package
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Use known working model names based on current Gemini API
    const modelNames = [
      'gemini-1.5-flash',
      'gemini-1.5-pro', 
      'gemini-pro',
      'gemini-1.0-pro',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro-latest'
    ];
    
    let model = null;
    let modelName = null;
    
    // Try each model until one works
    for (const name of modelNames) {
      try {
        console.log(`Trying model: ${name}`);
        model = genAI.getGenerativeModel({ model: name });
        
        // Quick test to see if model responds
        const testResult = await model.generateContent('test');
        const testResponse = await testResult.response;
        const testText = await testResponse.text(); // This will throw if the model doesn't work
        
        modelName = name;
        console.log(`✅ Successfully using model: ${modelName}`);
        break;
      } catch (err) {
        console.log(`❌ Model ${name} failed: ${err.message}`);
        continue;
      }
    }
    
    if (!model || !modelName) {
      throw new Error('No suitable Gemini model found. Please check your API key and ensure the Generative Language API is enabled.');
    }
    
    // Updated prompt for better results
    const prompt = `Please analyze the following journal entry and respond with ONLY a JSON object in this exact format:

{"summary": "A brief 2-3 sentence summary", "sentiment": "positive"}

The sentiment must be exactly one of: "positive", "neutral", or "negative"

Journal entry to analyze:
"${text}"

Respond with only the JSON, no other text:`;

    console.log(`Generating AI summary for text (${text.length} chars) using: ${modelName}`);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text().trim();
    
    console.log('Raw Gemini response:', responseText);
    
    // Clean up the response - remove markdown formatting if present
    let cleanedResponse = responseText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .replace(/^[^{]*/, '')  // Remove anything before the first {
      .replace(/[^}]*$/, '')  // Remove anything after the last }
      .trim();
    
    // Find JSON in the response
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('✅ Successfully parsed JSON:', parsed);
        
        // Validate and clean the response
        const validSentiments = ['positive', 'neutral', 'negative'];
        let sentiment = parsed.sentiment ? parsed.sentiment.toLowerCase() : 'neutral';
        
        if (!validSentiments.includes(sentiment)) {
          // Try to extract sentiment from the summary text
          const summaryLower = (parsed.summary || '').toLowerCase();
          if (summaryLower.includes('positive') || summaryLower.includes('good') || summaryLower.includes('happy')) {
            sentiment = 'positive';
          } else if (summaryLower.includes('negative') || summaryLower.includes('bad') || summaryLower.includes('sad')) {
            sentiment = 'negative';
          } else {
            sentiment = 'neutral';
          }
        }
        
        return {
          summary: parsed.summary || 'Summary not available',
          sentiment: sentiment
        };
        
      } catch (parseError) {
        console.error('❌ Failed to parse JSON:', parseError.message);
        console.log('Raw response that failed to parse:', responseText);
      }
    }
    
    // Fallback: manual extraction
    console.log('🔧 Using fallback extraction method');
    
    let summary = null;
    let sentiment = 'neutral';
    
    // Try to extract summary from text
    const lines = responseText.split('\n').filter(line => line.trim());
    for (const line of lines) {
      if (line.toLowerCase().includes('summary') && line.includes(':')) {
        summary = line.split(':').slice(1).join(':').trim().replace(/['"]/g, '');
      }
    }
    
    // Extract sentiment
    const lowerResponse = responseText.toLowerCase();
    if (lowerResponse.includes('positive')) sentiment = 'positive';
    else if (lowerResponse.includes('negative')) sentiment = 'negative';
    else if (lowerResponse.includes('neutral')) sentiment = 'neutral';
    
    // If no summary found, create a basic one
    if (!summary) {
      const firstSentence = text.split(/[.!?]/)[0].trim();
      summary = `Entry about: ${firstSentence.length > 50 ? firstSentence.substring(0, 50) + '...' : firstSentence}`;
    }
    
    return {
      summary: summary || 'Unable to generate summary',
      sentiment: sentiment
    };
    
  } catch (error) {
    console.error('🚨 Gemini AI error:', error.message);
    
    // Enhanced fallback with basic NLP
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
    
    // More comprehensive sentiment analysis
    const positiveWords = ['happy', 'good', 'great', 'excellent', 'wonderful', 'amazing', 'love', 'joy', 'excited', 'grateful', 'pleased', 'delighted', 'thrilled', 'optimistic', 'cheerful'];
    const negativeWords = ['sad', 'bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated', 'stressed', 'worried', 'disappointed', 'upset', 'depressed', 'anxious', 'overwhelmed', 'miserable'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    let sentiment = 'neutral';
    if (positiveCount > negativeCount) sentiment = 'positive';
    else if (negativeCount > positiveCount) sentiment = 'negative';
    
    // Create a more intelligent fallback summary
    const firstSentence = text.split(/[.!?]/)[0].trim();
    const summary = `Entry with ${words} words describing ${firstSentence.length > 40 ? firstSentence.substring(0, 40) + '...' : firstSentence}. ${
      sentiment === 'positive' ? 'Generally positive tone.' :
      sentiment === 'negative' ? 'Generally negative tone.' :
      'Neutral tone.'
    }`;
    
    return {
      summary: summary,
      sentiment: sentiment,
      error: error.message,
      fallback: true
    };
  }
}

module.exports = {
  generateSummary
};