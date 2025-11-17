/**
 * Serviço para identificar perfil e segmento de atuação de empresas
 * Baseado em CNPJ e dados cadastrais
 */

export interface CompanyProfile {
  cnpj: string;
  nomeEmpresa: string;
  grupoEmpresarial: string;
  segmentosPrincipais: string[];
  palavrasChave: string[];
  descricaoNegocio: string;
  concorrentes: string[];
  tendenciasRelevantes: string[];
}

// Mapeamento de palavras-chave nos nomes das empresas para identificar segmento
const SEGMENT_KEYWORDS = {
  bpo: ['bpo', 'terceirização', 'outsourcing', 'serviços', 'processos'],
  tecnologia: ['software', 'tech', 'tecnologia', 'sistemas', 'digital', 'ti'],
  consultoria: ['consultoria', 'consulting', 'advisory', 'gestão'],
  rh: ['rh', 'recursos humanos', 'people', 'talentos', 'recrutamento'],
  financeiro: ['financeira', 'crédito', 'banco', 'fundo', 'investimento'],
  saude: ['saúde', 'hospital', 'clínica', 'médico', 'farmácia'],
  educacao: ['educação', 'escola', 'universidade', 'curso', 'ensino'],
  varejo: ['varejo', 'loja', 'comércio', 'mercado', 'shopping'],
  industria: ['indústria', 'fábrica', 'manufatura', 'produção'],
  logistica: ['logística', 'transporte', 'distribuição', 'armazém']
};

const SEGMENT_PROFILES = {
  bpo: {
    descricao: 'Empresa especializada em Business Process Outsourcing (BPO), oferecendo serviços de terceirização de processos de negócios, gestão administrativa, financeira e de recursos humanos',
    concorrentes: ['Atento', 'Stefanini', 'TCS Brasil', 'Accenture', 'Teleperformance', 'Contax', 'Almaviva'],
    tendencias: [
      'inteligência artificial processos empresariais',
      'automação RPA robótica',
      'trabalho remoto híbrido gestão',
      'ESG sustentabilidade empresas',
      'transformação digital empresas',
      'experiência do cliente CX'
    ],
    palavrasChaveNoticias: ['bpo', 'terceirização', 'outsourcing', 'processos de negócio', 'gestão empresarial']
  },
  tecnologia: {
    descricao: 'Empresa de tecnologia focada em desenvolvimento de software, soluções digitais e transformação tecnológica',
    concorrentes: ['Microsoft', 'Oracle', 'SAP', 'Salesforce', 'Totvs', 'Senior'],
    tendencias: [
      'inteligência artificial generativa',
      'cloud computing nuvem',
      'cibersegurança proteção dados',
      'blockchain web3',
      'DevOps CI/CD',
      'microserviços arquitetura'
    ],
    palavrasChaveNoticias: ['tecnologia', 'software', 'inovação digital', 'transformação digital', 'TI']
  },
  consultoria: {
    descricao: 'Consultoria empresarial especializada em estratégia, gestão e otimização de processos organizacionais',
    concorrentes: ['McKinsey', 'BCG', 'Bain', 'Deloitte', 'PwC', 'EY', 'KPMG'],
    tendencias: [
      'consultoria estratégica digital',
      'transformação organizacional',
      'gestão de mudanças',
      'excelência operacional',
      'analytics big data',
      'governança corporativa'
    ],
    palavrasChaveNoticias: ['consultoria', 'estratégia empresarial', 'gestão organizacional', 'advisory']
  },
  rh: {
    descricao: 'Especialista em gestão de recursos humanos, recrutamento, seleção e desenvolvimento de talentos',
    concorrentes: ['Randstad', 'Adecco', 'ManpowerGroup', 'Robert Half', 'Page Personnel'],
    tendencias: [
      'people analytics dados RH',
      'employee experience experiência colaborador',
      'diversidade inclusão empresas',
      'wellbeing saúde mental trabalho',
      'upskilling reskilling talentos',
      'employer branding marca empregadora'
    ],
    palavrasChaveNoticias: ['recursos humanos', 'gestão de talentos', 'recrutamento', 'people management']
  },
  financeiro: {
    descricao: 'Instituição financeira focada em serviços bancários, crédito, investimentos e gestão financeira',
    concorrentes: ['Itaú', 'Bradesco', 'Santander', 'Banco do Brasil', 'Nubank', 'BTG Pactual'],
    tendencias: [
      'open banking open finance',
      'fintechs pagamentos digitais',
      'blockchain DeFi finanças',
      'regulação financeira BACEN',
      'crédito digital análise risco',
      'ESG investimentos sustentáveis'
    ],
    palavrasChaveNoticias: ['mercado financeiro', 'bancos', 'crédito', 'investimentos', 'finanças']
  }
};

/**
 * Identifica o segmento de atuação baseado no nome da empresa
 */
function identificarSegmento(nomeEmpresa: string, grupoEmpresarial: string): string {
  const texto = `${nomeEmpresa} ${grupoEmpresarial}`.toLowerCase();
  
  for (const [segmento, keywords] of Object.entries(SEGMENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (texto.includes(keyword)) {
        return segmento;
      }
    }
  }
  
  return 'bpo'; // Default para BPO se não identificar
}

/**
 * Gera perfil completo da empresa baseado em dados cadastrais
 */
export async function gerarPerfilEmpresa(
  cnpj: string,
  nomeEmpresa: string,
  grupoEmpresarial: string
): Promise<CompanyProfile> {
  
  const segmento = identificarSegmento(nomeEmpresa, grupoEmpresarial);
  const profile = SEGMENT_PROFILES[segmento as keyof typeof SEGMENT_PROFILES] || SEGMENT_PROFILES.bpo;
  
  return {
    cnpj,
    nomeEmpresa,
    grupoEmpresarial,
    segmentosPrincipais: [segmento],
    palavrasChave: profile.palavrasChaveNoticias,
    descricaoNegocio: profile.descricao,
    concorrentes: profile.concorrentes,
    tendenciasRelevantes: profile.tendencias
  };
}

/**
 * Gera queries de busca personalizadas para notícias
 */
export function gerarQueriesNoticias(profile: CompanyProfile) {
  return {
    mercado: [
      ...profile.palavrasChave.map(kw => `${kw} Brasil`),
      `${profile.grupoEmpresarial}`,
      `setor ${profile.segmentosPrincipais[0]} Brasil`
    ],
    concorrentes: profile.concorrentes,
    tendencias: profile.tendenciasRelevantes
  };
}

/**
 * Verifica relevância de uma notícia para o perfil da empresa
 */
export function calcularRelevanciaNoticia(
  noticia: { titulo: string; descricao: string },
  profile: CompanyProfile
): number {
  const texto = `${noticia.titulo} ${noticia.descricao}`.toLowerCase();
  
  let score = 0;
  let matches = 0;
  
  // Verificar palavras-chave principais (peso 20)
  profile.palavrasChave.forEach(palavra => {
    const regex = new RegExp(palavra.toLowerCase(), 'g');
    const ocorrencias = (texto.match(regex) || []).length;
    if (ocorrencias > 0) {
      matches++;
      score += ocorrencias * 20;
    }
  });
  
  // Verificar segmentos (peso 15)
  profile.segmentosPrincipais.forEach(segmento => {
    if (texto.includes(segmento.toLowerCase())) {
      score += 15;
      matches++;
    }
  });
  
  // Verificar nome do grupo empresarial (peso 30)
  if (texto.includes(profile.grupoEmpresarial.toLowerCase())) {
    score += 30;
    matches++;
  }
  
  // Bonus se múltiplas palavras-chave presentes
  if (matches > 2) score += 20;
  if (matches > 4) score += 30;
  
  // Normalizar para 0-100
  return Math.min(100, score);
}

/**
 * Formata descrição do negócio com informações da empresa
 */
export function formatarDescricaoEmpresa(profile: CompanyProfile): string {
  return `${profile.grupoEmpresarial} - ${profile.descricaoNegocio}. A empresa atua principalmente no segmento de ${profile.segmentosPrincipais.join(', ')}.`;
}
