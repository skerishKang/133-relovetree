/**
 * Relovetree - Groq Client
 * 
 * Groq API client for text generation (OpenAI-compatible API)
 */

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Get Groq API key from environment
 */
function getApiKey(env) {
  return (env.GROQ_API_KEY || '').trim();
}

/**
 * Call Groq API for text generation
 * @param {string} promptText - The prompt text
 * @param {object} env - Environment variables
 * @param {object} options - Optional parameters (model, temperature, etc.)
 * @returns {Promise<string>} - Generated text
 */
async function callGroqText(promptText, env, options = {}) {
  const apiKey = getApiKey(env);
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const model = options.model || 'llama-3.1-70b-versatile';
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens || 2048;

  const requestBody = {
    model: model,
    messages: [
      {
        role: 'user',
        content: promptText,
      },
    ],
    temperature: temperature,
    max_tokens: maxTokens,
  };

  const response = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('Groq API error:', response.status, text);
    throw new Error('Groq error ' + response.status + ': ' + text);
  }

  const data = await response.json();
  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  
  if (!content) {
    throw new Error('Empty Groq response');
  }
  
  return content;
}

/**
 * Get current AI provider based on AI_PROVIDER env
 * @param {object} env - Environment variables
 * @returns {string} - 'groq' or 'gemini'
 */
function getAiProvider(env) {
  const provider = (env.AI_PROVIDER || 'groq').toLowerCase().trim();
  if (provider === 'gemini') {
    return 'gemini';
  }
  return 'groq'; // default to groq
}

module.exports = {
  getApiKey,
  callGroqText,
  getAiProvider,
};