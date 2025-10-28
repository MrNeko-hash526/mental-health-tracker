const dotenv = require('dotenv');
dotenv.config();

const deepseekService = require('./services/deepseek.service');

async function testDeepSeekOnly() {
  console.log('🧪 Testing DeepSeek Service Only...\n');
  
  // Check configuration
  console.log('1. Configuration Check:');
  console.log(`   HF_TOKEN configured: ${!!process.env.HF_TOKEN}`);
  console.log(`   Token length: ${process.env.HF_TOKEN ? process.env.HF_TOKEN.length : 0} characters\n`);
  
  if (!process.env.HF_TOKEN) {
    console.log('❌ HF_TOKEN not found! Please add it to your .env file:');
    console.log('HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    return;
  }
  
  // Test the service
  console.log('2. Testing DeepSeek Service:');
  const serviceTest = await deepseekService.testService();
  
  console.log(`   Status: ${serviceTest.success ? '✅ Working' : '❌ Failed'}`);
  console.log(`   Duration: ${serviceTest.duration || 0}ms`);
  console.log(`   Error: ${serviceTest.error || 'None'}`);
  console.log(`   Fallback: ${serviceTest.fallback || false}\n`);
  
  if (serviceTest.success) {
    console.log('   Sample Results:');
    console.log(`   Summary: ${serviceTest.summary}`);
    console.log(`   Sentiment: ${serviceTest.sentiment}\n`);
  }
  
  // Test with different texts
  if (serviceTest.success) {
    console.log('3. Testing Different Text Types:');
    
    const testTexts = [
      {
        name: 'Positive',
        text: "Today was absolutely amazing! I got a promotion at work and celebrated with friends. I feel so grateful and excited about the future."
      },
      {
        name: 'Negative', 
        text: "I had a really terrible day. Everything went wrong at work and I felt completely overwhelmed and stressed out."
      },
      {
        name: 'Neutral',
        text: "Just a regular day today. Did some work, had lunch, and watched some TV in the evening. Nothing particularly exciting happened."
      }
    ];
    
    for (const test of testTexts) {
      console.log(`\n   ${test.name} Text Test:`);
      console.log(`   Input: ${test.text.substring(0, 60)}...`);
      
      try {
        const start = Date.now();
        const result = await deepseekService.generateSummary(test.text);
        const duration = Date.now() - start;
        
        console.log(`   Duration: ${duration}ms`);
        console.log(`   Summary: ${result.summary}`);
        console.log(`   Sentiment: ${result.sentiment}`);
        console.log(`   Success: ${result.success ? '✅' : '❌'}`);
        console.log(`   Fallback: ${result.fallback ? 'Yes' : 'No'}`);
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
  }
  
  console.log('\n🏁 DeepSeek testing completed!');
}

testDeepSeekOnly().catch(console.error);