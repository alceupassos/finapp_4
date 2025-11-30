# F5-TTS FullStack Implementation - BPO Financeiro SaaS

## 📋 Stack Confirmado
- **Frontend:** Next.js 14+ / React 18+
- **Backend:** Node.js (n8n workflows + API custom)
- **Infrastructure:** Docker + VPS (root@147.93.183.55)
- **Database:** Supabase (PostgreSQL)
- **Automation:** n8n + Evolution API (WhatsApp)
- **TTS:** F5-TTS Local (pt-BR)
- **LLM:** OpenAI/Gemini (relatórios financeiros)
- **IDE:** Cursor 2.0 (agentes simultâneos)

---

## 🚀 FASE 1: Setup Docker F5-TTS no VPS

### 1.1 Dockerfile para F5-TTS API
```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    git \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Clone F5-TTS repo
RUN git clone https://github.com/SWivid/F5-TTS.git . && \
    git checkout main

# Instalar Python deps
RUN pip install --no-cache-dir \
    fastapi \
    uvicorn[standard] \
    torch \
    torchaudio \
    numpy \
    scipy \
    soundfile \
    julius \
    librosa \
    transformers \
    pydantic \
    python-multipart

# Download modelo pt-BR (330h de áudio)
RUN git lfs install && \
    git clone https://huggingface.co/firstpixel/F5-TTS-pt-br /models/f5-tts-pt-br

# API wrapper (criar arquivo api_server.py)
COPY api_server.py /app/

EXPOSE 5000

CMD ["uvicorn", "api_server:app", "--host", "0.0.0.0", "--port", "5000"]
```

### 1.2 API FastAPI para F5-TTS
```python
# api_server.py
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from typing import Optional
import torch
import torchaudio
import numpy as np
from pathlib import Path
import io
import json
from datetime import datetime
import logging

# Imports F5-TTS
import sys
sys.path.insert(0, '/app/src')
from f5_tts.model import CFM
from f5_tts.infer.utils_infer import (
    preprocess_text,
    mel_to_wav,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="F5-TTS API - Financial BPO")

# Modelos PT-BR
device = "cuda" if torch.cuda.is_available() else "cpu"
logger.info(f"Using device: {device}")

class TTSRequest(BaseModel):
    text: str
    voice_id: str = "default"  # speaker_id
    speed: float = 1.0
    language: str = "pt-BR"
    client_id: Optional[str] = None  # para tracking Supabase

class TTSResponse(BaseModel):
    status: str
    duration: float
    size_bytes: int
    voice_id: str
    timestamp: str

# Cache de modelos carregados
models_cache = {}

def load_model(voice_id: str = "default"):
    """Carrega modelo F5-TTS pt-BR com cache"""
    if voice_id not in models_cache:
        logger.info(f"Loading F5-TTS model: {voice_id}")
        # Usar modelo treinado em português
        model = CFM(
            dim=384,
            num_mels=100,
            **{
                'encoder_hidden_size': 384,
                'encoder_num_hidden_layers': 4,
                'encoder_num_attention_heads': 2,
            }
        )
        checkpoint_path = f"/models/f5-tts-pt-br/model.pt"
        state_dict = torch.load(checkpoint_path, map_location=device)
        model.load_state_dict(state_dict)
        model = model.to(device)
        model.eval()
        models_cache[voice_id] = model
    
    return models_cache[voice_id]

@app.post("/api/synthesize", response_class=FileResponse)
async def synthesize_speech(request: TTSRequest):
    """
    Sintetiza fala em português brasileiro
    Retorna WAV stream (RTF 0.15 = rápido)
    """
    try:
        logger.info(f"Synthesizing: {request.text[:50]}... for client: {request.client_id}")
        
        # Validar input
        if not request.text or len(request.text) > 5000:
            raise HTTPException(status_code=400, detail="Text must be 1-5000 chars")
        
        # Carregar modelo
        model = load_model(request.voice_id)
        
        # Preprocess texto português
        text = preprocess_text(request.text, language="pt-BR")
        
        # Gerar mel-spectrogram
        with torch.no_grad():
            # Dummy speaker embedding (pt-BR genérico)
            speaker = torch.zeros(1, 512).to(device)
            mel_spec, duration = model.inference(
                text=text,
                speaker_emb=speaker,
                temperature=0.7,
                speed=request.speed,
            )
        
        # Converter para áudio WAV
        wav = mel_to_wav(mel_spec.squeeze(0).cpu().numpy())
        
        # Salvar em buffer
        audio_buffer = io.BytesIO()
        torchaudio.save(
            audio_buffer,
            torch.tensor(wav).unsqueeze(0),
            sample_rate=24000,
            format="wav"
        )
        audio_buffer.seek(0)
        
        # Log para Supabase (opcional)
        duration_s = len(wav) / 24000
        logger.info(f"✅ Synthesis complete: {duration_s:.2f}s")
        
        return FileResponse(
            audio_buffer,
            media_type="audio/wav",
            filename=f"audio_{datetime.now().timestamp()}.wav",
            headers={
                "X-Duration": str(duration_s),
                "X-Voice-ID": request.voice_id,
            }
        )
    
    except Exception as e:
        logger.error(f"❌ Synthesis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health():
    """Health check"""
    return {
        "status": "ok",
        "device": device,
        "models_loaded": len(models_cache),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/models")
async def list_models():
    """Lista vozes disponíveis"""
    return {
        "available_voices": ["default", "formal", "casual"],
        "language": "pt-BR",
        "sample_rate": 24000,
        "latency_ms": 150
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
```

### 1.3 Docker Compose (VPS)
```yaml
# docker-compose.yml
version: '3.9'

services:
  f5-tts:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: f5tts-api
    ports:
      - "5000:5000"
    environment:
      - TORCH_HOME=/models
      - CUDA_VISIBLE_DEVICES=0
    volumes:
      - ./models:/models
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - bpo-network
    mem_limit: 6g
    cpus: "2"

  n8n:
    image: n8nio/n8n:latest
    container_name: n8n-bpo
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_TUNNEL_URL=http://147.93.183.55:5678/
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=${DB_PASSWORD}
      - DB_POSTGRESDB_DATABASE=n8n
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres
    networks:
      - bpo-network

  postgres:
    image: postgres:15
    container_name: postgres-n8n
    environment:
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=n8n
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - bpo-network

networks:
  bpo-network:
    driver: bridge

volumes:
  n8n_data:
  postgres_data:
```

### 1.4 Deploy no VPS
```bash
# SSH no VPS
ssh root@147.93.183.55

# Clonar seu repo ou criar diretório
mkdir -p /opt/f5tts-bpo && cd /opt/f5tts-bpo

# Copiar arquivos
# docker-compose.yml, Dockerfile, api_server.py

# Build e run
docker-compose up -d

# Verificar
docker logs -f f5tts-api

# Teste local
curl http://localhost:5000/api/health
```

---

## 🔌 FASE 2: Backend API (Next.js API Routes)

### 2.1 API Route para TTS (Next.js)
```typescript
// app/api/tts/synthesize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const F5_TTS_API = process.env.F5_TTS_API_URL || 'http://f5tts-api:5000';

interface TTSPayload {
  text: string;
  clientId: string;
  voiceId?: string;
  speed?: number;
  purpose?: 'report' | 'notification' | 'greeting';
}

export async function POST(request: NextRequest) {
  try {
    const body: TTSPayload = await request.json();

    // Validações
    if (!body.text || body.text.length < 1 || body.text.length > 5000) {
      return NextResponse.json(
        { error: 'Text must be 1-5000 characters' },
        { status: 400 }
      );
    }

    if (!body.clientId) {
      return NextResponse.json(
        { error: 'clientId required for tracking' },
        { status: 400 }
      );
    }

    // Log na Supabase
    const { data: logEntry, error: logError } = await supabase
      .from('tts_logs')
      .insert({
        client_id: body.clientId,
        input_text: body.text,
        voice_id: body.voiceId || 'default',
        purpose: body.purpose || 'report',
        status: 'processing',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) {
      console.error('Supabase log error:', logError);
    }

    // Chamar F5-TTS API
    const ttsResponse = await fetch(`${F5_TTS_API}/api/synthesize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: body.text,
        voice_id: body.voiceId || 'default',
        speed: body.speed || 1.0,
        language: 'pt-BR',
        client_id: body.clientId,
      }),
    });

    if (!ttsResponse.ok) {
      throw new Error(`F5-TTS API error: ${ttsResponse.statusText}`);
    }

    // Obter áudio como buffer
    const audioBuffer = await ttsResponse.arrayBuffer();
    
    // Salvar em Supabase Storage
    const fileName = `${body.clientId}/${Date.now()}_audio.wav`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio_reports')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/wav',
        cacheControl: '3600',
      });

    if (uploadError) {
      throw new Error(`Storage upload error: ${uploadError.message}`);
    }

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from('audio_reports')
      .getPublicUrl(fileName);

    // Atualizar log com sucesso
    if (logEntry) {
      await supabase
        .from('tts_logs')
        .update({
          status: 'completed',
          audio_url: urlData.publicUrl,
          file_path: fileName,
          duration_ms: (audioBuffer.byteLength / 24000 / 2) * 1000, // aproximado
        })
        .eq('id', logEntry.id);
    }

    return NextResponse.json({
      success: true,
      audioUrl: urlData.publicUrl,
      duration: audioBuffer.byteLength / 24000 / 2, // segundos
      logId: logEntry?.id,
    });

  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'TTS synthesis failed' },
      { status: 500 }
    );
  }
}
```

### 2.2 Database Schema (Supabase)
```sql
-- Tabela para logs de síntese
CREATE TABLE tts_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_text TEXT NOT NULL,
  voice_id VARCHAR(50) DEFAULT 'default',
  purpose VARCHAR(20) CHECK (purpose IN ('report', 'notification', 'greeting')),
  status VARCHAR(20) CHECK (status IN ('processing', 'completed', 'failed')),
  audio_url TEXT,
  file_path TEXT,
  duration_ms FLOAT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  INDEX idx_client_created (client_id, created_at DESC)
);

-- Tabela para relatórios financeiros com áudio
CREATE TABLE financial_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES franchises(id),
  report_title VARCHAR(255) NOT NULL,
  report_content TEXT NOT NULL,
  audio_synthesis_id UUID REFERENCES tts_logs(id),
  audio_url TEXT,
  report_type VARCHAR(50) CHECK (report_type IN ('daily', 'weekly', 'monthly', 'custom')),
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  INDEX idx_client_franchise (client_id, franchise_id)
);

-- Tabela para entregas via WhatsApp
CREATE TABLE whatsapp_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES financial_reports(id),
  phone_number VARCHAR(20) NOT NULL,
  evolution_instance_id VARCHAR(100),
  message_id TEXT,
  delivery_status VARCHAR(20) CHECK (delivery_status IN ('queued', 'sent', 'delivered', 'failed')),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- RLS (Row Level Security)
ALTER TABLE tts_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see only own TTS logs"
  ON tts_logs FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Users see own reports"
  ON financial_reports FOR SELECT
  USING (auth.uid() = client_id OR
         franchise_id IN (
           SELECT id FROM franchises WHERE owner_id = auth.uid()
         ));
```

---

## 🎯 FASE 3: n8n Workflow (WhatsApp + F5-TTS + LLM)

### 3.1 n8n Workflow JSON
```json
{
  "name": "Financial Report - TTS + WhatsApp",
  "nodes": [
    {
      "parameters": {
        "events": "message_received"
      },
      "name": "Webhook - Evolution API",
      "type": "n8n-nodes-base.webhookTrigger",
      "typeVersion": 1,
      "position": [100, 300]
    },
    {
      "parameters": {
        "url": "http://f5tts-api:5000/api/health",
        "method": "GET",
        "headerParameters": {},
        "options": {}
      },
      "name": "Check F5-TTS Health",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [300, 300],
      "notesInFlow": true
    },
    {
      "parameters": {
        "model": "gpt-4",
        "options": {
          "temperature": 0.3
        },
        "messages": {
          "values": [
            {
              "content": "={\"role\":\"system\",\"content\":\"Você é um especialista em análise financeira para BPO. Crie um relatório breve (max 300 chars) sobre: \" + $json.body.query}",
              "role": "system"
            }
          ]
        }
      },
      "name": "OpenAI - Generate Report",
      "type": "n8n-nodes-base.openai",
      "typeVersion": 1,
      "position": [500, 300]
    },
    {
      "parameters": {
        "url": "http://localhost:3000/api/tts/synthesize",
        "method": "POST",
        "headerParameters": {
          "Content-Type": "application/json"
        },
        "body": "{\n  \"text\": \"{{ $json.choices[0].message.content }}\",\n  \"clientId\": \"{{ $json.body.client_id }}\",\n  \"voiceId\": \"default\",\n  \"speed\": 1.0,\n  \"purpose\": \"report\"\n}",
        "options": {}
      },
      "name": "Call F5-TTS Synthesis",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [700, 300]
    },
    {
      "parameters": {
        "parameters": {
          "values": [
            {
              "name": "phone",
              "value": "={{ $json.body.phone }}"
            },
            {
              "name": "audioUrl",
              "value": "={{ $json.audioUrl }}"
            },
            {
              "name": "reportTitle",
              "value": "={{ $json.body.title || 'Relatório Financeiro' }}"
            }
          ]
        }
      },
      "name": "Send via Evolution API",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [900, 300],
      "notesInFlow": true
    }
  ],
  "connections": {
    "Webhook - Evolution API": {
      "main": [
        [
          {
            "node": "Check F5-TTS Health",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Check F5-TTS Health": {
      "main": [
        [
          {
            "node": "OpenAI - Generate Report",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "OpenAI - Generate Report": {
      "main": [
        [
          {
            "node": "Call F5-TTS Synthesis",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Call F5-TTS Synthesis": {
      "main": [
        [
          {
            "node": "Send via Evolution API",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

---

## 🎨 FASE 4: Frontend React Component

### 4.1 Component para Gerar Relatório com Áudio
```typescript
// components/FinancialReportGenerator.tsx
'use client';

import React, { useState, useRef } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { createClient } from '@supabase/supabase-js';

interface ReportGeneratorProps {
  franchiseId?: string;
  onSuccess?: (audioUrl: string) => void;
}

export function FinancialReportGenerator({
  franchiseId,
  onSuccess,
}: ReportGeneratorProps) {
  const { user } = useUser();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [reportText, setReportText] = useState('');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleGenerateAudio = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reportText.trim()) {
      setError('Por favor, digite o relatório');
      return;
    }

    if (!user?.id) {
      setError('Usuário não autenticado');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Etapa 1: Síntese de voz
      setProgress(33);
      
      const response = await fetch('/api/tts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: reportText,
          clientId: user.id,
          voiceId: 'default',
          speed: 1.0,
          purpose: 'report',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha na síntese de voz');
      }

      const data = await response.json();
      setProgress(66);

      // Etapa 2: Salvar relatório no Supabase
      const { data: reportData, error: reportError } = await supabase
        .from('financial_reports')
        .insert({
          client_id: user.id,
          franchise_id: franchiseId || null,
          report_title: 'Relatório Gerado',
          report_content: reportText,
          audio_synthesis_id: data.logId,
          audio_url: data.audioUrl,
          report_type: 'custom',
          status: 'draft',
        })
        .select()
        .single();

      if (reportError) throw reportError;

      setProgress(100);
      setAudioUrl(data.audioUrl);
      onSuccess?.(data.audioUrl);

      // Reset
      setTimeout(() => {
        setReportText('');
        setProgress(0);
      }, 1000);

    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao gerar relatório'
      );
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">
        Gerar Relatório Financeiro com Áudio
      </h2>

      <form onSubmit={handleGenerateAudio} className="space-y-4">
        <textarea
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          placeholder="Digite o relatório financeiro aqui..."
          className="h-32 w-full rounded border border-gray-300 p-3 font-mono text-sm"
          disabled={loading}
        />

        {error && (
          <div className="rounded bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {progress > 0 && progress < 100 && (
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded bg-gray-200">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-600">Processando... {progress}%</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !reportText.trim()}
          className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Gerando áudio...' : 'Gerar Áudio'}
        </button>
      </form>

      {audioUrl && (
        <div className="space-y-3 rounded bg-green-50 p-4">
          <p className="text-sm font-medium text-green-900">✅ Áudio gerado!</p>
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            className="w-full"
          />
          <button
            onClick={() => {
              const link = document.createElement('a');
              link.href = audioUrl;
              link.download = `relatorio_${Date.now()}.wav`;
              link.click();
            }}
            className="w-full rounded bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
          >
            ⬇️ Baixar Áudio
          </button>
        </div>
      )}
    </div>
  );
}
```

### 4.2 Hook para Integração com WhatsApp
```typescript
// hooks/useFinancialReport.ts
import { useState } from 'react';
import { useUser } from '@supabase/auth-helpers-react';

export function useFinancialReport() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAndSend = async (
    text: string,
    phoneNumbers: string[],
    franchiseId?: string
  ) => {
    if (!user?.id) throw new Error('Not authenticated');

    setLoading(true);
    setError(null);

    try {
      // 1. Gerar áudio
      const ttsResponse = await fetch('/api/tts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          clientId: user.id,
          purpose: 'report',
        }),
      });

      if (!ttsResponse.ok) throw new Error('TTS failed');
      const { audioUrl, logId } = await ttsResponse.json();

      // 2. Enviar via WhatsApp para cada número
      const deliveries = await Promise.all(
        phoneNumbers.map((phone) =>
          fetch('/api/whatsapp/send-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone,
              audioUrl,
              title: 'Relatório Financeiro',
              franchiseId,
            }),
          })
        )
      );

      return {
        audioUrl,
        deliveries: await Promise.all(deliveries.map((r) => r.json())),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { generateAndSend, loading, error };
}
```

---

## 🔄 FASE 5: n8n + Evolution Integration

### 5.1 Envio via WhatsApp (API Route)
```typescript
// app/api/whatsapp/send-report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

interface SendReportPayload {
  phone: string;
  audioUrl: string;
  title: string;
  franchiseId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendReportPayload = await request.json();

    // Validar número WhatsApp
    const cleanPhone = body.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    // Enviar via Evolution API
    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendMedia`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: EVOLUTION_API_KEY!,
        },
        body: JSON.stringify({
          number: cleanPhone,
          mediaUrl: body.audioUrl,
          mediaType: 'audio',
          caption: `📊 ${body.title}`,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Evolution API error: ${response.statusText}`);
    }

    const result = await response.json();

    // Registrar entrega no Supabase
    await supabase.from('whatsapp_deliveries').insert({
      phone_number: cleanPhone,
      evolution_instance_id: result.instance_id,
      message_id: result.messageId,
      delivery_status: 'sent',
      sent_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });

  } catch (error) {
    console.error('WhatsApp send error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Send failed' },
      { status: 500 }
    );
  }
}
```

---

## 🎯 FASE 6: Cursor 2.0 Prompt para Agentes

### 6.1 Composite Prompt para Cursor
```
# F5-TTS Financial BPO SaaS - Full Implementation

## Contexto
- Sistema: Next.js 14 + React 18 + Supabase + n8n + Docker
- Propósito: Gerar relatórios financeiros com síntese de fala em português brasileiro
- Infraestrutura: VPS root@147.93.183.55 (Docker + F5-TTS local)
- Integração: Evolution API (WhatsApp), OpenAI LLM, Redis queue

## Tarefa 1: Setup Docker F5-TTS
[IMPLEMENTE]
- Dockerfile com F5-TTS pt-BR (330h áudio português)
- FastAPI wrapper com endpoints: /api/synthesize, /api/health, /api/models
- Cache de modelos em memória para reduzir latência (150-200ms)
- Logging estruturado com correlation_id para rastrear requisições
- Health check integrado ao docker-compose
- Volumes para modelos e logs persistentes

## Tarefa 2: Backend Node.js/Next.js
[IMPLEMENTE]
- API Route POST /api/tts/synthesize que chama F5-TTS local
- Validação de input (1-5000 chars, pt-BR)
- Log em Supabase table 'tts_logs' com status, duração, URL
- Upload de áudio para Supabase Storage (audio_reports bucket)
- RLS policies para multi-tenant (client_id baseado)
- Retry logic com exponential backoff (3 tentativas)
- Rate limiting: 100 req/min por cliente

## Tarefa 3: Database Schema (Supabase)
[IMPLEMENTE]
- Tabelas: tts_logs, financial_reports, whatsapp_deliveries
- RLS enabled para segurança multi-tenant
- Índices para queries rápidas (client_id, created_at DESC)
- Foreign keys e constraints
- Policies de acesso baseadas em auth.uid()

## Tarefa 4: n8n Workflow
[CONFIGURE]
- Trigger: Webhook (Evolution API envia mensagem de cliente)
- Node: Check F5-TTS health (GET /api/health)
- Node: OpenAI gera relatório financeiro (prompt system: especialista financeiro)
- Node: Chama /api/tts/synthesize com texto da IA
- Node: Evolution API envia áudio via WhatsApp ao cliente
- Error handling: Fallback para texto se TTS falhar
- Logging: Cada etapa registra status em Supabase

## Tarefa 5: Frontend React
[IMPLEMENTE]
- Componente FinancialReportGenerator com textarea + botão
- Upload progressivo (33%, 66%, 100%) durante síntese + upload
- Preview de áudio com <audio controls>
- Botão download para gerentes
- Hook useFinancialReport para reutilização
- Loading states e error boundaries
- Dark mode support

## Tarefa 6: Integração WhatsApp
[IMPLEMENTE]
- API Route POST /api/whatsapp/send-report
- Validação de número (cleanup +55 11 98xxx)
- Call Evolution API com audioUrl
- Registrar delivery em whatsapp_deliveries table
- Rastrear status: queued → sent → delivered
- Webhook para atualizar status quando Evolution confirmar

## Variáveis de Ambiente (.env.local)
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# F5-TTS
F5_TTS_API_URL=http://f5tts-api:5000

# Evolution API
EVOLUTION_API_URL=https://evolution.xxx.com
EVOLUTION_API_KEY=xxx

# OpenAI
OPENAI_API_KEY=sk-xxx

# Database
DB_PASSWORD=xxxxx
```

## Deploy Checklist
- [ ] Docker compose up -d (F5-TTS + n8n + PostgreSQL)
- [ ] Supabase migrations rodadas
- [ ] Next.js build sem erros
- [ ] Environment vars configuradas
- [ ] F5-TTS health check respondendo (5000)
- [ ] n8n workflow testado (5678)
- [ ] Evolution API conectada e webhook ativo
- [ ] RLS policies verificadas
- [ ] Logging funcionando em Supabase
- [ ] Performance testada (latência < 500ms ponta-a-ponta)

## Métricas de Sucesso
- RTF F5-TTS: 0.15-0.2 (síntese de 1s de áudio em 150-200ms)
- Latência fim-a-fim: < 500ms (webhook → áudio no WhatsApp)
- Taxa de sucesso de síntese: > 99%
- Taxa de entrega WhatsApp: > 98%
- Logs estruturados para debugging

## Agentes Simultâneos (Cursor)
Para cada agente no Cursor 2.0:
1. Agente BACKEND: Implementar API routes + Supabase
2. Agente INFRA: Docker compose + VPS deploy
3. Agente FRONTEND: React components + hooks
4. Agente N8N: Workflow configuration + testing
5. Agente INTEGRATION: WhatsApp + Evolution API

Coordenação: Commit ao git após cada task, merge em main quando tudo passar.
```

---

## 📊 FASE 7: Monitoramento & Logs

### 7.1 Structured Logging
```typescript
// lib/logger.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function logEvent(
  clientId: string,
  eventType: 'tts_start' | 'tts_complete' | 'tts_error' | 'whatsapp_send' | 'whatsapp_delivered',
  metadata: Record<string, any>
) {
  await supabase.from('system_logs').insert({
    client_id: clientId,
    event_type: eventType,
    metadata,
    timestamp: new Date().toISOString(),
  });
}
```

---

## 🚀 Quick Start Commands

```bash
# 1. Clone repo
git clone <seu-repo> && cd f5tts-bpo

# 2. Build Docker
docker-compose build

# 3. Start services
docker-compose up -d

# 4. Check logs
docker logs -f f5tts-api
docker logs -f n8n-bpo

# 5. Test F5-TTS
curl -X GET http://localhost:5000/api/health

# 6. Setup Next.js
npm install
npm run dev

# 7. Access
- Next.js: http://localhost:3000
- n8n: http://147.93.183.55:5678
- F5-TTS: http://localhost:5000
```

---

## 📝 Notas Importantes

- **Segurança:** Nunca exponha F5-TTS API publicamente (apenas n8n + Next.js interno)
- **Escalabilidade:** Redis queue para fila de síntese quando > 50k msgs/dia
- **Backup:** Cron job para backup diário de audio_reports bucket
- **Custo:** F5-TTS local = R$0/mês TTS. Apenas VPS + OpenAI LLM + Evolution
- **Performance:** RTF 0.15 = rápido o suficiente para responses em tempo real

---

**Última atualização:** 2025-11-06
**Versão:** 1.0
**Maintainer:** Seu time Cursor 2.0
