#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(PROJECT_ROOT, '.env');
const FIREBASE_GLOB_PREFIX = 'relovetree-firebase-adminsdk-';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) return;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

function ensureFirebaseServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT) {
    return;
  }

  const candidate = fs
    .readdirSync(PROJECT_ROOT)
    .find(
      (entry) =>
        entry.startsWith(FIREBASE_GLOB_PREFIX) &&
        entry.endsWith('.json') &&
        fs.statSync(path.join(PROJECT_ROOT, entry)).isFile()
    );

  if (!candidate) return;

  const raw = fs.readFileSync(path.join(PROJECT_ROOT, candidate), 'utf8');
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON = raw;
}

async function invoke(handler, body, headers = {}) {
  const response = await handler({
    httpMethod: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  let parsedBody = null;
  try {
    parsedBody = response && response.body ? JSON.parse(response.body) : null;
  } catch (error) {
    parsedBody = response && response.body ? response.body : null;
  }

  return {
    statusCode: response.statusCode,
    body: parsedBody,
  };
}

async function main() {
  loadEnvFile(ENV_PATH);
  ensureFirebaseServiceAccount();

  if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL');
    process.exitCode = 1;
    return;
  }

  const { handler } = require('../netlify/functions/firestore-api');

  const tests = [
    {
      label: 'queryCollection(trees, limit=1)',
      body: {
        op: 'queryCollection',
        path: 'trees',
        constraints: { limit: 1 },
      },
    },
    {
      label: 'getDoc(trees/nonexistent-smoke-doc)',
      body: {
        op: 'getDoc',
        path: 'trees/nonexistent-smoke-doc',
      },
    },
  ];

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT) {
    tests.push({
      label: 'queryCollection(trees) with bogus bearer token',
      body: {
        op: 'queryCollection',
        path: 'trees',
        constraints: { limit: 1 },
      },
      headers: {
        Authorization: 'Bearer not-a-real-token',
      },
    });
  }

  for (const test of tests) {
    const result = await invoke(handler, test.body, test.headers || {});
    console.log(`\n[${test.label}]`);
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
