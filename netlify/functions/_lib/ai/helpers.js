/**
 * AI Helpers - Utility functions for AI operations
 */

const { clampNumber, safeJsonParse } = require('../ai-helper-utils');

function isoToDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
}

function truncateText(text, maxLen) {
  if (!text) return '';
  const str = String(text);
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

module.exports = {
  clampNumber,
  safeJsonParse,
  isoToDate,
  truncateText,
};