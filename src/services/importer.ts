import { loadFromAvant } from './integration'
import { SupabaseRest } from './supabaseRest'

export async function importAvantToSupabase(cnpj: string) {
  const { dre, dfc } = await loadFromAvant()
  const dreRows = dre.map(d => ({ cnpj, conta: d.conta, valor: d.valor }))
  const dfcRows = dfc.map(d => ({ cnpj, descricao: d.descricao, entrada: d.entrada, saida: d.saida, saldo: d.saldo }))
  const dreRes = await SupabaseRest.restPost('dre_entries', dreRows)
  const dfcRes = await SupabaseRest.restPost('cashflow_entries', dfcRows)
  await SupabaseRest.log({ level: 'info', service: 'UI', endpoint: 'importAvantToSupabase', companyCnpj: cnpj, message: `Imported DRE=${dreRows.length} DFC=${dfcRows.length}` })
  return { dreCount: dreRows.length, dfcCount: dfcRows.length, dreRes, dfcRes }
}