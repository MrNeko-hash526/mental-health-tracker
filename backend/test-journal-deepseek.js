const dotenv = require('dotenv');
dotenv.config();

async function testJournalWithDeepSeek() {
  console.log('🧪 Testing Journal Service with DeepSeek Integration...\n');
  
  try {
    const journalService = require('./services/journal.service');
    
    console.log('✅ Journal service loaded successfully');
    
    // Test the generateSummaryForEntry function directly (if possible)
    console.log('\n📝 Testing journal summary generation...');
    
    // Create a test journal entry scenario
    const testEntries = [
      {
        text: "Today was such an incredible day! I finally got the job I've been dreaming about. The interview went perfectly and they offered me the position on the spot. I celebrated with my family and we had dinner at my favorite restaurant. I feel so grateful and excited about this new chapter in my life!",
        expectedSentiment: 'positive'
      },
      {
        text: "I'm feeling really down today. Work has been stressful and I made a big mistake on an important project. My manager wasn't happy and I feel like I'm failing at everything. I just want to stay in bed and not deal with anything.",
        expectedSentiment: 'negative'
      },
      {
        text: "Had a pretty normal day today. Went to work, had some meetings, grabbed lunch with a colleague. Nothing too exciting happened but nothing bad either. Just a regular Tuesday.",
        expectedSentiment: 'neutral'
      }
    ];
    
    for (let i = 0; i < testEntries.length; i++) {
      const entry = testEntries[i];
      console.log(`\n--- Test Entry ${i + 1} (Expected: ${entry.expectedSentiment}) ---`);
      console.log(`Text: ${entry.text.substring(0, 80)}...`);
      
      try {
        // Test the DeepSeek service directly with journal text
        const deepseekService = require('./services/deepseek.service');
        
        const start = Date.now();
        const result = await deepseekService.generateSummary(entry.text);
        const duration = Date.now() - start;
        
        console.log(`Duration: ${duration}ms`);
        console.log(`Summary: ${result.summary}`);
        console.log(`Sentiment: ${result.sentiment}`);
        console.log(`Expected: ${entry.expectedSentiment}`);
        console.log(`Match: ${result.sentiment === entry.expectedSentiment ? '✅' : '❓'}`);
        console.log(`Success: ${result.success ? '✅' : '❌'}`);
        console.log(`Provider: ${result.provider}`);
        
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
    
    console.log('\n🎯 Journal service integration test completed!');
    
  } catch (error) {
    console.error('❌ Journal service test failed:', error.message);
  }
}

testJournalWithDeepSeek().catch(console.error);