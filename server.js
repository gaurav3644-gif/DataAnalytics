const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = __dirname;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5.1';

function sendJson(res, statusCode, payload) {
  const data = Buffer.from(JSON.stringify(payload));
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': data.length
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function truncateText(value, limit) {
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, limit - 1)}…`;
}

function safeInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function interpretPrompt(prompt) {
  const normalized = String(prompt || '').toLowerCase();
  if (!normalized) {
    return 'general analysis';
  }
  if (normalized.includes('anomal') || normalized.includes('outlier')) {
    return 'anomaly detection';
  }
  if (normalized.includes('forecast') || normalized.includes('predict')) {
    return 'forecasting';
  }
  if (normalized.includes('trend') || normalized.includes('growth')) {
    return 'trend analysis';
  }
  if (normalized.includes('segment') || normalized.includes('region') || normalized.includes('group')) {
    return 'segmentation';
  }
  return 'general analysis';
}

function buildPrompt(payload) {
  const metric = String(payload.metric || '');
  const timeField = String(payload.timeField || '');
  const prompt = String(payload.prompt || '').trim();
  const stats = payload.stats || {};
  const series = Array.isArray(payload.series) ? payload.series : [];
  const sampleRows = Array.isArray(payload.sampleRows) ? payload.sampleRows : [];
  const headers = Array.isArray(payload.headers) ? payload.headers : [];

  const systemMessage = [
    'You are PiTensor Analytics, an AI data analyst.',
    'Return only valid JSON that matches the schema.',
    'Be specific, concise, and practical.'
  ].join(' ');

  const userMessage = {
    dataset_context: {
      metric,
      time_field: timeField,
      prompt,
      prompt_focus: interpretPrompt(prompt),
      headers,
      stats,
      series_sample: series.slice(0, 12),
      sample_rows: sampleRows.slice(0, 8)
    },
    instructions: [
      'Summarize the metric trend and what it means.',
      'Call out anomalies, risks, or interesting shifts.',
      'Provide 3 practical recommendations.',
      'Mention the prompt focus explicitly when relevant.'
    ]
  };

  return { systemMessage, userMessage };
}

function fallbackInsights(payload, errorMessage) {
  const stats = payload.stats || {};
  const series = Array.isArray(payload.series) ? payload.series : [];
  const metric = String(payload.metric || 'selected metric');
  const prompt = String(payload.prompt || '').trim();

  const summary = [
    `OpenAI was unavailable, so PiTensor used local heuristics for ${metric}.`,
    prompt ? `Prompt: ${prompt}.` : ''
  ].filter(Boolean).join(' ');

  return {
    summary,
    key_findings: [
      `Rows analyzed: ${safeInt(stats.rows)}.`,
      `Numeric fields found: ${safeInt(stats.numericFields)}.`,
      `Series points available: ${series.length}.`
    ],
    recommendations: [
      'Check the largest changes around chart peaks and dips.',
      'Validate any anomaly flags against source systems.',
      'Use the prompt box to focus on trend, forecast, or outlier analysis.'
    ],
    risks: [truncateText(errorMessage, 140)],
    prompt_focus: 'fallback analysis'
  };
}

async function callOpenAI(payload) {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set.');
  }

  const { systemMessage, userMessage } = buildPrompt(payload);
  const body = {
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: JSON.stringify(userMessage) }
    ],
    temperature: 0.2,
    max_completion_tokens: 700,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'pitensor_insights',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            summary: { type: 'string' },
            key_findings: {
              type: 'array',
              items: { type: 'string' },
              minItems: 3,
              maxItems: 5
            },
            recommendations: {
              type: 'array',
              items: { type: 'string' },
              minItems: 3,
              maxItems: 5
            },
            risks: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
              maxItems: 4
            },
            prompt_focus: { type: 'string' }
          },
          required: ['summary', 'key_findings', 'recommendations', 'risks', 'prompt_focus']
        }
      }
    }
  };

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI request failed: ${detail}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned an empty response.');
  }

  return JSON.parse(content);
}

function serveStatic(req, res, pathname) {
  const normalizedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(ROOT, `.${normalizedPath}`);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  let finalPath = filePath;
  if (!fs.existsSync(finalPath) || !fs.statSync(finalPath).isFile()) {
    finalPath = path.resolve(ROOT, 'index.html');
  }

  if (!fs.existsSync(finalPath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const data = fs.readFileSync(finalPath);
  const contentType = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
  }[path.extname(finalPath).toLowerCase()] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': data.length
  });
  res.end(data);
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, 'http://127.0.0.1');
  const pathname = requestUrl.pathname;

  if (req.method === 'GET' && pathname === '/api/health') {
    sendJson(res, 200, { ok: true, model: DEFAULT_MODEL });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/analyze') {
    let payload;
    try {
      payload = await readBody(req);
    } catch (error) {
      sendJson(res, 400, { error: error.message || 'Invalid JSON request body.' });
      return;
    }

    try {
      const insights = await callOpenAI(payload);
      sendJson(res, 200, { ok: true, model: DEFAULT_MODEL, insights });
    } catch (error) {
      const insights = fallbackInsights(payload, error.message || 'Unknown error');
      sendJson(res, 200, {
        ok: false,
        model: DEFAULT_MODEL,
        insights,
        warning: error.message || 'Unknown error'
      });
    }
    return;
  }

  if (req.method === 'GET') {
    serveStatic(req, res, pathname);
    return;
  }

  res.writeHead(405, { Allow: 'GET, POST' });
  res.end('Method not allowed');
});

const port = Number.parseInt(process.env.PORT || '8000', 10);
const host = process.env.HOST || '127.0.0.1';
server.listen(port, host, () => {
  console.log(`PiTensor server running at http://${host}:${port}`);
  console.log(`Using OpenAI model: ${DEFAULT_MODEL}`);
});
