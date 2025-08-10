const { GoogleGenAI } = require('@google/genai');

async function testGemma() {
  const testKey = "AIzaSyCScTTCB7P27I_7AJI25-YA_d6EakBc300"; // Key #2 from our env
  const ai = new GoogleGenAI({ apiKey: testKey });
  
  try {
    console.log('🧪 Testing Gemma 3 API with correct @google/genai package...');
    
    const response = await ai.models.generateContent({
      model: "gemma-3-27b-it",  // Using the model from the web example
      contents: "Hello! Reply with just one word to test API.",
    });
    
    console.log('✅ Gemma 3 API Test SUCCESS!');
    console.log('📝 Response:', response.text);
  } catch (error) {
    console.log('❌ Gemma 3 API Test FAILED:', error.message);
    if (error.status) {
      console.log('Status:', error.status, error.statusText);
    }
    
    // Try with smaller model
    try {
      console.log('🔄 Trying with smaller Gemma model...');
      const response2 = await ai.models.generateContent({
        model: "gemma-2-2b-it",
        contents: "Hello! Reply with just one word to test API.",
      });
      
      console.log('✅ Gemma 2 API Test SUCCESS!');
      console.log('📝 Response:', response2.text);
    } catch (error2) {
      console.log('❌ Gemma 2 API Test ALSO FAILED:', error2.message);
    }
  }
}

testGemma();
