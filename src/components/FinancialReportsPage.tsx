/**
 * FinancialReportsPage - Página de Relatórios Financeiros
 * 
 * Página completa que integra:
 * - KPI Cards (5 indicadores)
 * - Tabs DRE / DFC
 * - Tabelas hierárquicas expansíveis
 * - Gráfico de Lucro Bruto
 * - Filtros laterais
 */

import React, { useState, useMemo } from 'react';
import { 
  Calendar, Building2, Filter, ChevronDown, 
  FileText, Wallet, BarChart3, Table2
} from 'lucide-react';

// Componentes (importar do seu projeto)
// import { FinancialKPICards } from './FinancialKPICards';
// import { DREConsolidadaTable } from './DREConsolidadaTable';
// import { DFCTable } from './DFCTable';
// import { LucroBrutoChart } from './LucroBrutoChart';

// ============================================================
// TYPES
// ============================================================

interface DREEntry {
  data: string;
  conta: string;
  natureza: 'receita' | 'despesa';
  valor: number;
}

interface DFCEntry {
  data: string;
  entrada: number;
  saida: number;
  saldo: number;
  descricao?: string;
}

interface FinancialReportsPageProps {
  dreData: DREEntry[];
  dfcData: DFCEntry[];
  empresas?: Array<{ cnpj: string; nome: string }>;
  gruposEmpresariais?: string[];
  selectedEmpresa?: string;
  onEmpresaChange?: (cnpj: string) => void;
}

// ============================================================
// FILTER SIDEBAR COMPONENT
// ============================================================

interface FilterSidebarProps {
  periodo: 'ano' | 'mes';
  setPeriodo: (p: 'ano' | 'mes') => void;
  selectedYear: string;
  setSelectedYear: (y: string) => void;
  selectedTrimestre: string;
  setSelectedTrimestre: (t: string) => void;
  selectedMes: string;
  setSelectedMes: (m: string) => void;
  grupoEmpresarial: string;
  setGrupoEmpresarial: (g: string) => void;
  empresa: string;
  setEmpresa: (e: string) => void;
  gruposDisponiveis: string[];
  empresasDisponiveis: Array<{ cnpj: string; nome: string }>;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  periodo, setPeriodo,
  selectedYear, setSelectedYear,
  selectedTrimestre, setSelectedTrimestre,
  selectedMes, setSelectedMes,
  grupoEmpresarial, setGrupoEmpresarial,
  empresa, setEmpresa,
  gruposDisponiveis,
  empresasDisponiveis
}) => {
  const years = ['2025', '2024', '2023', '2022', '2021'];
  const trimestres = [
    { value: 'todos', label: 'Todos' },
    { value: 'T1', label: 'T1' },
    { value: 'T2', label: 'T2' },
    { value: 'T3', label: 'T3' },
    { value: 'T4', label: 'T4' }
  ];
  const meses = [
    { value: 'todos', label: 'Todos' },
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' }
  ];

  return (
    <div className="bg-[#1a1a2e] rounded-xl p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2 text-white font-semibold">
        <Filter className="w-4 h-4 text-amber-400" />
        <span>Filtros</span>
      </div>

      {/* Período */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-gray-400 font-medium">
          <Calendar className="w-3.5 h-3.5" />
          Período
        </label>
        <div className="flex rounded-lg overflow-hidden border border-gray-700">
          <button
            onClick={() => setPeriodo('ano')}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              periodo === 'ano' 
                ? 'bg-amber-500 text-black' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Ano
          </button>
          <button
            onClick={() => setPeriodo('mes')}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              periodo === 'mes' 
                ? 'bg-amber-500 text-black' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Mês
          </button>
        </div>
      </div>

      {/* Grupo Empresarial */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-gray-400 font-medium">
          <Building2 className="w-3.5 h-3.5" />
          Grupo Empresarial
        </label>
        <div className="relative">
          <select
            value={grupoEmpresarial}
            onChange={(e) => setGrupoEmpresarial(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer hover:border-gray-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-colors"
          >
            {gruposDisponiveis.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Empresa */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-gray-400 font-medium">
          <Building2 className="w-3.5 h-3.5" />
          Empresa
        </label>
        <div className="relative">
          <select
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer hover:border-gray-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-colors"
          >
            {empresasDisponiveis.map(e => (
              <option key={e.cnpj} value={e.cnpj}>{e.nome}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Ano */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-gray-400 font-medium">
          <Calendar className="w-3.5 h-3.5" />
          Ano
        </label>
        <div className="relative">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer hover:border-gray-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-colors"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Trimestre */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400 font-medium">Trimestre</label>
        <div className="relative">
          <select
            value={selectedTrimestre}
            onChange={(e) => setSelectedTrimestre(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer hover:border-gray-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-colors"
          >
            {trimestres.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Mês */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400 font-medium">Mês</label>
        <div className="relative">
          <select
            value={selectedMes}
            onChange={(e) => setSelectedMes(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer hover:border-gray-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-colors"
          >
            {meses.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

// ============================================================
// TABS COMPONENT
// ============================================================

interface TabsProps {
  activeTab: 'DRE' | 'DFC';
  setActiveTab: (tab: 'DRE' | 'DFC') => void;
}

const Tabs: React.FC<TabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-700 bg-[#1a1a2e]">
      <button
        onClick={() => setActiveTab('DRE')}
        className={`flex items-center gap-2 px-6 py-2.5 text-sm font-medium transition-all ${
          activeTab === 'DRE'
            ? 'bg-white text-gray-900'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
      >
        <FileText className="w-4 h-4" />
        DRE
      </button>
      <button
        onClick={() => setActiveTab('DFC')}
        className={`flex items-center gap-2 px-6 py-2.5 text-sm font-medium transition-all ${
          activeTab === 'DFC'
            ? 'bg-white text-gray-900'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
      >
        <Wallet className="w-4 h-4" />
        DFC
      </button>
    </div>
  );
};

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================

export const FinancialReportsPage: React.FC<FinancialReportsPageProps> = ({
  dreData,
  dfcData,
  empresas = [],
  gruposEmpresariais = ['Grupo Volpe'],
  selectedEmpresa,
  onEmpresaChange
}) => {
  // State
  const [activeTab, setActiveTab] = useState<'DRE' | 'DFC'>('DRE');
  const [periodo, setPeriodo] = useState<'ano' | 'mes'>('ano');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedTrimestre, setSelectedTrimestre] = useState('todos');
  const [selectedMes, setSelectedMes] = useState('todos');
  const [grupoEmpresarial, setGrupoEmpresarial] = useState(gruposEmpresariais[0] || 'Grupo Volpe');
  const [empresa, setEmpresa] = useState(selectedEmpresa || empresas[0]?.cnpj || '');

  // Calculate KPIs from DRE data
  const kpis = useMemo(() => {
    const receitas = dreData.filter(d => d.natureza === 'receita');
    const despesas = dreData.filter(d => d.natureza === 'despesa');
    
    const receitaBruta = receitas.reduce((sum, d) => sum + Math.abs(d.valor), 0);
    
    // Estimate impostos (accounts containing imposto, icms, etc)
    const impostos = despesas
      .filter(d => /imposto|icms|ipi|iss|pis|cofins/i.test(d.conta))
      .reduce((sum, d) => sum + Math.abs(d.valor), 0);
    
    const lucroBruto = receitaBruta - impostos;
    
    const despesasOperacionais = despesas
      .filter(d => !/imposto|icms|ipi|iss|pis|cofins|financ|juros|deprecia/i.test(d.conta))
      .reduce((sum, d) => sum + Math.abs(d.valor), 0);
    
    const ebitda = lucroBruto - despesasOperacionais;
    
    const despesasFinanceiras = despesas
      .filter(d => /financ|juros|deprecia|amortiza/i.test(d.conta))
      .reduce((sum, d) => sum + Math.abs(d.valor), 0);
    
    const lucroLiquido = ebitda - despesasFinanceiras;

    return {
      receitaBruta,
      impostos,
      lucroBruto,
      ebitda,
      lucroLiquido,
      variacaoReceitaBruta: 12,
      variacaoImpostos: -5,
      variacaoLucroBruto: 15,
      variacaoEbitda: 18,
      variacaoLucroLiquido: 20
    };
  }, [dreData]);

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard Financeiro</h1>
        <p className="text-sm text-gray-400">Visão geral • Atualizado agora há pouco</p>
      </div>

      {/* KPI Cards - Substituir pelo componente real */}
      <div className="mb-6">
        {/* <FinancialKPICards data={kpis} /> */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Placeholder - usar FinancialKPICards */}
          <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-950/60 rounded-xl p-4 border border-emerald-700/30">
            <span className="text-xs text-gray-400">Receita Bruta</span>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              R$ {(kpis.receitaBruta / 1000000).toFixed(1).replace('.', ',')}M
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-900/40 to-red-950/60 rounded-xl p-4 border border-red-700/30">
            <span className="text-xs text-gray-400">Impostos</span>
            <div className="text-xl font-bold text-red-400 mt-1">
              R$ {(kpis.impostos / 1000).toFixed(0)}K
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-950/60 rounded-xl p-4 border border-emerald-700/30">
            <span className="text-xs text-gray-400">Lucro Bruto</span>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              R$ {(kpis.lucroBruto / 1000000).toFixed(1).replace('.', ',')}M
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-950/60 rounded-xl p-4 border border-blue-700/30">
            <span className="text-xs text-gray-400">EBITDA</span>
            <div className="text-xl font-bold text-blue-400 mt-1">
              R$ {(kpis.ebitda / 1000000).toFixed(1).replace('.', ',')}M
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-900/40 to-amber-950/60 rounded-xl p-4 border border-amber-700/30">
            <span className="text-xs text-gray-400">Lucro Líquido</span>
            <div className="text-xl font-bold text-amber-400 mt-1">
              R$ {(kpis.lucroLiquido / 1000).toFixed(0)}K
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar Filters */}
        <FilterSidebar
          periodo={periodo}
          setPeriodo={setPeriodo}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          selectedTrimestre={selectedTrimestre}
          setSelectedTrimestre={setSelectedTrimestre}
          selectedMes={selectedMes}
          setSelectedMes={setSelectedMes}
          grupoEmpresarial={grupoEmpresarial}
          setGrupoEmpresarial={setGrupoEmpresarial}
          empresa={empresa}
          setEmpresa={(e) => {
            setEmpresa(e);
            onEmpresaChange?.(e);
          }}
          gruposDisponiveis={gruposEmpresariais}
          empresasDisponiveis={empresas}
        />

        {/* Main Content */}
        <div className="space-y-6">
          {/* Tabs */}
          <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Tab Content */}
          {activeTab === 'DRE' ? (
            <div className="space-y-6">
              {/* DRE Table - Substituir pelo componente real */}
              {/* <DREConsolidadaTable data={dreData} year={selectedYear} /> */}
              <div className="bg-[#1a1a2e] rounded-lg p-4">
                <h3 className="text-white font-semibold mb-4">DRE Consolidada</h3>
                <p className="text-gray-400 text-sm">
                  Usar o componente DREConsolidadaTable aqui
                </p>
              </div>

              {/* Chart - Substituir pelo componente real */}
              {/* <LucroBrutoChart data={dreData} year={selectedYear} /> */}
              <div className="bg-[#1a1a2e] rounded-lg p-4">
                <h3 className="text-white font-semibold mb-4">Lucro Bruto por Mês/Ano</h3>
                <p className="text-gray-400 text-sm">
                  Usar o componente LucroBrutoChart aqui
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* DFC Table - Substituir pelo componente real */}
              {/* <DFCTable data={dfcData} year={selectedYear} /> */}
              <div className="bg-[#1a1a2e] rounded-lg p-4">
                <h3 className="text-white font-semibold mb-4">Fluxo de Caixa (DFC)</h3>
                <p className="text-gray-400 text-sm">
                  Usar o componente DFCTable aqui
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialReportsPage;
