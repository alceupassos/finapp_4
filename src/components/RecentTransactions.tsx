import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';
import { PeriodSelect } from './PeriodSelect';

export function RecentTransactions() {
  return (
    <Card className='bg-[#0f141b] border-[#1e2530] shadow-2xl'>
      <CardHeader>
        <CardTitle>Transações recentes</CardTitle>
        <div className='flex items-center gap-2'>
          <PeriodSelect value={'weekly'} onChange={()=>{}} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className='p-1.5 rounded-lg hover:bg-[#0f141b] text-gray-400'>
                <svg width='16' height='16' viewBox='0 0 24 24'><path fill='currentColor' d='M12 8a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z'/></svg>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem>Exportar CSV</DropdownMenuItem>
              <DropdownMenuItem>Baixar OFX</DropdownMenuItem>
              <DropdownMenuItem>Configurar colunas</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className='space-y-2'>
          <div className='text-sm text-gray-400'>Nenhuma transação recente</div>
        </div>
      </CardContent>
    </Card>
  );
}
