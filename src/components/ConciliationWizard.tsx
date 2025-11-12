import React, { useState } from 'react';
import type { DFCItem } from '../App';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';

export function ConciliationWizard({ dfc }:{ dfc: DFCItem[] }){
  const [csv, setCsv] = useState('');
  const [matches, setMatches] = useState<any[]>([]);

  function process(){
    const rows = csv.split(/\n|\r/).filter(Boolean).map(l=>l.split(/;|,\s*/));
    const out:any[] = [];
    for(const r of rows){
      const valor = parseFloat(r.find(x=>/[\-\d]/.test(x))||'0');
      const found = dfc.find(d=>Math.abs(d.entrada-d.saida===0?d.saldo: (d.entrada-d.saida) - valor) < 1 || d.entrada===valor || d.saida===Math.abs(valor));
      out.push({ raw:r.join(' | '), match: found?.descricao || '—', valor });
    }
    setMatches(out);
    console.log('Conciliação executada:', `${out.length} linhas processadas`);
  }

  return (
    <Card>
      <CardHeader><CardTitle>Conciliação bancária (demo)</CardTitle></CardHeader>
      <CardContent>
        <textarea value={csv} onChange={e=>setCsv(e.target.value)} placeholder="Cole CSV: data;descricao;valor" className="w-full h-32 bg-[#0a0f14] border border-[#1B232C] rounded-xl p-3 text-sm" />
        <div className="mt-2 flex gap-2">
          <Button onClick={process}>Conciliar</Button>
        </div>
        {matches.length>0 && (
          <div className="mt-3 text-sm">
            {matches.map((m,i)=>(<div key={i} className="border-t border-[#10161c] py-2 flex justify-between"><span>{m.raw}</span><span className="text-gray-400">{m.match}</span></div>))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
