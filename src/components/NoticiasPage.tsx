import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { RefreshCw, TrendingUp, TrendingDown, Minus, ExternalLink, Building2, Briefcase, Target } from 'lucide-react';
import { 
  gerarPerfilEmpresa, 
  formatarDescricaoEmpresa,
  type CompanyProfile 
} from '../services/companyProfileService';
import {
  gerarNoticiasMercado,
  gerarNoticiasConcorrentes,
  gerarNoticiasTendencias
} from '../services/noticiasGerador';

interface Noticia {
  id: string;
  titulo: string;
  resumo: string;
  sentimento: 'positivo' | 'neutro' | 'negativo';
  fonte: string;
  data: string;
  url: string;
  relevancia: number;
}

interface NoticiasPageProps {
  cnpj?: string;
  nomeEmpresa?: string;
  grupoEmpresarial?: string;
}

export function NoticiasPage({ 
  cnpj = '26888098000159', 
  nomeEmpresa = 'Volpe BPO',
  grupoEmpresarial = 'Grupo Volpe'
}: NoticiasPageProps) {
  const [loading, setLoading] = useState(false);
  const [empresaInfo, setEmpresaInfo] = useState<string>('');
  const [perfilEmpresa, setPerfilEmpresa] = useState<CompanyProfile | null>(null);
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [concorrentes, setConcorrentes] = useState<Noticia[]>([]);
  const [tendencias, setTendencias] = useState<Noticia[]>([]);

  useEffect(() => {
    buscarInformacaoEmpresa();
    carregarNoticias();
  }, [cnpj, nomeEmpresa, grupoEmpresarial]);

  const buscarInformacaoEmpresa = async () => {
    const perfil = await gerarPerfilEmpresa(cnpj, nomeEmpresa, grupoEmpresarial);
    setPerfilEmpresa(perfil);
    setEmpresaInfo(formatarDescricaoEmpresa(perfil));
  };

  const carregarNoticias = async () => {
    setLoading(true);
    
    try {
      // Gerar perfil se ainda não existir
      let perfil = perfilEmpresa;
      if (!perfil) {
        perfil = await gerarPerfilEmpresa(cnpj, nomeEmpresa, grupoEmpresarial);
        setPerfilEmpresa(perfil);
      }
      
      // Gerar notícias baseadas no perfil da empresa
      // Gera notícias para todo o ano de 2025
      const noticiasMercadoGeradas = gerarNoticiasMercado(perfil, 48); // 4 por mês
      const noticiasConcorrentesGeradas = gerarNoticiasConcorrentes(perfil, 36); // 3 por mês
      const noticiasTendenciasGeradas = gerarNoticiasTendencias(perfil, 48); // 4 por mês
      
      console.log(`📰 Notícias geradas para ${perfil.grupoEmpresarial}:`, {
        mercado: noticiasMercadoGeradas.length,
        concorrentes: noticiasConcorrentesGeradas.length,
        tendencias: noticiasTendenciasGeradas.length
      });
      
      setTimeout(() => {
        setNoticias(noticiasMercadoGeradas);
        setConcorrentes(noticiasConcorrentesGeradas);
        setTendencias(noticiasTendenciasGeradas);
        setLoading(false);
      }, 800);
      
    } catch (error) {
      console.error('Erro ao carregar notícias:', error);
      setLoading(false);
    }
  };

  const getSentimentoBadge = (sentimento: string) => {
    const configs = {
      positivo: { bg: 'bg-green-500/20', text: 'text-green-400', icon: TrendingUp, label: 'Positivo' },
      neutro: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Minus, label: 'Neutro' },
      negativo: { bg: 'bg-red-500/20', text: 'text-red-400', icon: TrendingDown, label: 'Negativo' }
    };
    const config = configs[sentimento as keyof typeof configs];
    const Icon = config.icon;
    
    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${config.bg} ${config.text} text-xs font-semibold`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </div>
    );
  };

  const NoticiaCard = ({ noticia }: { noticia: Noticia }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="neomorphic rounded-2xl p-5 border border-graphite-800/30 hover:border-gold-500/30 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="text-white font-semibold text-base mb-2 line-clamp-2">
            {noticia.titulo}
          </h4>
          <p className="text-graphite-400 text-sm leading-relaxed line-clamp-3">
            {noticia.resumo}
          </p>
        </div>
        <div className="ml-4">
          {getSentimentoBadge(noticia.sentimento)}
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-graphite-800">
        <div className="flex items-center gap-4 text-xs text-graphite-500">
          <span className="font-medium">{noticia.fonte}</span>
          <span>{new Date(noticia.data).toLocaleDateString('pt-BR')}</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gold-500"></span>
            {noticia.relevancia}% relevante
          </span>
        </div>
        <a 
          href={noticia.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-gold-500 hover:text-gold-400 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </motion.div>
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Notícias & Inteligência de Mercado</h1>
          <p className="text-graphite-400">
            Acompanhe tendências, concorrentes e oportunidades do setor • {nomeEmpresa}
          </p>
        </div>
        <Button 
          onClick={carregarNoticias}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Informação da Empresa */}
      <Card className="mb-6 bg-gradient-to-br from-gold-500/10 to-gold-600/5 border-gold-500/20">
        <CardHeader>
          <CardTitle className="text-gold-400 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Sobre a Empresa Analisada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-graphite-300 text-sm leading-relaxed">
            {empresaInfo || 'Carregando informações da empresa...'}
          </p>
          
          {perfilEmpresa && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-gold-500/20">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="w-4 h-4 text-gold-400" />
                  <span className="text-xs font-semibold text-gold-400">Segmento</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {perfilEmpresa.segmentosPrincipais.map(seg => (
                    <span key={seg} className="px-2 py-1 rounded-md bg-gold-500/10 text-gold-400 text-xs">
                      {seg.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-semibold text-blue-400">Concorrentes Principais</span>
                </div>
                <p className="text-graphite-400 text-xs">
                  {perfilEmpresa.concorrentes.slice(0, 3).join(', ')}...
                </p>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-xs font-semibold text-green-400">Palavras-Chave</span>
                </div>
                <p className="text-graphite-400 text-xs">
                  {perfilEmpresa.palavrasChave.slice(0, 3).join(', ')}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="mercado" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="mercado">
            Mercado & Setor
            <span className="ml-2 px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400 text-xs">
              {noticias.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="concorrentes">
            Concorrentes
            <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs">
              {concorrentes.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="tendencias">
            Tendências
            <span className="ml-2 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs">
              {tendencias.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mercado" className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-gold-500 mx-auto mb-4" />
              <p className="text-graphite-400">Carregando notícias do mercado...</p>
            </div>
          ) : (
            noticias.map((noticia) => (
              <NoticiaCard key={noticia.id} noticia={noticia} />
            ))
          )}
        </TabsContent>

        <TabsContent value="concorrentes" className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-graphite-400">Carregando notícias de concorrentes...</p>
            </div>
          ) : (
            concorrentes.map((noticia) => (
              <NoticiaCard key={noticia.id} noticia={noticia} />
            ))
          )}
        </TabsContent>

        <TabsContent value="tendencias" className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
              <p className="text-graphite-400">Carregando tendências do setor...</p>
            </div>
          ) : (
            tendencias.map((noticia) => (
              <NoticiaCard key={noticia.id} noticia={noticia} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
