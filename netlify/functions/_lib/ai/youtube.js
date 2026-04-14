/**
 * YouTube Service - YouTube API wrappers
 */

const { 
  youtubeSearchFirstVideo: clientSearchFirstVideo,
  youtubeSearchVideos: clientSearchVideos,
  youtubeGetVideoDetails: clientGetVideoDetails 
} = require('../youtube-client');
const { getTranscriptText: clientGetTranscriptText } = require('../youtube-transcript');

function getYouTubeApiKey(env) {
  return (env.YOUTUBE_API_KEY || '').trim();
}

async function youtubeSearchFirstVideo(query, apiKey, env) {
  return clientSearchFirstVideo(query, apiKey, env);
}

async function youtubeSearchVideos(query, apiKey, maxResults, env) {
  return clientSearchVideos(query, apiKey, maxResults, env);
}

async function youtubeGetVideoDetails(videoId, apiKey, env) {
  return clientGetVideoDetails(videoId, apiKey, env);
}

async function getTranscriptText(videoId) {
  return clientGetTranscriptText(videoId);
}

module.exports = {
  getYouTubeApiKey,
  youtubeSearchFirstVideo,
  youtubeSearchVideos,
  youtubeGetVideoDetails,
  getTranscriptText,
};