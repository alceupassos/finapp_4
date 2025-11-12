import * as React from "react"

export function Progress({ value }:{ value:number }){
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className="w-full h-2 rounded-full bg-[#0e141b] border border-[#1B232C] overflow-hidden">
      <div className="h-full bg-emerald-500/70" style={{ width: `${v}%` }} />
    </div>
  )
}
