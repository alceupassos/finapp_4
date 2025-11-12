import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

const schema = z.object({
  cnpj: z.string().min(14, "CNPJ inválido").regex(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14}/, "Formato de CNPJ inválido"),
  telefone: z.string().optional(),
  centro: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function FiltroAvancado(){
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  function onSubmit(data: FormData){
    // Aqui você aplicaria o filtro; por ora, apenas exibe um toast
    toast.success("Filtro aplicado", { description: `CNPJ ${data.cnpj}` });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Filtro avançado</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>CNPJ</Label>
            <Input placeholder="00.000.000/0000-00" {...register('cnpj')} />
            {errors.cnpj && <div className="text-red-400 text-xs mt-1">{errors.cnpj.message}</div>}
          </div>
          <div>
            <Label>Telefone</Label>
            <Input placeholder="(00) 00000-0000" {...register('telefone')} />
          </div>
          <div>
            <Label>Centro de custo</Label>
            <Input placeholder="Ex.: Projeto A" {...register('centro')} />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={isSubmitting}>Aplicar filtros</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
