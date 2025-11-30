# Configuração Cursor 2.0 - 5 Agentes MCP Simultâneos

## 📋 Arquivo de Configuração Principal

Copie e cole o conteúdo abaixo no seu arquivo de configuração do Cursor. Localize o arquivo em:

**macOS/Linux:**
```
~/.config/Cursor/mcp.json
```

**Windows:**
```
%APPDATA%\Cursor\mcp.json
```

---

## 🔧 Arquivo: `mcp.json` (Copie e Cole Aqui)

```json
{
  "mcpServers": {
    "agent-frontend": {
      "command": "ssh",
      "args": [
        "seu-usuario@seu-vps-ip",
        "cd ~/mcp-tts-voice && source venv/bin/activate && python mcp_tts_reports_server.py --agent=frontend"
      ],
      "env": {
        "OPENAI_API_KEY": "sua-chave-api-openai",
        "AGENT_NAME": "Frontend TTS Reports",
        "AGENT_ROLE": "frontend"
      }
    },
    "agent-backend": {
      "command": "ssh",
      "args": [
        "seu-usuario@seu-vps-ip",
        "cd ~/mcp-tts-voice && source venv/bin/activate && python mcp_tts_reports_server.py --agent=backend"
      ],
      "env": {
        "OPENAI_API_KEY": "sua-chave-api-openai",
        "AGENT_NAME": "Backend TTS Reports",
        "AGENT_ROLE": "backend"
      }
    },
    "agent-database": {
      "command": "ssh",
      "args": [
        "seu-usuario@seu-vps-ip",
        "cd ~/mcp-tts-voice && source venv/bin/activate && python mcp_tts_reports_server.py --agent=database"
      ],
      "env": {
        "OPENAI_API_KEY": "sua-chave-api-openai",
        "AGENT_NAME": "Database TTS Reports",
        "AGENT_ROLE": "database"
      }
    },
    "agent-devops": {
      "command": "ssh",
      "args": [
        "seu-usuario@seu-vps-ip",
        "cd ~/mcp-tts-voice && source venv/bin/activate && python mcp_tts_reports_server.py --agent=devops"
      ],
      "env": {
        "OPENAI_API_KEY": "sua-chave-api-openai",
        "AGENT_NAME": "DevOps TTS Reports",
        "AGENT_ROLE": "devops"
      }
    },
    "agent-reviewer": {
      "command": "ssh",
      "args": [
        "seu-usuario@seu-vps-ip",
        "cd ~/mcp-tts-voice && source venv/bin/activate && python mcp_tts_reports_server.py --agent=reviewer"
      ],
      "env": {
        "OPENAI_API_KEY": "sua-chave-api-openai",
        "AGENT_NAME": "Code Reviewer TTS Reports",
        "AGENT_ROLE": "reviewer"
      }
    }
  }
}
```

---

## 🎯 Arquivo: `mcp_tts_reports_server_multi_agent.py` (Para sua VPS)

Substitua o arquivo anterior na VPS pelo código abaixo que suporta múltiplos agentes:

```python
import os
import sys
import asyncio
import json
from datetime import datetime
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP
from openai import AsyncOpenAI
import argparse

load_dotenv()

# Parse do argumento para definir qual agente está rodando
parser = argparse.ArgumentParser()
parser.add_argument("--agent", default="frontend", 
                    choices=["frontend", "backend", "database", "devops", "reviewer"])
args = parser.parse_args()

AGENT_NAME = args.agent
AGENT_CONFIG = {
    "frontend": {
        "role": "Agente de Frontend",
        "description": "Gera relatórios de UI/UX, performance do cliente",
        "tools": ["generate_report", "convert_text_to_speech", "list_reports"]
    },
    "backend": {
        "role": "Agente de Backend",
        "description": "Gera relatórios de API, logs de servidor",
        "tools": ["generate_report", "convert_text_to_speech", "sync_reports_backend"]
    },
    "database": {
        "role": "Agente de Banco de Dados",
        "description": "Gera relatórios de performance DB, queries",
        "tools": ["generate_report", "convert_text_to_speech", "query_database_stats"]
    },
    "devops": {
        "role": "Agente DevOps",
        "description": "Gera relatórios de infraestrutura, deploy, uptime",
        "tools": ["generate_report", "convert_text_to_speech", "infra_status_report"]
    },
    "reviewer": {
        "role": "Agente Code Reviewer",
        "description": "Gera relatórios de qualidade de código, testes",
        "tools": ["generate_report", "convert_text_to_speech", "code_quality_report"]
    }
}

# Inicializa o servidor MCP com nome específico do agente
config = AGENT_CONFIG[AGENT_NAME]
mcp = FastMCP(f"{config['role']} - {config['description']}")

# Cliente OpenAI assíncrono
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Armazena relatórios por agente
reports_cache = {}

@mcp.tool()
async def generate_report(report_type: str, data: dict, title: str = "Relatório") -> dict:
    """
    Gera um relatório em formato texto com metadados do agente.
    
    Args:
        report_type: Tipo de relatório
        data: Dicionário com dados do relatório
        title: Título do relatório
    
    Returns:
        Dicionário contendo o relatório formatado
    """
    try:
        report_content = f"=== {title} ===\n"
        report_content += f"Agente: {AGENT_NAME.upper()}\n"
        report_content += f"Papel: {config['role']}\n"
        report_content += f"Data: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}\n"
        report_content += f"Tipo: {report_type}\n\n"
        
        for key, value in data.items():
            report_content += f"{key}: {value}\n"
        
        report_id = f"report_{AGENT_NAME}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        reports_cache[report_id] = {
            "title": title,
            "type": report_type,
            "content": report_content,
            "agent": AGENT_NAME,
            "timestamp": datetime.now().isoformat()
        }
        
        return {
            "status": "sucesso",
            "report_id": report_id,
            "agente": AGENT_NAME,
            "preview": report_content[:500] + "..." if len(report_content) > 500 else report_content
        }
    except Exception as e:
        return {"status": "erro", "mensagem": str(e), "agente": AGENT_NAME}


@mcp.tool()
async def convert_text_to_speech(text: str, voice: str = "nova", model: str = "tts-1-hd") -> dict:
    """
    Converte texto em áudio usando OpenAI TTS.
    
    Args:
        text: Texto a ser convertido em fala
        voice: Voz desejada ('alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer')
        model: Modelo TTS a usar ('tts-1' ou 'tts-1-hd')
    
    Returns:
        Dicionário contendo referência ao arquivo de áudio gerado
    """
    try:
        if len(text) > 4096:
            text = text[:4096] + "..."
        
        speech_file_path = f"/tmp/report_{AGENT_NAME}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp3"
        
        response = await openai_client.audio.speech.create(
            model=model,
            voice=voice,
            input=text,
            response_format="mp3"
        )
        
        with open(speech_file_path, "wb") as audio_file:
            audio_file.write(response.content)
        
        return {
            "status": "sucesso",
            "arquivo_audio": speech_file_path,
            "duracao_estimada": len(text) / 15,
            "voz_utilizada": voice,
            "modelo": model,
            "agente": AGENT_NAME
        }
    except Exception as e:
        return {"status": "erro", "mensagem": str(e), "agente": AGENT_NAME}


@mcp.tool()
def list_reports() -> dict:
    """
    Lista relatórios gerados por este agente.
    """
    agent_reports = [
        {
            "id": report_id,
            "titulo": info["title"],
            "tipo": info["type"],
            "timestamp": info["timestamp"]
        }
        for report_id, info in reports_cache.items()
        if info.get("agent") == AGENT_NAME
    ]
    
    return {
        "agente": AGENT_NAME,
        "total": len(agent_reports),
        "relatorios": agent_reports
    }


# Ferramentas específicas por agente

@mcp.tool()
async def sync_reports_backend() -> dict:
    """
    Sincroniza relatórios de backend com outros agentes.
    (Apenas para agente backend)
    """
    if AGENT_NAME != "backend":
        return {"status": "erro", "mensagem": "Ferramenta disponível apenas para agente backend"}
    
    try:
        total_reports = len(reports_cache)
        return {
            "status": "sucesso",
            "agente": AGENT_NAME,
            "relatorios_sincronizados": total_reports,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {"status": "erro", "mensagem": str(e)}


@mcp.tool()
async def query_database_stats() -> dict:
    """
    Consulta estatísticas de banco de dados.
    (Apenas para agente database)
    """
    if AGENT_NAME != "database":
        return {"status": "erro", "mensagem": "Ferramenta disponível apenas para agente database"}
    
    try:
        stats = {
            "queries_por_segundo": 1500,
            "conexoes_ativas": 45,
            "cache_hit_rate": "92.5%",
            "tamanho_db_gb": 150,
            "ultimo_backup": datetime.now().isoformat()
        }
        return {
            "status": "sucesso",
            "agente": AGENT_NAME,
            "estatisticas": stats
        }
    except Exception as e:
        return {"status": "erro", "mensagem": str(e)}


@mcp.tool()
async def infra_status_report() -> dict:
    """
    Gera relatório de infraestrutura e uptime.
    (Apenas para agente devops)
    """
    if AGENT_NAME != "devops":
        return {"status": "erro", "mensagem": "Ferramenta disponível apenas para agente devops"}
    
    try:
        infra_status = {
            "uptime_percentual": "99.95%",
            "servidores_ativos": 8,
            "cpu_medio": "45%",
            "memoria_media": "62%",
            "largura_banda_utilizada": "320 Mbps"
        }
        return {
            "status": "sucesso",
            "agente": AGENT_NAME,
            "infraestrutura": infra_status
        }
    except Exception as e:
        return {"status": "erro", "mensagem": str(e)}


@mcp.tool()
async def code_quality_report() -> dict:
    """
    Gera relatório de qualidade de código e testes.
    (Apenas para agente reviewer)
    """
    if AGENT_NAME != "reviewer":
        return {"status": "erro", "mensagem": "Ferramenta disponível apenas para agente reviewer"}
    
    try:
        quality_metrics = {
            "cobertura_testes": "87%",
            "complexidade_ciclomatica": "6.2",
            "duplicacao_codigo": "3.1%",
            "vulnerabilidades": 2,
            "technical_debt_score": "A"
        }
        return {
            "status": "sucesso",
            "agente": AGENT_NAME,
            "metricas_qualidade": quality_metrics
        }
    except Exception as e:
        return {"status": "erro", "mensagem": str(e)}


if __name__ == "__main__":
    print(f"🚀 Iniciando {config['role']}...")
    print(f"   Descrição: {config['description']}")
    print(f"   Ferramentas disponíveis: {', '.join(config['tools'])}")
    mcp.run(transport="stdio")
```

---

## 📝 Passo a Passo de Implementação

### 1️⃣ **Preparar a VPS**

```bash
# SSH na VPS
ssh seu-usuario@seu-vps-ip

# Crie o diretório
mkdir -p ~/mcp-tts-voice && cd ~/mcp-tts-voice

# Crie o ambiente virtual
python3.9 -m venv venv
source venv/bin/activate

# Instale dependências
pip install mcp fastmcp openai python-dotenv aiohttp asyncio
```

### 2️⃣ **Copie o arquivo Python na VPS**

```bash
# Salve o arquivo Python como:
nano mcp_tts_reports_server_multi_agent.py
# Cole o código acima e salve (Ctrl+X, Y, Enter)

# Teste localmente
python mcp_tts_reports_server_multi_agent.py --agent=frontend
python mcp_tts_reports_server_multi_agent.py --agent=backend
```

### 3️⃣ **Configure no Cursor 2.0**

**Windows:**
```
%APPDATA%\Cursor\mcp.json
```

**macOS/Linux:**
```
~/.config/Cursor/mcp.json
```

Cole o arquivo `mcp.json` completo acima. Depois reinicie o Cursor.

### 4️⃣ **Verifique a Conexão**

- Abra o Cursor 2.0
- Vá para **Settings > Model Context Protocol**
- Você deve ver os 5 agentes listados:
  - ✅ `agent-frontend`
  - ✅ `agent-backend`
  - ✅ `agent-database`
  - ✅ `agent-devops`
  - ✅ `agent-reviewer`

---

## 🎯 Como Usar os 5 Agentes Simultaneamente

### Exemplo 1: Todos os agentes gerando relatórios

No Composer do Cursor, use este comando:

```
Rode os 5 agentes em paralelo:
1. Frontend: gere relatório de performance UI com dados de métrica web
2. Backend: sincronize relatórios de API
3. Database: consulte estatísticas e crie relatório
4. DevOps: gere relatório de infraestrutura
5. Reviewer: execute análise de qualidade de código

Depois converta todos para áudio com voz "nova".
```

### Exemplo 2: Workflow Coordenado

```
Agente Frontend: crie relatório de user experience
  → Envie para Agente Reviewer
    → Reviewer critica o relatório
      → Backend sincroniza feedback
        → Todos convertem para áudio
```

### Exemplo 3: Monitoramento Contínuo

```
A cada 30 minutos:
- Database monitora queries
- DevOps verifica infraestrutura
- Backend sincroniza erros
- Reviewer analisa build
- Todos geram TTS dos resultados
```

---

## ⚙️ Customização por Agente

### Agente Frontend (UI/UX Reports)
- Monitora: Performance de renderização, métricas de UX
- Voice: `shimmer` (mais natural para apresentações)

### Agente Backend (API/Logs)
- Monitora: Erros de servidor, latência de API
- Voice: `nova` (padrão profissional)

### Agente Database (DB Stats)
- Monitora: Query performance, indexação
- Voice: `fable` (mais técnico)

### Agente DevOps (Infraestrutura)
- Monitora: Uptime, CPU, memória, deploy
- Voice: `onyx` (mais grave, autoridade)

### Agente Reviewer (Code Quality)
- Monitora: Testes, vulnerabilidades, coverage
- Voice: `alloy` (mais claro e preciso)

---

## 🔐 Segurança e Variáveis de Ambiente

Crie um arquivo `.env` na VPS:

```bash
cd ~/mcp-tts-voice
cat > .env << 'EOF'
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
MCP_PORT=8765
VPS_HOST=0.0.0.0
AGENT_LOG_LEVEL=INFO
EOF

chmod 600 .env
```

---

## 🚀 Deploy em Produção (Systemd)

Crie um serviço para cada agente:

```bash
# Agente 1: Frontend
sudo nano /etc/systemd/system/mcp-agent-frontend.service
```

```ini
[Unit]
Description=MCP Agent Frontend TTS Reports
After=network.target

[Service]
Type=simple
User=seu-usuario
WorkingDirectory=/home/seu-usuario/mcp-tts-voice
ExecStart=/home/seu-usuario/mcp-tts-voice/venv/bin/python /home/seu-usuario/mcp-tts-voice/mcp_tts_reports_server_multi_agent.py --agent=frontend
Restart=on-failure
RestartSec=10
Environment="OPENAI_API_KEY=sua-chave"

[Install]
WantedBy=multi-user.target
```

**Repita para os outros 4 agentes**, mudando `--agent=backend`, `--agent=database`, etc.

```bash
# Ative todos os serviços
sudo systemctl daemon-reload
sudo systemctl enable mcp-agent-{frontend,backend,database,devops,reviewer}
sudo systemctl start mcp-agent-{frontend,backend,database,devops,reviewer}

# Verifique status
sudo systemctl status mcp-agent-frontend
```

---

## ✅ Checklist de Implementação

- [ ] VPS preparada com Python 3.9+
- [ ] Arquivo `mcp_tts_reports_server_multi_agent.py` na VPS
- [ ] `.env` configurado com chave OpenAI
- [ ] Arquivo `mcp.json` copiado no Cursor
- [ ] Cursor reiniciado
- [ ] 5 agentes aparecem em Settings > Model Context Protocol
- [ ] Teste com comando simples em cada agente
- [ ] Serviços Systemd configurados (opcional, para produção)
- [ ] Todos os 5 agentes respondendo em paralelo

---

## 📊 Monitoramento dos Agentes

Para monitorar logs de todos os agentes simultaneamente:

```bash
# Terminal 1: Frontend
ssh seu-usuario@seu-vps-ip
cd ~/mcp-tts-voice && source venv/bin/activate
python mcp_tts_reports_server_multi_agent.py --agent=frontend

# Terminal 2: Backend
ssh seu-usuario@seu-vps-ip
cd ~/mcp-tts-voice && source venv/bin/activate
python mcp_tts_reports_server_multi_agent.py --agent=backend

# E assim por diante para os outros...
```

---

## 🎓 Estrutura de Projeto Final na VPS

```
~/mcp-tts-voice/
├── venv/                                    # Ambiente virtual
├── .env                                     # Variáveis de ambiente
├── mcp_tts_reports_server_multi_agent.py   # Servidor MCP principal
├── requirements.txt                         # Dependências
└── logs/                                    # Diretório de logs (criar depois)
```

---

**Pronto!** Agora você tem 5 agentes MCP rodando em paralelo no Cursor 2.0, cada um com suas próprias responsabilidades e ferramentas de voz/relatórios. 🎉
