import React from 'react';
import { Card } from './ui/card';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';
import { toast } from 'sonner';

export function VisaCard({ total=265139.00, last4='1979' }:{ total?:number; last4?:string }){
  return (
    <Card className="overflow-hidden p-0">
      <div className="p-4" style={{ background: 'linear-gradient(135deg,#1f9fb2 0%,#2c7d8c 40%,#305d66 100%)' }}>
        <div className="text-white/90 text-sm font-semibold">VISA</div>
        <div className="mt-6 text-2xl font-semibold tracking-wide">R$ {total.toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
        <div className="mt-6 text-white/80 text-sm tracking-[0.2em]">1024 0606 1502 {last4}</div>
      </div>
    </Card>
  )
}
