# Estrutura de DRE - Documentação

## Arquivo Base: `f360/bases/ex.xlsx`

### Sheets Identificados

1. **Relatório Unificado**
   - Total de linhas: 43.687
   - Total de colunas: 17
   - Estrutura: Dados consolidados de DRE

2. **Filtros**
   - Total de linhas: 17
   - Total de colunas: 2
   - Estrutura: Configurações de filtros

## Schema Extraído

O schema completo está disponível em: `f360/schemas/ex-schema.json`

## Notas Importantes

- O arquivo `ex.xlsx` contém dados de exemplo/referência
- A primeira linha pode conter metadados ou título do relatório
- Os headers reais podem estar na segunda ou terceira linha
- Para processar dados completos, use o script de importação F360

## Uso do Schema

O schema extraído pode ser usado para:
- Validar estrutura de dados antes da importação
- Criar tipos TypeScript baseados na estrutura
- Documentar campos esperados
- Verificar compatibilidade entre diferentes arquivos DRE

## Script de Extração

Use o script `scripts/extract-xlsx-schema.ts` para extrair schemas de outros arquivos XLSX:

```bash
tsx scripts/extract-xlsx-schema.ts <arquivo.xlsx> [output.json]
```

