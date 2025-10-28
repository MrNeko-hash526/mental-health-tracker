const dotenv = require('dotenv');
dotenv.config();

async function testDashboardWithDeepSeek() {
  console.log('🧪 Testing Dashboard AI integration with DeepSeek...\n');

  try {
    const dashboardService = require('./services/dashboard.service');
    const deepseekService = require('./services/deepseek.service');

    console.log('✅ Services loaded');

    // Use a test user id that exists in your DB, or 1 for local dev
    const testUserId = process.env.TEST_USER_ID ? Number(process.env.TEST_USER_ID) : 1;

    // Create sample dashboard data (small, representative)
    const sampleData = {
      goals: [
        { id: 1, title: 'Build morning routine', completed: false, priority: 'high', created_at: new Date().toISOString() },
        { id: 2, title: 'Finish project X', completed: true, priority: 'medium', created_at: new Date().toISOString() }
      ],
      moods: [
        { id: 'm1', score: 4, date: new Date().toISOString(), note: 'Good energy' },
        { id: 'm2', score: 3, date: new Date().toISOString(), note: 'Okay day' }
      ],
      medRuns: [
        { id: 'r1', session_title: '10min calm', started_at: new Date().toISOString(), actual_seconds: 600, completed: true }
      ],
      journalEntries: [
        { id: 'j1', text: 'Felt productive today and made progress on a few tasks.', tags: [], created_at: new Date().toISOString() }
      ]
    };

    console.log('\n🔎 Optionally testing DeepSeek service directly (mock toggle via DEEPSEEK_MOCK=true) ...');
    try {
      const startDS = Date.now();
      const dsResult = await deepseekService.generateSummary('Test prompt for DeepSeek', { max_tokens: 200 });
      const durDS = Date.now() - startDS;
      console.log(`  DeepSeek call took ${durDS}ms`);
      console.log('  DeepSeek provider:', dsResult.provider || 'unknown');
      console.log('  DeepSeek success:', !!dsResult.success);
      if (dsResult.summary) {
        const s = String(dsResult.summary).slice(0, 200);
        console.log('  DeepSeek returned summary (trim):', s);
      }
    } catch (err) {
      console.warn('  DeepSeek direct call failed:', err.message || err);
    }

    console.log('\n🚀 Calling dashboardService.generateAIAnalysis() ...');
    const start = Date.now();
    const analysis = await dashboardService.generateAIAnalysis(testUserId, sampleData);
    const duration = Date.now() - start;

    console.log(`\nDuration: ${duration}ms`);
    console.log('Summary:\n', analysis.summary || '(none)');
    console.log('\nSuggestions:', Array.isArray(analysis.suggestions) ? analysis.suggestions : []);
    console.log('\nInsights:', analysis.insights || {});
    console.log('\nProvider:', analysis.provider || 'n/a');
    console.log('\nConfidence:', analysis.confidence || 'n/a');
    console.log('\nGeneratedAt:', analysis.generatedAt || analysis.timestamp || 'n/a');

    console.log('\n🎯 Dashboard AI integration test completed.');
  } catch (error) {
    console.error('❌ Dashboard AI test failed:', error && error.message ? error.message : error);
    process.exitCode = 1;
  }
}

testDashboardWithDeepSeek().catch(err => {
  console.error('Unhandled error:', err);
  process.exitCode = 1;
});