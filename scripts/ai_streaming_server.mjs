import http from 'node:http';
import { createClient } from '@supabase/supabase-js';
import { URL } from 'node:url';

const port = process.env.AI_STREAM_PORT ? parseInt(process.env.AI_STREAM_PORT, 10) : 3002;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

function send(res, status, data, headers = {}) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(body);
}

async function logAIUsage(userId, model, inputTokens, outputTokens = 0, cost = 0) {
  if (!supabase) return;
  try {
    await supabase.from('ai_usage_logs').insert({
      user_id: userId,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging AI usage:', error);
  }
}

async function handleAIStream(req, res) {
  if (req.method !== 'POST' || req.url !== '/api/ai/stream') {
    res.writeHead(404);
    res.end();
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { message, model = 'gpt-4-turbo', userId = 'anonymous' } = JSON.parse(body || '{}');
      
      if (!message || !OPENAI_API_KEY) {
        return send(res, 400, { error: 'Missing required parameters' });
      }

      // Calcular custo estimado
      const inputTokens = Math.ceil(message.length / 4);
      const estimatedCost = (inputTokens / 1000) * 0.03; // GPT-4 Turbo rate

      // Registrar uso no Supabase
      await logAIUsage(userId, model, inputTokens, 0, estimatedCost);

      // Configurar streaming com OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            { 
              role: 'system', 
              content: 'Você é um assistente especializado em finanças corporativas, contabilidade e análise de dados financeiros. Ajude com DRE, DFC, conciliações e insights de negócios.' 
            },
            { role: 'user', content: message }
          ],
          stream: true,
          max_tokens: 4000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      // Configurar headers para streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let outputTokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              // Atualizar custo final
              const finalCost = (inputTokens / 1000) * 0.03 + (outputTokens / 1000) * 0.06;
              await logAIUsage(userId, model, inputTokens, outputTokens, finalCost);
              
              res.write('data: [DONE]\n\n');
              res.end();
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) outputTokens += Math.ceil(content.length / 4);
              
              res.write(line + '\n\n');
            } catch (e) {
              res.write(line + '\n\n');
            }
          }
        }
      }

    } catch (error) {
      console.error('AI Streaming error:', error);
      send(res, 500, { error: 'Internal server error' });
    }
  });
}

// Handle CORS preflight
function handleOptions(req, res) {
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  });
  res.end();
}

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    return handleOptions(req, res);
  }
  
  if (req.url === '/health') {
    return send(res, 200, { status: 'ok', service: 'ai-streaming', port });
  }
  
  if (req.url === '/api/ai/stream') {
    return handleAIStream(req, res);
  }
  
  send(res, 404, { error: 'Not found' });
});

server.listen(port, () => {
  console.log(`🤖 AI Streaming server running on port ${port}`);
  console.log(`📡 Health check: http://localhost:${port}/health`);
  console.log(`⚡ Streaming endpoint: http://localhost:${port}/api/ai/stream`);
});