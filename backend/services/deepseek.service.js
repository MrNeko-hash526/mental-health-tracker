const { InferenceClient } = require('@huggingface/inference');

class DeepSeekService {
  constructor() {
    this.client = null;
    this.model = "deepseek-ai/DeepSeek-V3.2-Exp";
    this.provider = "novita";
    this.initializeClient();
  }

  initializeClient() {
    if (!process.env.HF_TOKEN) {
      console.log('❌ HF_TOKEN not configured, DeepSeek service unavailable');
      return;
    }

    try {
      this.client = new InferenceClient(process.env.HF_TOKEN);
      console.log('✅ DeepSeek client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize DeepSeek client:', error.message);
    }
  }

  async generateSummary(text, options = {}) {
    try {
      // Mock shortcut for local testing
      if (process.env.DEEPSEEK_MOCK === 'true') {
        return {
          success: true,
          summary: JSON.stringify({
            summary: "Mock summary: consistent progress and steady mood.",
            sentiment: "neutral"
          }),
          sentiment: "neutral",
          provider: "mock"
        };
      }

      // Check if client is available
      if (!this.client) {
        console.log('DeepSeek client not available, using fallback');
        return this.generateFallbackSummary(text);
      }

      console.log(`🤖 Generating DeepSeek summary for text (${String(text).length} chars)`);

      // Sanitize / escape the journal text safely
      const safeText = JSON.stringify(String(text));

      const prompt = `Please analyze the following journal entry and respond with ONLY a JSON object in this exact format:

{"summary": "A brief 2-3 sentence summary", "sentiment": "positive"}

The sentiment must be exactly one of: "positive", "neutral", or "negative"

Journal entry to analyze:
${safeText}

Respond with only the JSON, no other text:`;

      // Basic timeout + retry wrapper
      const callWithTimeout = async () => {
        const timeoutMs = options.timeoutMs || 8000;
        // If the SDK supports timeout options, prefer that — this is a generic wrapper
        const task = this.client.chatCompletion({
          provider: this.provider,
          model: this.model,
          messages: [
            { role: "user", content: prompt }
          ],
          max_tokens: options.max_tokens || 200,
          temperature: typeof options.temperature === 'number' ? options.temperature : 0.3,
          top_p: typeof options.top_p === 'number' ? options.top_p : 0.9
        });

        const timeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('DeepSeek request timed out')), timeoutMs);
        });

        return Promise.race([task, timeout]);
      };

      const maxAttempts = options.retries >= 0 ? options.retries + 1 : 2;
      let lastError = null;
      let chatCompletion = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          chatCompletion = await callWithTimeout();
          break;
        } catch (err) {
          lastError = err;
          console.warn(`DeepSeek attempt ${attempt} failed: ${err.message || err}`);
          if (attempt < maxAttempts) {
            // exponential backoff
            await new Promise(r => setTimeout(r, 300 * Math.pow(2, attempt)));
          }
        }
      }

      if (!chatCompletion || !chatCompletion.choices || !chatCompletion.choices[0] || !chatCompletion.choices[0].message) {
        throw new Error(`Invalid DeepSeek response shape${lastError ? ': ' + lastError.message : ''}`);
      }

      const responseText = String(chatCompletion.choices[0].message.content || '').trim();
      console.log('📨 Raw DeepSeek response:', responseText);

      // Parse the JSON response
      return this.parseResponse(responseText);

    } catch (error) {
      console.error('🚨 DeepSeek AI error:', error.message || error);
      return this.generateFallbackSummary(text, error);
    }
  }

  parseResponse(responseText) {
    try {
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
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('✅ Successfully parsed DeepSeek JSON:', parsed);

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
          sentiment: sentiment,
          provider: 'deepseek',
          success: true
        };
      }

      throw new Error('No valid JSON found in response');

    } catch (parseError) {
      console.error('❌ Failed to parse DeepSeek JSON:', parseError.message);
      console.log('Raw response that failed to parse:', responseText);

      // Manual extraction fallback
      return this.extractManually(responseText);
    }
  }

  extractManually(responseText) {
    console.log('🔧 Using manual extraction for DeepSeek response');

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

    return {
      summary: summary || 'Unable to extract summary from response',
      sentiment: sentiment,
      provider: 'deepseek',
      extracted: true,
      success: true
    };
  }

  generateFallbackSummary(text, error = null) {
    console.log('🔧 Using DeepSeek fallback summary generator');

    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;

    // Enhanced sentiment analysis
    const positiveWords = ['happy', 'good', 'great', 'excellent', 'wonderful', 'amazing', 'love', 'joy', 'excited', 'grateful', 'pleased', 'delighted', 'thrilled', 'optimistic', 'cheerful', 'fantastic', 'awesome', 'brilliant', 'perfect', 'satisfied', 'proud', 'accomplished', 'successful', 'relaxed', 'peaceful'];
    const negativeWords = ['sad', 'bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated', 'stressed', 'worried', 'disappointed', 'upset', 'depressed', 'anxious', 'overwhelmed', 'miserable', 'horrible', 'disgusting', 'annoyed', 'irritated', 'exhausted', 'tired', 'difficult', 'challenging', 'tough'];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

    let sentiment = 'neutral';
    if (positiveCount > negativeCount) sentiment = 'positive';
    else if (negativeCount > positiveCount) sentiment = 'negative';

    const firstSentence = text.split(/[.!?]/)[0].trim();
    const summary = `Journal entry with ${words} words and ${sentences} sentence${sentences === 1 ? '' : 's'}. ${firstSentence.length > 50 ? firstSentence.substring(0, 50) + '...' : firstSentence} ${
      sentiment === 'positive' ? 'Shows generally positive emotions and experiences.' :
      sentiment === 'negative' ? 'Reflects some challenges or difficult emotions.' :
      'Maintains a balanced, neutral tone.'
    }`;

    return {
      summary: summary,
      sentiment: sentiment,
      provider: 'deepseek-fallback',
      error: error ? error.message : null,
      fallback: true,
      success: true,
      analysis: {
        wordCount: words,
        sentenceCount: sentences,
        positiveSignals: positiveCount,
        negativeSignals: negativeCount
      }
    };
  }

  async generateChatResponse(messages, options = {}) {
    try {
      if (!this.client) {
        throw new Error('DeepSeek client not available');
      }

      console.log('🤖 Generating DeepSeek chat response');

      const chatCompletion = await this.client.chatCompletion({
        provider: this.provider,
        model: this.model,
        messages: messages,
        max_tokens: options.max_tokens || 500,
        temperature: options.temperature || 0.7,
        top_p: options.top_p || 0.9
      });

      return {
        success: true,
        message: chatCompletion.choices[0].message.content,
        provider: 'deepseek',
        model: this.model
      };

    } catch (error) {
      console.error('DeepSeek chat error:', error.message);
      return {
        success: false,
        error: error.message,
        provider: 'deepseek'
      };
    }
  }

  // Test the DeepSeek service
  async testService() {
    console.log('🧪 Testing DeepSeek service...');
    
    if (!this.client) {
      return {
        success: false,
        error: 'DeepSeek client not initialized (check HF_TOKEN)',
        provider: 'deepseek'
      };
    }

    try {
      const testText = "Today was a really good day! I accomplished a lot and feel very happy about my progress.";
      
      const start = Date.now();
      const result = await this.generateSummary(testText);
      const duration = Date.now() - start;
      
      return {
        success: result.success && !result.error,
        duration: duration,
        summary: result.summary,
        sentiment: result.sentiment,
        provider: 'deepseek',
        fallback: result.fallback || false
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'deepseek'
      };
    }
  }
}

module.exports = new DeepSeekService();