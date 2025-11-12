import React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar } from './ui/avatar';
import { ImporterExcel } from './ImporterExcel';
import { Tooltip } from './ui/tooltip';
import { toast } from 'sonner';

export function Topbar({ onImport }:{ onImport:(p:any)=>void }){
  return (
    <header className="sticky top-0 z-30 border-b border-[#121922] bg-[#0B0F14]/80 backdrop-blur supports-[backdrop-filter]:bg-[#0B0F14]/60">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="relative max-w-[460px] w-full hidden md:block">
          <svg className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24"><path fill="currentColor" d="M10 18a8 8 0 1 1 6.32-3.16l4.41 4.41-1.41 1.41-4.41-4.41A7.96 7.96 0 0 1 10 18z"/></svg>
          <Input placeholder="Buscar transações, relatórios..." className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Tooltip content="Importar DRE/DFC (.xlsx)">
            <div><ImporterExcel onLoad={(p)=>{ onImport(p); toast.success('Planilhas importadas'); }} /></div>
          </Tooltip>
          <Tooltip content="Notificações">
            <Button variant="outline" size="icon" title="Notificações">
              <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="currentColor" d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6V11a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2z"/></svg>
            </Button>
          </Tooltip>
          <Avatar />
        </div>
      </div>
    </header>
  );
}
