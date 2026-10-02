require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);
const axios = require('axios');
const { WORKER_URL } = require('../config');

const router = express.Router();

let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log('✅ Gemini AI initialized');
} else {
  console.log('⚠️ No GEMINI_API_KEY provided');
}

/**
 * Generate summary text for podcast using Gemini
 */
async function generatePodcastScript(content, type = 'overview', duration = 3) {
  if (!genAI) {
    throw new Error('Gemini API key is not configured');
  }

  const prompts = {
    podcast: `Create an engaging podcast conversation script between two hosts discussing the following content. Make it natural, conversational, and informative. Keep it around ${duration} minutes when spoken at normal pace:

Content: ${content}

Format as a natural dialogue with Host A and Host B taking turns. Include brief introductions and smooth transitions. DO NOT include stage directions like [Host A laughs] or [Music plays] - just the spoken words. DO NOT include "Host A:" or "Host B:" labels, just write the script as a single continuous speech for one voice since we only have one voice right now.`,
    
    overview: `Create a clear, engaging audio summary of the following content. Write it as a script for a single narrator. Make it informative yet accessible, suitable for audio listening. Target ${duration} minutes when spoken at normal pace:

Content: ${content}

Write in a natural speaking style with good flow and clear explanations. DO NOT include stage directions like [Narrator] or [Music]. Just the words to be spoken.`
  };

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });
    const result = await model.generateContent(prompts[type] || prompts.overview);
    return result.response.text();
  } catch (error) {
    console.error('Error generating podcast script:', error);
    return content.length > 1000 ? content.substring(0, 1000) + '...' : content;
  }
}

/**
 * Generate audio using edge-tts Python package
 */
async function generateEdgeTTS(text, outputPath) {
  const cleanText = text
    .replace(/\[.*?\]/g, '') 
    .replace(/Narrator:\s*/gi, '') 
    .replace(/Host[A-B\s]*:\s*/gi, '')
    .trim();
  
  const textFilePath = outputPath.replace('.mp3', '.txt');
  fs.writeFileSync(textFilePath, cleanText, 'utf8');

  const voice = 'en-US-AriaNeural'; 
  const edgeTtsCmd = 'D:\\ArcticFiles\\worker\\venv\\Scripts\\edge-tts.exe';
  const command = `"${edgeTtsCmd}" -v "${voice}" -f "${textFilePath}" --write-media "${outputPath}"`;
  
  console.log(`🎤 Running edge-tts with voice: ${voice}`);
  
  try {
    await execPromise(command, { maxBuffer: 1024 * 1024 * 10 });
    console.log('✅ edge-tts completed successfully');
  } finally {
    if (fs.existsSync(textFilePath)) {
      fs.unlinkSync(textFilePath);
    }
  }
}

/**
 * POST /api/generate-podcast
 */
router.post('/generate-podcast', async (req, res) => {
  try {
    const { 
      selected_text, 
      fileId,
      related_sections = [], 
      audio_type = 'overview', 
      duration_minutes = 3 
    } = req.body;
    
    const userId = req.headers['x-user-id'] || null;

    console.log('🎧 Generating podcast:', { audio_type, duration_minutes, fileId });

    if (!selected_text && !fileId && (!related_sections || related_sections.length === 0)) {
      return res.status(400).json({ error: 'Either selected_text, fileId, or related_sections must be provided' });
    }

    let contentToSummarize = selected_text || '';
    
    if (fileId) {
      try {
        console.log(`📄 Fetching content for file: ${fileId}`);
        const { data } = await axios.post(`${WORKER_URL}/file-content`, {
          path: fileId,
          user_id: userId
        });
        if (data.success && data.content) {
          // Truncate to reasonable length for podcast generation
          contentToSummarize = data.content.substring(0, 5000); 
          console.log(`✅ Fetched ${contentToSummarize.length} chars from file`);
        } else {
          throw new Error('No content returned from worker');
        }
      } catch (err) {
        console.warn(`⚠️ Could not fetch file content from worker: ${err.message}`);
        return res.status(404).json({ error: 'Could not retrieve file content. Make sure the file is fully indexed.' });
      }
    }
    if (related_sections && related_sections.length > 0) {
      const relatedText = related_sections
        .map(section => section.text || section.content || '')
        .join(' ')
        .substring(0, 2000); 
      contentToSummarize = `${contentToSummarize} ${relatedText}`.trim();
    }

    if (!contentToSummarize) {
      return res.status(400).json({ error: 'No content provided for podcast generation' });
    }

    console.log('📝 Generating podcast script with Gemini...');
    const podcastScript = await generatePodcastScript(contentToSummarize, audio_type, duration_minutes);

    console.log('🎤 Converting text to speech with edge-tts...');
    const tempAudioPath = path.join(__dirname, '../../temp_podcast.mp3');
    
    await generateEdgeTTS(podcastScript, tempAudioPath);
    const audioBuffer = fs.readFileSync(tempAudioPath);
    
    // Clean up temp file
    fs.unlinkSync(tempAudioPath);

    console.log(`📻 Podcast generated successfully using edge-tts`);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': 'attachment; filename="podcast.mp3"',
      'Content-Length': audioBuffer.length,
      'X-Podcast-Script': Buffer.from(podcastScript).toString('base64'),
      'X-TTS-Method': 'edge-tts',
      'Access-Control-Expose-Headers': 'X-TTS-Method,X-Podcast-Script'
    });

    res.send(audioBuffer);

  } catch (error) {
    console.error('❌ Podcast generation error:', error);
    return res.status(500).json({ error: 'Failed to generate podcast: ' + error.message });
  }
});

module.exports = router;
