import { toast } from 'sonner';
import React from 'react';
import * as XLSX from 'xlsx';

export function ImporterExcel({ onLoad }:{ onLoad:(p:{dre:any[], dfc:any[]})=>void }){
  function parse(file: File){
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheets = workbook.SheetNames;
      let dre:any[] = [];
      let dfc:any[] = [];
      const toJson = (ws:any)=>XLSX.utils.sheet_to_json(ws, { defval: '' });
      const pick = (namePart:string)=> sheets.find(n=>n.toLowerCase().includes(namePart));
      const sDre = pick('dre') || sheets[0];
      const sDfc = pick('dfc') || sheets[1] || sheets[0];

      const m1 = toJson(workbook.Sheets[sDre] || workbook.Sheets[sheets[0]]);
      const m2 = toJson(workbook.Sheets[sDfc] || workbook.Sheets[sheets[0]]);

      dre = m1.map((r:any)=>({ 
        grupo: r['Grupo'] || r['categoria'] || r['grupo'] || r[Object.keys(r)[0]], 
        conta: r['Conta'] || r['Descrição'] || r['descricao'] || r[Object.keys(r)[1] || Object.keys(r)[0]],
        valor: Number(r['Valor'] || r['Total'] || r['valor'] || 0)
      }));

      dfc = m2.map((r:any)=>({ 
        data: r['Data'] || r['competencia'] || r['data'] || r[Object.keys(r)[0]],
        descricao: r['Descrição'] || r['descricao'] || r['Conta'] || '',
        entrada: Number(r['Entrada'] || r['Receita'] || r['entrada'] || 0),
        saida: Number(r['Saída'] || r['Saida'] || r['Despesa'] || r['saida'] || 0),
        saldo: Number(r['Saldo'] || r['saldo'] || (Number(r['Entrada']||0) - Number(r['Saída']||r['Saida']||0)))
      }));

      onLoad({ dre, dfc });
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#11161C] border border-[#1B232C] text-sm cursor-pointer">
      <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M19 13v6H5v-6H3v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6h-2zM11 6.414V16h2V6.414l3.293 3.293 1.414-1.414L12 2 6.293 8.293l1.414 1.414L11 6.414z"/></svg>
      Importar DRE/DFC
      <input type="file" className="hidden" accept=".xlsx,.xls" onChange={e=>{ const f=e.target.files?.[0]; if(f) parse(f); }}/>
    </label>
  );
}

// Dicas: Esperado DRE (Grupo/Conta/Valor) e DFC (Data/Entrada/Saída/Saldo)
