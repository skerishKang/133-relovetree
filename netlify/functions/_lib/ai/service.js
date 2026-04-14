/**
 * AI Service - Core AI text and node building functions
 */

const { getApiKeys, callGeminiText: clientCallGeminiText } = require('../gemini-client');
const { getApiKey: getGroqApiKey, callGroqText: clientCallGroqText, getAiProvider } = require('../groq-client');
const { buildRealNodeFromVideo: clientBuildRealNodeFromVideo, buildPromptBody: clientBuildPromptBody } = require('../ai-prompts');

async function callAiText(promptText, env) {
  const provider = getAiProvider(env);
  
  if (provider === 'groq') {
    try {
      const groqApiKey = getGroqApiKey(env);
      if (groqApiKey) {
        return await clientCallGroqText(promptText, env);
      }
    } catch (e) {
      console.warn('Groq failed, trying Gemini fallback:', e.message);
    }
  }
  
  return clientCallGeminiText(promptText, env);
}

async function buildRealNodeFromVideo(opts) {
  return clientBuildRealNodeFromVideo(opts, callAiText);
}

function buildPromptBody(mode, data) {
  return clientBuildPromptBody(mode, data);
}

function getAiKeys(env) {
  return getApiKeys(env);
}

module.exports = {
  callAiText,
  buildRealNodeFromVideo,
  buildPromptBody,
  getAiKeys,
};