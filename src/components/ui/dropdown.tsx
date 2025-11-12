import * as React from "react"
import { cn } from "../../lib/utils"

export function Dropdown({ label, items }:{ label: React.ReactNode; items: {label:string, onClick?:()=>void}[] }){
  const [open,setOpen] = React.useState(false)
  return (
    <div className="relative">
      <button onClick={()=>setOpen(o=>!o)} className="inline-flex items-center gap-1 text-xs text-gray-400">
        {label}
        <svg className="w-3 h-3" viewBox="0 0 20 20"><path fill="currentColor" d="M5.5 7.5L10 12l4.5-4.5z"/></svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-36 rounded-xl border border-[#1B232C] bg-[#0a0f14] p-1 shadow-xl z-20">
          {items.map((it,i)=>(
            <button key={i} onClick={()=>{ setOpen(false); it.onClick?.(); }} className="w-full text-left text-xs text-gray-300 px-3 py-2 rounded-lg hover:bg-[#0f141b]">
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
