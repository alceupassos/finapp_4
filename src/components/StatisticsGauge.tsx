import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

export function StatisticsGauge({ value=0.75 }:{ value?: number }){
  const pct = Math.max(0, Math.min(1, value));
  const size = 220;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const cx = size/2, cy = size/2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - pct);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estatísticas</CardTitle>
        <span className="text-xs text-gray-400">Semanal</span>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#0f141b" strokeWidth={stroke} />
            <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#1d2934" strokeWidth={stroke} strokeDasharray={`${circ}`} strokeDashoffset="0" />
            <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#2dd4bf" strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={`${circ}`} strokeDashoffset={`${offset}`} transform={`rotate(-90 ${cx} ${cy})`} />
            <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="28" fill="#e5e7eb">{Math.round(pct*100)}%</text>
          </svg>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
          <div><div className="text-gray-400 text-xs">Salários</div><div className="text-gray-200">R$ 91.000</div></div>
          <div><div className="text-gray-400 text-xs">Freelance</div><div className="text-gray-200">R$ 64.000</div></div>
          <div><div className="text-gray-400 text-xs">Afiliados</div><div className="text-gray-200">R$ 20.000</div></div>
        </div>
      </CardContent>
    </Card>
  );
}
