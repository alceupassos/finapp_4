import React from 'react';
import { Button } from './ui/button';

const Item = ({ label, active=false }: { label: string; active?: boolean }) => (
  <div className={`flex items-center gap-3 px-3 py-2 rounded-xl ${active ? 'bg-[#131A22] text-white' : 'text-gray-300 hover:bg-[#0f141b]'}`}>
    <span className="w-5 h-5 flex items-center justify-center">
      <span className="rounded-sm w-3 h-3 bg-gray-400 inline-block" />
    </span>
    <span className="text-sm">{label}</span>
  </div>
);

export function Sidebar(){
  return (
    <aside className="hidden lg:flex lg:flex-col w-[260px] shrink-0 border-r border-[#121922] bg-[#0a0f14] p-3 gap-3">
      <div className="flex items-center justify-between px-2 pt-1 pb-2">
        <img src="/finapp-logo.png" alt="fin.app" className="h-8" />
        <Button variant="outline" size="icon">
          <svg viewBox="0 0 24 24" className="w-4 h-4"><path fill="currentColor" d="M15 18l-6-6 6-6"/></svg>
        </Button>
      </div>
      <div className="px-2 text-[11px] uppercase tracking-wide text-gray-500">Main menu</div>
      <nav className="grid gap-1">
        <Item label="Dashboard" active />
        <Item label="Analítico" />
        <Item label="Transações" />
        <Item label="Orçamentos" />
        <Item label="Faturas" />
        <Item label="Relatórios" />
      </nav>
      <div className="px-2 pt-4 text-[11px] uppercase tracking-wide text-gray-500">Tools</div>
      <nav className="grid gap-1">
        <Item label="Analytics" />
        <Item label="Assinaturas" />
        <Item label="Categorias" />
        <Item label="Integrações" />
      </nav>
      <div className="mt-auto p-3 rounded-2xl bg-[#0f141b] border border-[#16202b]">
        <div className="text-xs text-gray-300">Avaliação gratuita</div>
        <div className="text-[11px] text-gray-500">10 dias restantes</div>
        <Button variant="default" className="mt-2 w-full">Upgrade</Button>
      </div>
      <div className="grid gap-1">
        <Item label="Configurações" />
        <Item label="Ajuda" />
        <button onClick={() => { localStorage.removeItem('session_user'); localStorage.removeItem('supabase_session'); location.reload() }} className="flex items-center gap-3 px-3 py-2 rounded-xl text-gray-300 hover:bg-[#0f141b]">
          <span className="w-5 h-5 flex items-center justify-center">
            <span className="rounded-sm w-3 h-3 bg-gray-400 inline-block" />
          </span>
          <span className="text-sm">Sair</span>
        </button>
      </div>
    </aside>
  );
}
