const { ElevenLabsClient } = require('elevenlabs');

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY || 'test_key',
});

async function testElevenLabs() {
  try {
    console.log('Testing ElevenLabs client...');
    console.log('Client methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(client)));
    
    // Test the generate method signature
    console.log('Testing generate method...');
    
    const audio = await client.generate({
      voice: "JBFqnCBsd6RMkjVDRZzb",
      text: "Hello, this is a test.",
      model_id: "eleven_multilingual_v2"
    });
    
    console.log('Generated audio type:', typeof audio);
    console.log('Audio is iterable:', typeof audio[Symbol.asyncIterator] === 'function');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Error details:', error);
  }
}

testElevenLabs();
