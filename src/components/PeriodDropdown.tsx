import React from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"

const labels: Record<string,string> = { weekly: "Semanal", monthly: "Mensal", yearly: "Anual" }

export function PeriodDropdown({ value, onChange }:{ value: "weekly"|"monthly"|"yearly"; onChange:(v:any)=>void }){
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-2 text-xs text-gray-400">
          {labels[value]}
          <svg className="w-3 h-3" viewBox="0 0 20 20"><path fill="currentColor" d="M5.5 7.5L10 12l4.5-4.5z"/></svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(["weekly","monthly","yearly"] as const).map(opt=>(
          <DropdownMenuItem key={opt} onClick={()=>onChange(opt)}>{labels[opt]}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
