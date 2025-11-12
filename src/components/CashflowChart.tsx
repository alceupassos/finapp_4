import React from 'react';
import type { DFCItem } from '../App';

function normalize(data: DFCItem[]){
  const points = data.map((d,i)=>({x:i, y:d.saldo}));
  if(points.length===0) return {w: 720, h: 220, path: 'M 0 0', area: 'M 0 0', ticks: 0};
  const maxY = Math.max(...points.map(p=>p.y));
  const minY = Math.min(...points.map(p=>p.y));
  const w = 720, h = 220, padX=20, padY=10;
  const scaleX = (i:number)=> padX + (i*(w-2*padX))/Math.max(1,points.length-1);
  const scaleY = (v:number)=> h-padY - ((v-minY)/Math.max(1,(maxY-minY)))*(h-2*padY);
  const path = points.map((p,i)=> `${i?'L':'M'} ${scaleX(p.x)} ${scaleY(p.y)}`).join(' ');
  const area = `M ${scaleX(points[0].x)} ${h-padY} L ` + points.map(p=>`${scaleX(p.x)} ${scaleY(p.y)}`).join(' L ') + ` L ${scaleX(points[points.length-1].x)} ${h-padY} Z`;
  return { w, h, path, area, ticks: points.length };
}

export function CashflowChart({ data, period='yearly' }: { data: DFCItem[]; period?: 'weekly'|'monthly'|'yearly' }){
  const scoped = period==='weekly' ? data.slice(-7) : period==='monthly' ? data.slice(-30) : data;
    const n = normalize(scoped);
  return (/* shadcn card wrapper */
    <div className="w-full overflow-hidden">
      <svg width="100%" height="240" viewBox={`0 0 ${n.w} ${n.h+20}`}>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={n.w} height={n.h} fill="transparent"/>
        <path d={n.area} fill="url(#g1)" />
        <path d={n.path} fill="none" stroke="#22c55e" strokeWidth="2" />
      </svg>
    </div>
  );
}
