import React from "react"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select"

export function PeriodSelect({ value, onChange }:{ value: "weekly"|"monthly"|"yearly"; onChange:(v:any)=>void }){
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="weekly">Semanal</SelectItem>
        <SelectItem value="monthly">Mensal</SelectItem>
        <SelectItem value="yearly">Anual</SelectItem>
      </SelectContent>
    </Select>
  )
}
