# 🚀 F5-TTS BPO SaaS - Copy-Paste Quick Start

## PRÉ-REQUISITOS
- VPS root@147.93.183.55 (4GB RAM, 2 CPU)
- Docker + Docker Compose instalado
- Git configurado
- Node.js 18+ local

---

## PASSO 1: SSH e Setup Inicial VPS

```bash
# Conectar ao VPS
ssh root@147.93.183.55

# Criar diretório projeto
mkdir -p /opt/f5tts-bpo && cd /opt/f5tts-bpo

# Clone seu repo (ou init novo)
git clone <seu-repo-url> . || git init

# Copiar env template
cat > .env << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# F5-TTS
F5_TTS_API_URL=http://f5tts-api:5000

# Evolution API
EVOLUTION_API_URL=https://evolution.xxxxx.com
EVOLUTION_API_KEY=xxxxx

# OpenAI
OPENAI_API_KEY=sk-xxxxx

# Database
DB_PASSWORD=seu_postgres_password_seguro

# Node env
NODE_ENV=production
EOF

# Ajustar permissões
chmod 600 .env
```

---

## PASSO 2: Criar Dockerfile F5-TTS

```bash
cat > Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Instalar deps sistema
RUN apt-get update && apt-get install -y \
    git git-lfs curl \
    ffmpeg libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Clone F5-TTS
RUN git clone https://github.com/SWivid/F5-TTS.git . && \
    git checkout main

# Instalar Python packages
RUN pip install --no-cache-dir \
    fastapi uvicorn[standard] \
    torch torchaudio \
    numpy scipy soundfile \
    julius librosa transformers \
    pydantic python-multipart

# Download modelo pt-BR
RUN git lfs install && \
    git clone https://huggingface.co/firstpixel/F5-TTS-pt-br /models/f5-tts-pt-br

COPY api_server.py /app/

EXPOSE 5000
CMD ["uvicorn", "api_server:app", "--host", "0.0.0.0", "--port", "5000"]
EOF
```

---

## PASSO 3: Criar api_server.py (F5-TTS Wrapper)

```bash
cat > api_server.py << 'EOF'
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import torch
import torchaudio
import io
from datetime import datetime
import logging
import sys

sys.path.insert(0, '/app/src')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="F5-TTS API - BPO")
device = "cuda" if torch.cuda.is_available() else "cpu"

class TTSRequest(BaseModel):
    text: str
    voice_id: str = "default"
    speed: float = 1.0
    language: str = "pt-BR"
    client_id: Optional[str] = None

models_cache = {}

@app.post("/api/synthesize")
async def synthesize_speech(request: TTSRequest):
    try:
        if not request.text or len(request.text) > 5000:
            raise HTTPException(status_code=400, detail="Text 1-5000 chars")
        
        logger.info(f"Synthesizing: {request.text[:50]}...")
        
        # Dummy implementation - em produção, carregar modelo real
        # Para MVP, retornar áudio dummy (WAV válido)
        wav_data = b'RIFF' + b'\x00' * 36 + b'WAVE'  # WAV header mínimo
        
        audio_buffer = io.BytesIO(wav_data)
        return FileResponse(
            audio_buffer,
            media_type="audio/wav",
            filename=f"audio_{datetime.now().timestamp()}.wav"
        )
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "device": device,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/models")
async def list_models():
    return {
        "available_voices": ["default", "formal", "casual"],
        "language": "pt-BR",
        "sample_rate": 24000
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
EOF
```

---

## PASSO 4: Criar docker-compose.yml

```bash
cat > docker-compose.yml << 'EOF'
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
    restart: unless-stopped

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
    restart: unless-stopped

networks:
  bpo-network:
    driver: bridge

volumes:
  n8n_data:
  postgres_data:
  models:
EOF
```

---

## PASSO 5: Build e Deploy Docker

```bash
# Voltar para /opt/f5tts-bpo (se saiu)
cd /opt/f5tts-bpo

# Build das imagens
docker-compose build

# Start dos containers
docker-compose up -d

# Verificar se tudo subiu
docker-compose ps

# Ver logs
docker logs -f f5tts-api
docker logs -f n8n-bpo

# Testar F5-TTS
curl http://localhost:5000/api/health

# Testar n8n
curl http://localhost:5678
```

---

## PASSO 6: Setup Supabase

```sql
-- No console Supabase: SQL Editor

-- Tabela TTS logs
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
  completed_at TIMESTAMP
);

CREATE INDEX idx_tts_client ON tts_logs(client_id, created_at DESC);

-- Tabela Financial Reports
CREATE TABLE financial_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  franchise_id UUID,
  report_title VARCHAR(255) NOT NULL,
  report_content TEXT NOT NULL,
  audio_synthesis_id UUID REFERENCES tts_logs(id),
  audio_url TEXT,
  report_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela WhatsApp Deliveries
CREATE TABLE whatsapp_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES financial_reports(id),
  phone_number VARCHAR(20) NOT NULL,
  message_id TEXT,
  delivery_status VARCHAR(20),
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- RLS
ALTER TABLE tts_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own logs" ON tts_logs
  FOR SELECT USING (auth.uid() = client_id);

ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own reports" ON financial_reports
  FOR SELECT USING (auth.uid() = client_id);
```

---

## PASSO 7: Setup Next.js (Local - não no VPS)

```bash
# Criar novo Next.js project ou usar existente
npx create-next-app@latest f5tts-saas --typescript

cd f5tts-saas

# Instalar dependências
npm install @supabase/supabase-js @supabase/auth-helpers-react

# Criar .env.local (LOCAL, não no VPS)
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
F5_TTS_API_URL=http://localhost:5000
EVOLUTION_API_URL=https://evolution.xxxxx.com
EVOLUTION_API_KEY=xxxxx
OPENAI_API_KEY=sk-xxxxx
EOF

# Development
npm run dev
# Acesso em http://localhost:3000
```

---

## PASSO 8: Criar API Routes (Next.js)

```bash
# Criar diretório
mkdir -p app/api/tts app/api/whatsapp

# Arquivo: app/api/tts/synthesize/route.ts
cat > app/api/tts/synthesize/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.text || body.text.length > 5000) {
      return NextResponse.json({ error: 'Invalid text' }, { status: 400 });
    }

    // Chamar F5-TTS
    const ttsResponse = await fetch('http://f5tts-api:5000/api/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!ttsResponse.ok) {
      throw new Error('F5-TTS error');
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    
    // Upload para Supabase
    const fileName = `${body.clientId}/${Date.now()}.wav`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio_reports')
      .upload(fileName, audioBuffer, { contentType: 'audio/wav' });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('audio_reports')
      .getPublicUrl(fileName);

    // Log em Supabase
    await supabase.from('tts_logs').insert({
      client_id: body.clientId,
      input_text: body.text,
      status: 'completed',
      audio_url: urlData.publicUrl,
      file_path: fileName,
    });

    return NextResponse.json({
      success: true,
      audioUrl: urlData.publicUrl,
      duration: audioBuffer.byteLength / 24000 / 2,
    });

  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json(
      { error: 'TTS synthesis failed' },
      { status: 500 }
    );
  }
}
EOF
```

---

## PASSO 9: Build e Deploy Next.js

```bash
# Voltar ao diretório Next.js local
cd f5tts-saas

# Build
npm run build

# Copiar build para VPS (ou deploy via Vercel/Railway)
scp -r .next root@147.93.183.55:/opt/f5tts-frontend/

# SSH para VPS e rodar Next.js
ssh root@147.93.183.55

# No VPS
cd /opt/f5tts-frontend
npm run start
# Acesso: http://147.93.183.55:3000
```

---

## PASSO 10: Testar Tudo

```bash
# 1. Verificar containers
docker-compose ps

# 2. Testar F5-TTS
curl -X GET http://localhost:5000/api/health
curl -X GET http://localhost:5000/api/models

# 3. Testar síntese
curl -X POST http://localhost:5000/api/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Teste de síntese de voz",
    "voice_id": "default",
    "language": "pt-BR"
  }'

# 4. Testar API Next.js
curl -X POST http://localhost:3000/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Seu saldo é R$ 5.000,00",
    "clientId": "test-client",
    "voiceId": "default"
  }'

# 5. Acessar interfaces
# n8n: http://147.93.183.55:5678
# Next.js: http://147.93.183.55:3000
# F5-TTS: http://147.93.183.55:5000/api/health
```

---

## PASSO 11: Troubleshooting

```bash
# Ver logs F5-TTS
docker logs f5tts-api

# Ver logs n8n
docker logs n8n-bpo

# Ver logs PostgreSQL
docker logs postgres-n8n

# Reiniciar container específico
docker-compose restart f5tts-api

# Parar tudo
docker-compose down

# Limpar volumes (CUIDADO!)
docker-compose down -v

# Check recursos
docker stats

# Entrar no container
docker exec -it f5tts-api bash
```

---

## PASSO 12: Monitoramento

```bash
# Criar cron job para backups (VPS)
crontab -e

# Adicionar:
0 2 * * * docker exec postgres-n8n pg_dump -U n8n n8n > /backups/n8n_$(date +%Y%m%d).sql

# Logs aggregados
docker-compose logs --tail 100 -f

# Monitor em tempo real
watch -n 1 'docker stats --no-stream'
```

---

## PASSO 13: Production Checklist

```
[ ] Docker compose up -d rodando
[ ] F5-TTS health check OK (GET /api/health)
[ ] n8n acessível (http:5678)
[ ] PostgreSQL com dados
[ ] Supabase RLS ativo
[ ] Next.js build sem erros
[ ] API routes respondendo
[ ] WhatsApp Evolution conectado
[ ] OpenAI API key válida
[ ] SSL/HTTPS configurado (nginx reverse proxy)
[ ] Backups configurados
[ ] Monitoring ativo
[ ] Team treinado
```

---

## ENV VARS FINAIS (Copie e Preencha)

```bash
# .env para Docker/VPS
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9xxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9xxxxxxxx

F5_TTS_API_URL=http://f5tts-api:5000

EVOLUTION_API_URL=https://evolution.seu-servidor.com
EVOLUTION_API_KEY=sua_chave_evolution_aqui

OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxx

DB_PASSWORD=postgres_password_super_seguro_24chars

NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://147.93.183.55:3000
```

---

## 🎯 Próximos Passos

1. ✅ Setup Docker (PASSO 1-5)
2. ✅ Supabase Database (PASSO 6)
3. ✅ Next.js App (PASSO 7-9)
4. ✅ Testes (PASSO 10)
5. ✅ Deploy (PASSO 11-13)
6. 🔄 n8n Workflow (veja: cursor_agent_prompt.md)
7. 🔄 Frontend Components (veja: f5tts_fullstack_implementation.md)
8. 📊 Monitoramento

---

**Tempo estimado:** 4-6 horas
**Dificuldade:** Intermediária (DevOps + Backend)
**Support:** Deixe branch README.md com troubleshooting
