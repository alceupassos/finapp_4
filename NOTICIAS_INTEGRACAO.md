# Sistema de Notícias com IA - Guia de Integração

## 📋 Visão Geral

O componente `NoticiasPage.tsx` foi criado com dados simulados. Este documento descreve como integrar APIs reais de notícias e serviços de IA.

## 🎯 Funcionalidades Implementadas

### ✅ Interface Completa
- 3 abas: Mercado & Setor, Concorrentes, Tendências
- Cards de notícias com título, resumo (3 linhas) e badges de sentimento
- Botão de atualização com loading state
- Informações sobre a empresa (contexto)
- Links externos para fontes
- Score de relevância

### ✅ Sentimentos Visuais
- **Positivo**: Badge verde com ícone TrendingUp
- **Neutro**: Badge azul com ícone Minus
- **Negativo**: Badge vermelho com ícone TrendingDown

## 🔧 Implementação Futura - Opções de APIs

### Opção 1: NewsAPI.org (Recomendada)
**Características:**
- 80+ mil fontes de notícias globais
- Busca por palavras-chave, domínio, idioma
- Ordenação por relevância, popularidade, data
- Plano gratuito: 100 requisições/dia
- Plano pago: A partir de $449/mês (500k requisições)

**Exemplo de uso:**
```typescript
// src/services/newsApi.ts
const NEWS_API_KEY = 'SUA_API_KEY';
const BASE_URL = 'https://newsapi.org/v2';

export async function buscarNoticias(query: string, from: string = '2025-01-01') {
  const response = await fetch(
    `${BASE_URL}/everything?q=${query}&from=${from}&language=pt&sortBy=relevancy&apiKey=${NEWS_API_KEY}`
  );
  const data = await response.json();
  return data.articles;
}
```

### Opção 2: Bing News Search API (Microsoft Azure)
**Características:**
- Cobertura global com filtro de idioma
- Categorias pré-definidas (Business, Technology, etc.)
- Metadados ricos (imagem, provedor, data)
- Plano gratuito: 1000 transações/mês
- Plano pago: A partir de $3/1000 transações

**Exemplo de uso:**
```typescript
// src/services/bingNews.ts
const BING_API_KEY = 'SUA_API_KEY';
const BASE_URL = 'https://api.bing.microsoft.com/v7.0/news/search';

export async function buscarNoticias(query: string) {
  const response = await fetch(
    `${BASE_URL}?q=${query}&mkt=pt-BR&count=50`,
    { headers: { 'Ocp-Apim-Subscription-Key': BING_API_KEY } }
  );
  const data = await response.json();
  return data.value;
}
```

### Opção 3: Google News API (SerpAPI)
**Características:**
- Scraping estruturado do Google News
- Resultados sempre atualizados
- Suporte a múltiplos idiomas e regiões
- Plano gratuito: 100 pesquisas/mês
- Plano pago: A partir de $50/mês (5000 pesquisas)

**Exemplo de uso:**
```typescript
// src/services/serpApi.ts
const SERP_API_KEY = 'SUA_API_KEY';
const BASE_URL = 'https://serpapi.com/search';

export async function buscarNoticias(query: string) {
  const response = await fetch(
    `${BASE_URL}?engine=google_news&q=${query}&gl=br&hl=pt&api_key=${SERP_API_KEY}`
  );
  const data = await response.json();
  return data.news_results;
}
```

## 🤖 Integração com IA para Resumos e Sentimentos

### Opção 1: OpenAI GPT-4 (Recomendada)
**Características:**
- Resumos de alta qualidade em 3 linhas
- Análise de sentimento precisa
- Suporte a português
- Preço: ~$0.03 por 1K tokens (input) / $0.06 por 1K tokens (output)

**Implementação:**
```typescript
// src/services/openaiService.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Apenas para desenvolvimento
});

export async function gerarResumoESentimento(titulo: string, conteudo: string) {
  const prompt = `
Analise a seguinte notícia e forneça:
1. Um resumo em exatamente 3 linhas (máximo 280 caracteres)
2. O sentimento (positivo, neutro ou negativo) do ponto de vista de uma empresa de BPO

Título: ${titulo}
Conteúdo: ${conteudo}

Responda APENAS no formato JSON:
{
  "resumo": "Resumo em 3 linhas aqui...",
  "sentimento": "positivo|neutro|negativo"
}
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // Modelo mais barato
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 300
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}
```

### Opção 2: Anthropic Claude (Alternativa)
**Características:**
- Excelente compreensão de contexto
- Bom para análise de sentimento
- Preço: ~$0.015 por 1K tokens (input) / $0.075 por 1K tokens (output)

**Implementação:**
```typescript
// src/services/claudeService.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function gerarResumoESentimento(titulo: string, conteudo: string) {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022', // Modelo mais barato
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Analise esta notícia e retorne JSON com "resumo" (3 linhas) e "sentimento" (positivo/neutro/negativo):\n\n${titulo}\n\n${conteudo}`
    }]
  });

  return JSON.parse(message.content[0].text);
}
```

### Opção 3: Google Gemini (Gratuito até certo limite)
**Características:**
- Plano gratuito generoso
- Boa performance em português
- Fácil integração

**Implementação:**
```typescript
// src/services/geminiService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function gerarResumoESentimento(titulo: string, conteudo: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const prompt = `
Analise esta notícia e retorne JSON com:
- "resumo": 3 linhas sobre o impacto para empresas de BPO
- "sentimento": positivo, neutro ou negativo

Título: ${titulo}
Conteúdo: ${conteudo}
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  return JSON.parse(text);
}
```

## 🔍 Pesquisa de Contexto da Empresa

Para entender o negócio antes de buscar notícias:

```typescript
// src/services/companyResearch.ts
export async function pesquisarEmpresa(nomeEmpresa: string) {
  // Opção 1: Usar SerpAPI para buscar no Google
  const response = await fetch(
    `https://serpapi.com/search?engine=google&q=${nomeEmpresa}+sobre&api_key=${SERP_API_KEY}`
  );
  const data = await response.json();
  
  // Extrair snippet do primeiro resultado
  const snippet = data.organic_results?.[0]?.snippet || '';
  
  // Opção 2: Usar IA para gerar descrição baseada em busca
  const contexto = await gerarContextoEmpresa(nomeEmpresa, snippet);
  
  return contexto;
}

async function gerarContextoEmpresa(nome: string, snippet: string) {
  const prompt = `
Com base nestas informações sobre "${nome}":
${snippet}

Gere uma descrição objetiva de 2-3 linhas sobre:
- Área de atuação
- Principais serviços/produtos
- Segmento de mercado
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 200
  });

  return response.choices[0].message.content;
}
```

## 📊 Cálculo de Relevância

```typescript
// src/services/relevanceScore.ts
export function calcularRelevancia(
  noticia: { titulo: string; descricao: string },
  palavrasChave: string[]
): number {
  const texto = `${noticia.titulo} ${noticia.descricao}`.toLowerCase();
  
  let score = 0;
  let matches = 0;
  
  palavrasChave.forEach(palavra => {
    const regex = new RegExp(palavra.toLowerCase(), 'g');
    const ocorrencias = (texto.match(regex) || []).length;
    if (ocorrencias > 0) {
      matches++;
      score += ocorrencias * 10;
    }
  });
  
  // Bonus se múltiplas palavras-chave presentes
  if (matches > 1) score += 20;
  
  // Normalizar para 0-100
  return Math.min(100, score);
}

// Uso:
const palavrasChaveBPO = [
  'bpo', 'terceirização', 'outsourcing', 'processos',
  'gestão', 'consultoria', 'automação', 'rh'
];

const relevancia = calcularRelevancia(noticia, palavrasChaveBPO);
```

## 🏗️ Estrutura de Serviço Completo

```typescript
// src/services/noticiasService.ts
import { buscarNoticias as buscarNewsAPI } from './newsApi';
import { gerarResumoESentimento } from './openaiService';
import { calcularRelevancia } from './relevanceScore';
import { pesquisarEmpresa } from './companyResearch';

export interface NoticiaProcessada {
  id: string;
  titulo: string;
  resumo: string;
  sentimento: 'positivo' | 'neutro' | 'negativo';
  fonte: string;
  data: string;
  url: string;
  relevancia: number;
}

export async function carregarNoticiasSetor(): Promise<NoticiaProcessada[]> {
  const artigos = await buscarNewsAPI('BPO terceirização Brasil', '2025-01-01');
  
  const noticiasProcessadas = await Promise.all(
    artigos.slice(0, 10).map(async (artigo: any) => {
      const { resumo, sentimento } = await gerarResumoESentimento(
        artigo.title,
        artigo.description
      );
      
      const relevancia = calcularRelevancia(
        { titulo: artigo.title, descricao: artigo.description },
        ['bpo', 'terceirização', 'outsourcing', 'processos']
      );
      
      return {
        id: artigo.url,
        titulo: artigo.title,
        resumo,
        sentimento,
        fonte: artigo.source.name,
        data: artigo.publishedAt,
        url: artigo.url,
        relevancia
      };
    })
  );
  
  // Ordenar por relevância
  return noticiasProcessadas.sort((a, b) => b.relevancia - a.relevancia);
}

export async function carregarNoticiasConcorrentes(): Promise<NoticiaProcessada[]> {
  const concorrentes = ['Atento', 'Stefanini', 'TCS Brasil', 'Accenture'];
  const todasNoticias: NoticiaProcessada[] = [];
  
  for (const concorrente of concorrentes) {
    const artigos = await buscarNewsAPI(concorrente, '2025-01-01');
    const processadas = await processarArtigos(artigos.slice(0, 5));
    todasNoticias.push(...processadas);
  }
  
  return todasNoticias.sort((a, b) => b.relevancia - a.relevancia).slice(0, 15);
}

export async function carregarNoticiasTendencias(): Promise<NoticiaProcessada[]> {
  const tendencias = [
    'inteligência artificial empresas',
    'automação processos',
    'trabalho remoto híbrido',
    'ESG sustentabilidade empresas'
  ];
  
  const todasNoticias: NoticiaProcessada[] = [];
  
  for (const tendencia of tendencias) {
    const artigos = await buscarNewsAPI(tendencia, '2025-01-01');
    const processadas = await processarArtigos(artigos.slice(0, 5));
    todasNoticias.push(...processadas);
  }
  
  return todasNoticias.sort((a, b) => b.relevancia - a.relevancia).slice(0, 15);
}

async function processarArtigos(artigos: any[]): Promise<NoticiaProcessada[]> {
  return Promise.all(artigos.map(async (artigo) => {
    const { resumo, sentimento } = await gerarResumoESentimento(
      artigo.title,
      artigo.description
    );
    
    return {
      id: artigo.url,
      titulo: artigo.title,
      resumo,
      sentimento,
      fonte: artigo.source.name,
      data: artigo.publishedAt,
      url: artigo.url,
      relevancia: Math.floor(Math.random() * 30) + 70 // Mock, substituir por cálculo real
    };
  }));
}
```

## 🔄 Atualização do Componente NoticiasPage

```typescript
// Substituir a função carregarNoticias() em NoticiasPage.tsx:
const carregarNoticias = async () => {
  setLoading(true);
  
  try {
    // Carregar contexto da empresa
    const info = await pesquisarEmpresa('Grupo Volpe BPO');
    setEmpresaInfo(info);
    
    // Carregar notícias em paralelo
    const [mercado, concorrentesData, tendenciasData] = await Promise.all([
      carregarNoticiasSetor(),
      carregarNoticiasConcorrentes(),
      carregarNoticiasTendencias()
    ]);
    
    setNoticias(mercado);
    setConcorrentes(concorrentesData);
    setTendencias(tendenciasData);
  } catch (error) {
    console.error('Erro ao carregar notícias:', error);
    // Fallback para dados simulados se API falhar
  } finally {
    setLoading(false);
  }
};
```

## 💾 Cache para Reduzir Custos

```typescript
// src/services/cacheService.ts
const CACHE_DURATION = 1000 * 60 * 60; // 1 hora

interface CacheEntry {
  data: any;
  timestamp: number;
}

class CacheService {
  private cache = new Map<string, CacheEntry>();
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  clear(): void {
    this.cache.clear();
  }
}

export const cache = new CacheService();

// Uso:
export async function carregarNoticiasComCache(tipo: string) {
  const cacheKey = `noticias_${tipo}`;
  const cached = cache.get(cacheKey);
  
  if (cached) return cached;
  
  const noticias = await carregarNoticias(tipo);
  cache.set(cacheKey, noticias);
  
  return noticias;
}
```

## 📝 Variáveis de Ambiente

Criar arquivo `.env.local`:

```env
# APIs de Notícias (escolher uma)
VITE_NEWS_API_KEY=sua_chave_newsapi
VITE_BING_API_KEY=sua_chave_bing
VITE_SERP_API_KEY=sua_chave_serpapi

# APIs de IA (escolher uma)
VITE_OPENAI_API_KEY=sua_chave_openai
VITE_ANTHROPIC_API_KEY=sua_chave_anthropic
VITE_GEMINI_API_KEY=sua_chave_gemini
```

## 🚀 Próximos Passos

1. **Escolher API de Notícias**: NewsAPI.org (recomendado para começar)
2. **Escolher API de IA**: OpenAI GPT-4o-mini (melhor custo-benefício)
3. **Criar contas e obter API keys**
4. **Instalar dependências**:
   ```bash
   npm install openai @anthropic-ai/sdk @google/generative-ai
   ```
5. **Implementar serviços** conforme exemplos acima
6. **Testar com dados reais**
7. **Implementar cache** para reduzir custos
8. **Monitorar uso de API** e ajustar limites

## 💰 Estimativa de Custos (Exemplo)

**Cenário**: 100 usuários, 50 atualizações de notícias/dia

- **NewsAPI**: Plano gratuito (100 req/dia) ou $29/mês (1000 req/dia)
- **OpenAI GPT-4o-mini**: ~$0.15/1000 requisições
  - 50 atualizações × 30 artigos = 1500 chamadas/dia
  - 1500 × 30 dias × $0.00015 = **~$6.75/mês**

**Total estimado**: $35/mês (NewsAPI pago + OpenAI)

## 📚 Recursos Úteis

- [NewsAPI Docs](https://newsapi.org/docs)
- [Bing News Search API](https://www.microsoft.com/en-us/bing/apis/bing-news-search-api)
- [SerpAPI Google News](https://serpapi.com/google-news-api)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Google Gemini API](https://ai.google.dev/tutorials/get_started_web)
