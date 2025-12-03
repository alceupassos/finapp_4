import React from 'react';
import { Badge } from './ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { formatCurrency } from '../lib/formatters';

export function KpiCard({ titulo, valor, subtitulo, variacao, negativo=false, progress }:{ titulo:string; valor:number; subtitulo?:string; variacao?:number; negativo?:boolean; progress?: number }){
  const hasVar = typeof variacao === 'number';
  const pctTxt = hasVar ? `${variacao>=0?'+':''}${(variacao*100).toFixed(2)}%` : null;
  const badgeClass = variacao!==undefined
    ? (variacao>=0 ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400")
    : "bg-transparent";
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>{titulo}</CardTitle>
        <div className="flex items-center gap-2">
          {hasVar && <Badge className={badgeClass}>{pctTxt}</Badge>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-[#0f141b] text-gray-400">
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M12 8a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z"/></svg>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Configurar card</DropdownMenuItem>
              <DropdownMenuItem>Exportar CSV</DropdownMenuItem>
              <DropdownMenuItem>Fixar no topo</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold ${negativo? 'text-red-300':'text-gray-100'}`}>{formatCurrency(valor, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        {subtitulo && <div className="text-xs text-gray-500 mt-1">{subtitulo}</div>}
        {typeof progress === 'number' && <div className="mt-2"><Progress value={progress} /></div>}
      </CardContent>
    </Card>
  );
}
