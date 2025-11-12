import React from 'react';
import type { DREItem } from '../App';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

export function DRETable({ data }:{ data:DREItem[] }){
  return (
    <Card>
      <CardHeader>
        <CardTitle>DRE (Resultado)</CardTitle>
        <span className="text-xs text-gray-400">Mensal</span>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-gray-400">
              <tr className="text-left">
                <th className="py-2">Grupo</th>
                <th className="py-2">Conta</th>
                <th className="py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r,i)=>(
                <tr key={i} className="border-t border-[#10161c]">
                  <td className="py-2">{r.grupo}</td>
                  <td className="py-2">{r.conta}</td>
                  <td className={`py-2 text-right ${r.valor<0?'text-red-300':'text-emerald-300'}`}>R$ {r.valor.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
