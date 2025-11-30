# 🤖 Cursor 2.0 Composite Agent Prompt - F5-TTS BPO SaaS

## Modo: 5 Agentes Simultâneos

Cada agente tem um escopo específico. Use este prompt alimentando cada agent do Cursor com sua seção.

---

## AGENT 1: BACKEND/API (Node.js + Next.js)

### Objetivo
Implementar camada backend completa: API TTS, integração Supabase, rate limiting, logging estruturado.

### Contexto
- Stack: Next.js 14 + TypeScript
- Database: Supabase (PostgreSQL)
- TTS Service: F5-TTS em localhost:5000
- Clientes: 400 → 3000 em 12 meses

### Tasks
1. **API Route: POST /api/tts/synthesize**
   - Valida input text (1-5000 chars, pt-BR)
   - Chama F5-TTS local (http://f5tts-api:5000)
   - Faz upload áudio → Supabase Storage (audio_reports bucket)
   - Registra em Supabase table tts_logs (status, duration, url)
   - Rate limit: 100 req/min por cliente
   - Retry logic: 3 tentativas com exponential backoff
   - Retorna: { audioUrl, duration, logId }

2. **API Route: POST /api/whatsapp/send-report**
   - Recebe: { phone, audioUrl, title, franchiseId? }
   - Valida e limpa número (+55 11 98xxx)
   - Chama Evolution API (EVOLUTION_API_URL)
   - Registra delivery em whatsapp_deliveries table
   - Status: queued → sent → delivered
   - Retorna: { messageId, success }

3. **Supabase Schema SQL**
   ```sql
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

   CREATE TABLE financial_reports (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     franchise_id UUID REFERENCES franchises(id),
     report_title VARCHAR(255) NOT NULL,
     report_content TEXT NOT NULL,
     audio_synthesis_id UUID REFERENCES tts_logs(id),
     audio_url TEXT,
     report_type VARCHAR(50),
     status VARCHAR(20) DEFAULT 'draft',
     created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE TABLE whatsapp_deliveries (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     report_id UUID REFERENCES financial_reports(id),
     phone_number VARCHAR(20) NOT NULL,
     message_id TEXT,
     delivery_status VARCHAR(20),
     sent_at TIMESTAMP,
     created_at TIMESTAMP DEFAULT NOW()
   );

   ALTER TABLE tts_logs ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users see only own logs" ON tts_logs
     FOR SELECT USING (auth.uid() = client_id);
   ```

4. **Utils: lib/tts-client.ts**
   - Classe TTSClient com métodos: synthesize(), getModels(), health()
   - Cache de health check (5min TTL)
   - Logging com correlation_id

5. **Env Vars**
   - F5_TTS_API_URL=http://f5tts-api:5000
   - EVOLUTION_API_URL=https://evolution.xxx.com
   - EVOLUTION_API_KEY=xxx
   - SUPABASE_SERVICE_ROLE_KEY=xxx

### Output
Commit: `feat: backend API routes TTS + WhatsApp integration`

---

## AGENT 2: FRONTEND/UI (React + Components)

### Objetivo
Implementar componentes React para geração de relatórios com áudio e preview.

### Contexto
- Clientes precisam gerar relatórios financeiros em tempo real
- Áudio deve ser previewável e downloadável
- Multi-tenant: cada franchiseado vê apenas seus dados

### Tasks
1. **Component: FinancialReportGenerator**
   - Input: textarea para texto do relatório
   - Estado: loading, error, audioUrl, progress (0-100%)
   - Eventos:
     - Typing: atualiza reportText
     - Submit: chama /api/tts/synthesize
     - Progress: 33% (LLM) → 66% (TTS) → 100% (Upload)
   - Success: mostra <audio controls> com botão download
   - Error: toast + retry button
   - RLS: usa user.id para rastreamento

2. **Hook: useFinancialReport()**
   - generateAndSend(text, phoneNumbers[], franchiseId?)
   - Retorna: { audioUrl, deliveries, loading, error }
   - Gerencia estado + error handling

3. **Component: ReportHistory**
   - Lista últimos 10 relatórios (financial_reports table)
   - Mostra: created_at, status, audio preview
   - Ações: replay, download, resend WhatsApp

4. **Styling**
   - Tailwind + shadcn/ui (ou seu design system)
   - Responsive (mobile-first)
   - Dark mode support
   - Loading skeletons

### Output
Commit: `feat: React components for report generation + audio preview`

---

## AGENT 3: INFRASTRUCTURE/DOCKER (DevOps)

### Objetivo
Setup Docker com F5-TTS, n8n, PostgreSQL no VPS root@147.93.183.55

### Contexto
- VPS: 4GB RAM, 2 CPU cores (mínimo)
- Port 5000: F5-TTS API
- Port 5678: n8n interface
- Port 3000: Next.js dev
- Network: bpo-network (bridge)

### Tasks
1. **Dockerfile: F5-TTS**
   - Base: python:3.11-slim
   - Clone: github.com/SWivid/F5-TTS
   - Download modelo: firstpixel/F5-TTS-pt-br (HF)
   - FastAPI wrapper (api_server.py)
   - CMD: uvicorn api_server:app --host 0.0.0.0 --port 5000
   - Health check: GET /api/health

2. **docker-compose.yml**
   ```yaml
   version: '3.9'
   services:
     f5-tts:
       build: .
       ports: ["5000:5000"]
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
       networks: [bpo-network]
       mem_limit: 6g
       cpus: "2"

     n8n:
       image: n8nio/n8n:latest
       ports: ["5678:5678"]
       environment:
         - N8N_HOST=0.0.0.0
         - N8N_PORT=5678
         - DB_TYPE=postgresdb
         - DB_POSTGRESDB_HOST=postgres
         - DB_POSTGRESDB_USER=n8n
         - DB_POSTGRESDB_PASSWORD=${DB_PASSWORD}
       volumes: [n8n_data:/home/node/.n8n]
       depends_on: [postgres]
       networks: [bpo-network]

     postgres:
       image: postgres:15
       environment:
         - POSTGRES_USER=n8n
         - POSTGRES_PASSWORD=${DB_PASSWORD}
         - POSTGRES_DB=n8n
       volumes: [postgres_data:/var/lib/postgresql/data]
       networks: [bpo-network]

   networks:
     bpo-network:
       driver: bridge

   volumes:
     n8n_data:
     postgres_data:
   ```

3. **Deploy Script**
   ```bash
   #!/bin/bash
   ssh root@147.93.183.55 << 'EOF'
   cd /opt/f5tts-bpo
   docker-compose pull
   docker-compose up -d
   docker-compose logs -f f5tts-api
   EOF
   ```

4. **Monitoring**
   - Log aggregation: docker logs -f <container>
   - Resource check: docker stats
   - Restart policy: unless-stopped

### Output
Commit: `infra: Docker setup F5-TTS + n8n + PostgreSQL`

---

## AGENT 4: WORKFLOW/AUTOMATION (n8n)

### Objetivo
Configurar workflow n8n: Webhook (Evolution) → LLM → F5-TTS → WhatsApp

### Contexto
- Trigger: Cliente envia mensagem via WhatsApp (Evolution webhook)
- LLM: OpenAI gera resposta financeira (prompt especialista)
- TTS: F5-TTS sintetiza para pt-BR
- Delivery: Evolution envia áudio de volta

### Workflow
```
┌─────────────────────┐
│ Webhook Evolution   │ (cliente manda msg)
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Check F5-TTS Health │ (GET /api/health)
└──────────┬──────────┘
           │ (if healthy)
┌──────────▼──────────────────┐
│ OpenAI: Generate Report     │ (system: especialista financeiro)
└──────────┬──────────────────┘
           │
┌──────────▼──────────────────┐
│ Call F5-TTS /api/synthesize │ (POST texto → áudio base64)
└──────────┬──────────────────┘
           │
┌──────────▼──────────────────┐
│ Evolution: Send Audio       │ (WhatsApp para cliente)
└──────────┬──────────────────┘
           │
┌──────────▼──────────────────┐
│ Log em Supabase             │ (whatsapp_deliveries)
└──────────────────────────────┘
```

### Tasks
1. **n8n Workflow Nodes**
   - Webhook Trigger (POST /webhook/financial-report)
   - HTTP Request: Check health F5-TTS
   - OpenAI: Generate report
   - HTTP Request: Call TTS API
   - HTTP Request: Evolution send
   - Supabase Insert: Log delivery

2. **Error Handling**
   - If F5-TTS unhealthy: fallback text-only response
   - If OpenAI fails: retry 2x
   - If Evolution fails: queue para retry manual

3. **Expressions n8n**
   ```
   LLM Prompt:
   "Você é especialista em análise financeira para BPO.
    Cliente perguntou: {{ $json.body.query }}
    Responda em max 300 caracteres de forma técnica."

   TTS Body:
   {
     "text": "{{ $json.message.content }}",
     "clientId": "{{ $json.body.client_id }}",
     "voiceId": "default",
     "speed": 1.0,
     "purpose": "report"
   }

   Evolution Body:
   {
     "number": "{{ $json.body.phone.replace(/\D/g, '') }}",
     "mediaUrl": "{{ $json.tts.audioUrl }}",
     "mediaType": "audio",
     "caption": "📊 Relatório Financeiro"
   }
   ```

### Output
Commit: `workflow: n8n financial report + TTS + WhatsApp`

---

## AGENT 5: INTEGRATION/TESTING (E2E)

### Objetivo
Testar pipeline completo: Webhook → Backend → TTS → WhatsApp

### Contexto
- Volume esperado: 100 msgs/dia inicialmente, 44k em 12 meses
- SLA: latência < 500ms fim-a-fim
- Success rate: > 99%

### Tasks
1. **Integration Tests**
   ```typescript
   // tests/tts-e2e.test.ts
   describe('TTS E2E Pipeline', () => {
     it('should synthesize PT-BR audio', async () => {
       const response = await fetch('/api/tts/synthesize', {
         method: 'POST',
         body: JSON.stringify({
           text: 'Seu saldo é R$ 5.000,00',
           clientId: testUserId,
           purpose: 'report'
         })
       });
       expect(response.status).toBe(200);
       expect(response.json().audioUrl).toBeDefined();
     });

     it('should send audio via WhatsApp', async () => {
       const audioUrl = 'https://storage.supabase.co/...';
       const response = await fetch('/api/whatsapp/send-report', {
         method: 'POST',
         body: JSON.stringify({
           phone: '5511987654321',
           audioUrl,
           title: 'Teste'
         })
       });
       expect(response.status).toBe(200);
       expect(response.json().messageId).toBeDefined();
     });
   });
   ```

2. **Load Testing**
   - Tool: k6 ou Artillery
   - Cenário: 100 sínteses simultâneas
   - Target: < 2s latência p95
   - CPU/RAM: < 80% pico

3. **Monitoring Setup**
   - Prometheus + Grafana (opcional)
   - Datadog/New Relic (opcional)
   - CloudWatch logs (Supabase)
   - Alerts: TTS health, WhatsApp delivery rate

4. **Manual Testing Checklist**
   ```
   [ ] F5-TTS API respondendo em localhost:5000
   [ ] Síntese pt-BR: "Seu saldo é R$ 5.000,00"
   [ ] Áudio salvo em Supabase Storage
   [ ] Log criado em tts_logs com status=completed
   [ ] Envio WhatsApp OK
   [ ] Delivery status atualizado
   [ ] Dark mode funciona
   [ ] Mobile responsive
   [ ] Error handling (network down, quota exceeded)
   [ ] Retry logic executando
   ```

### Output
Commit: `test: E2E integration tests + load testing`

---

## 🔗 Coordenação Entre Agentes

### Git Workflow
```
main (protegido)
├── feat/backend-api (Agent 1) → PR
├── feat/frontend-ui (Agent 2) → PR
├── feat/docker-infra (Agent 3) → PR
├── feat/n8n-workflow (Agent 4) → PR
└── feat/e2e-testing (Agent 5) → PR

Merge order: 3 (infra) → 1 (backend) → 2 (frontend) → 4 (workflow) → 5 (testing)
```

### Dependency Matrix
```
Agent 3 (Docker) 
  ↓
Agent 1 (Backend) + Agent 4 (n8n workflow)
  ↓
Agent 2 (Frontend) + Agent 5 (Testing)
```

### Daily Standup Format
1. Agent 1: "Implementei API /api/tts/synthesize, falta rate limit"
2. Agent 2: "Component FinancialReportGenerator pronto, aguardando Agent 1"
3. Agent 3: "Docker compose up, F5-TTS healthy check"
4. Agent 4: "Workflow testado com mock LLM"
5. Agent 5: "Pronto para E2E quando Agents 1-4 terminarem"

### Communication
- Slack: #f5tts-development
- Issues: GitHub Project (Board Kanban)
- PRs: Code review antes de merge

---

## 📋 Acceptance Criteria

### Agent 1 (Backend)
- [ ] API routes testadas (Postman/curl)
- [ ] Rate limit funcionando
- [ ] Logs em Supabase
- [ ] Error handling robusto
- [ ] PR com >80% code coverage

### Agent 2 (Frontend)
- [ ] Components renderizam sem erro
- [ ] Audio preview funciona
- [ ] Download de áudio OK
- [ ] Responsivo (mobile + desktop)
- [ ] Accessibility: WCAG 2.1 AA

### Agent 3 (Infrastructure)
- [ ] docker-compose up -d funciona
- [ ] Health checks passing
- [ ] Logs agregados
- [ ] Zero downtime restarts
- [ ] VPS monitored (CPU/RAM/Disk)

### Agent 4 (Workflow)
- [ ] Webhook recebe requisição
- [ ] F5-TTS health check OK
- [ ] LLM gera resposta
- [ ] TTS sintetiza áudio
- [ ] WhatsApp entrega
- [ ] Log salvo

### Agent 5 (Testing)
- [ ] E2E tests passam
- [ ] Load test: p95 < 2s
- [ ] Success rate > 99%
- [ ] Manual QA checklist 100%
- [ ] Production-ready

---

## ⏱️ Timeline Estimado

- **Agent 3:** 2-4h (Docker)
- **Agent 1:** 4-6h (Backend, depende de Agent 3)
- **Agent 2:** 3-5h (Frontend, depende de Agent 1)
- **Agent 4:** 2-4h (n8n, paralelo com Agents 1-2)
- **Agent 5:** 3-6h (Testing, depende todos)

**Total:** ~14-25h (com paralelização simultânea)

---

## 🚀 Launch Checklist

- [ ] Todos agentes mergeram PRs
- [ ] Production build nextjs: `npm run build`
- [ ] Docker images built e pushed
- [ ] Supabase migrations aplicadas
- [ ] Environment vars setadas no VPS
- [ ] Backups configurados
- [ ] Monitoring alerts ativas
- [ ] Team treinado
- [ ] Go/No-go decision: ✅ GO

---

**Version:** 1.0
**Last Updated:** 2025-11-06
**Status:** Ready for Implementation
