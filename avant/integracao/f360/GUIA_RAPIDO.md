# 🚀 GUIA RÁPIDO - Como Processar as 13 Empresas

## Passo 1: Preparar os Arquivos de Dados

Você já tem 3 arquivos que são compartilhados:
- ✅ PlanoDeContas.xlsx (não precisa duplicar)
- ✅ CentroDeCustos.xlsx (não precisa duplicar)  
- ✅ 26888098000159.xlsx (dados da matriz - já processado)

Agora você precisa adicionar os **12 arquivos restantes** com os dados das outras empresas:
- CNPJ_EMPRESA_2.xlsx
- CNPJ_EMPRESA_3.xlsx
- ... e assim por diante

**IMPORTANTE:** Cada arquivo deve ter **EXATAMENTE** o mesmo formato do arquivo 26888098000159.xlsx

## Passo 2: Editar o Arquivo empresas.csv

1. Abra o arquivo `empresas_template.csv`
2. Substitua os placeholders pelos CNPJs e nomes reais:

```csv
CNPJ,Nome
26888098000159,GRUPO VOLPE - MATRIZ
12345678000190,VOLPE FILIAL SÃO PAULO
98765432000111,VOLPE FILIAL RIO DE JANEIRO
... (adicione todas as 13 empresas)
```

3. Salve como `empresas.csv`

## Passo 3: Executar o Processamento

### Opção A: Modo Automático (Recomendado)

Execute o script de lote que processa todas as empresas de uma vez:

```bash
python3 processar_lote.py
```

O script irá:
1. Ler a lista de empresas do CSV
2. Mostrar quais empresas serão processadas
3. Pedir confirmação
4. Processar todas automaticamente
5. Mostrar resumo dos resultados

### Opção B: Modo Manual (Uma empresa por vez)

```python
from processar_dre_dfc import ProcessadorDREDFC

processador = ProcessadorDREDFC(
    dir_entrada='/caminho/dos/arquivos',
    dir_saida='/caminho/saida'
)

processador.carregar_referencias()

# Processar uma empresa específica
processador.gerar_demonstrativo('CNPJ_AQUI', 'NOME DA EMPRESA')
```

## Passo 4: Verificar os Resultados

Após o processamento, você terá na pasta de saída:
- DRE_DFC_26888098000159.xlsx ✅ (já gerado)
- DRE_DFC_CNPJ_EMPRESA_2.xlsx
- DRE_DFC_CNPJ_EMPRESA_3.xlsx
- ... (um para cada empresa)

Cada arquivo contém:
- **Sheet DRE**: Demonstrativo de Resultados (competência)
- **Sheet DFC**: Demonstrativo de Fluxo de Caixa (caixa)
- Formatação profissional automática
- Colunas para cada mês + Total

## 📋 Checklist Antes de Começar

- [ ] PlanoDeContas.xlsx está na pasta de entrada
- [ ] CentroDeCustos.xlsx está na pasta de entrada
- [ ] Todos os 13 arquivos [CNPJ].xlsx estão na pasta de entrada
- [ ] Arquivo empresas.csv foi criado e preenchido corretamente
- [ ] Todos os arquivos de dados têm o mesmo formato/colunas

## ⚠️ Troubleshooting

### "Arquivo não encontrado"
- Verifique se o nome do arquivo é exatamente o CNPJ (apenas números)
- Exemplo correto: `26888098000159.xlsx`
- Exemplo errado: `26.888.098/0001-59.xlsx`

### "Erro ao processar empresa X"
- Abra o arquivo Excel da empresa X
- Verifique se tem a mesma estrutura que o arquivo da matriz
- Confirme que tem as mesmas colunas no mesmo formato

### Valores zerados ou estranhos
- Verifique se as colunas de data (Competência, Liquidação) estão preenchidas
- Confirme que Valor Líquido está em formato numérico (sem R$)

## 💡 Dicas

1. **Teste primeiro com 2-3 empresas** antes de processar todas
2. **Faça backup** dos arquivos originais
3. **Verifique manualmente** pelo menos um arquivo gerado para confirmar
4. Se der erro em uma empresa específica, pule ela e processe as outras

## 📊 O que o Sistema Faz

### DRE (Competência)
- Usa a coluna "Competência" para determinar o mês
- Mostra quando a receita/despesa foi **gerada**
- Importante para análise gerencial

### DFC (Caixa)
- Usa a coluna "Liquidação" para determinar o mês  
- Mostra quando o dinheiro **efetivamente** entrou/saiu
- Importante para análise de fluxo de caixa

## ✅ Próximos Passos (Após Processamento)

1. Revisar os arquivos gerados
2. Identificar possíveis melhorias/ajustes
3. Solicitar customizações se necessário:
   - Categorização de contas
   - Cálculos adicionais (margens, etc)
   - Formatação específica
   - Consolidação de múltiplas empresas

---

**Quando tiver os demais arquivos prontos, é só me avisar que eu ajudo a processar tudo!** 🚀
