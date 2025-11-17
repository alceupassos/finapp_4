# Sistema de Geração de DRE e DFC para Múltiplas Empresas

## 📋 Visão Geral

Este sistema processa dados financeiros de múltiplas empresas e gera automaticamente:
- **DRE** (Demonstrativo de Resultados do Exercício) - Regime de Competência
- **DFC** (Demonstrativo de Fluxo de Caixa) - Regime de Caixa

## 📁 Estrutura de Arquivos

### Arquivos de Entrada (Obrigatórios)

1. **PlanoDeContas.xlsx** - Compartilhado entre todas as empresas
   - Tabela com plano de contas padrão
   - Colunas: Nome, Tipo, Código Obrigação, Código Provisão, Tipo Despesa

2. **CentroDeCustos.xlsx** - Compartilhado entre todas as empresas
   - Tabela com centros de custo padrão
   - Colunas: Nome, Conta Contábil

3. **[CNPJ].xlsx** - Um arquivo para cada empresa
   - Formato: `26888098000159.xlsx`
   - Contém movimentações financeiras da empresa
   - Colunas esperadas:
     - Registro, Tipo, Parcela, Empresa
     - Emissão, Vencimento, Liquidação, Competência
     - Valor Bruto, Valor Líquido
     - Centro de Custos, Conta, Plano de Contas
     - Cliente/Fornecedor, Observações, Status
     - Adquirente/Bandeira

### Arquivos de Saída

- **DRE_DFC_[CNPJ].xlsx** - Um arquivo para cada empresa processada
  - Sheet "DRE": Demonstrativo de Resultados
  - Sheet "DFC": Demonstrativo de Fluxo de Caixa
  - Formatação automática com:
    - Cabeçalhos coloridos
    - Valores em formato monetário
    - Colunas para cada mês + Total
    - Logo da empresa (se disponível)

## 🚀 Como Usar

### Opção 1: Processar uma empresa individual

```python
from processar_dre_dfc import ProcessadorDREDFC

# Criar processador
processador = ProcessadorDREDFC(
    dir_entrada='/caminho/dos/arquivos',
    dir_saida='/caminho/saida'
)

# Carregar referências
processador.carregar_referencias()

# Processar uma empresa
processador.gerar_demonstrativo(
    cnpj='26888098000159',
    nome_empresa='GRUPO VOLPE - MATRIZ'
)
```

### Opção 2: Processar múltiplas empresas

```python
from processar_dre_dfc import ProcessadorDREDFC

# Criar processador
processador = ProcessadorDREDFC(
    dir_entrada='/caminho/dos/arquivos',
    dir_saida='/caminho/saida'
)

# Carregar referências
processador.carregar_referencias()

# Lista de empresas (CNPJ, Nome)
lista_empresas = [
    ('26888098000159', 'GRUPO VOLPE - MATRIZ'),
    ('12345678000190', 'EMPRESA FILIAL 1'),
    ('98765432000111', 'EMPRESA FILIAL 2'),
    # ... adicionar demais empresas
]

# Processar todas
processador.processar_multiplas_empresas(lista_empresas)
```

### Opção 3: Usando arquivo CSV com lista de empresas

Crie um arquivo `empresas.csv`:

```csv
CNPJ,Nome
26888098000159,GRUPO VOLPE - MATRIZ
12345678000190,EMPRESA FILIAL 1
98765432000111,EMPRESA FILIAL 2
```

Depois execute:

```python
import pandas as pd
from processar_dre_dfc import ProcessadorDREDFC

# Ler lista de empresas
df_empresas = pd.read_csv('empresas.csv')
lista_empresas = list(df_empresas.itertuples(index=False, name=None))

# Processar
processador = ProcessadorDREDFC(
    dir_entrada='/caminho/dos/arquivos',
    dir_saida='/caminho/saida'
)
processador.carregar_referencias()
processador.processar_multiplas_empresas(lista_empresas)
```

## 📊 Diferença entre DRE e DFC

### DRE (Demonstrativo de Resultados)
- **Regime:** Competência
- **Data usada:** Coluna "Competência"
- **O que mostra:** Quando a receita/despesa foi gerada (independente do pagamento)

### DFC (Demonstrativo de Fluxo de Caixa)
- **Regime:** Caixa
- **Data usada:** Coluna "Liquidação"
- **O que mostra:** Quando o dinheiro efetivamente entrou/saiu

## 🔧 Personalização

### Adicionar Categorias/Agrupamentos

O script atualmente lista todas as contas. Para adicionar categorias (como no exemplo original):

```python
def criar_estrutura_demonstrativo(...):
    # ... código existente ...
    
    # Adicionar lógica de categorização
    categorias = {
        'Receitas Operacionais': ['102-1'],
        'Deduções de Receitas': ['300-9', '431-9'],
        'Impostos Sobre o Faturamento': ['205-0'],
        'Despesas Operacionais': ['400-0', '421-', '422-']
    }
    
    # Agrupar contas por categoria
    # ... implementar lógica ...
```

### Adicionar Fórmulas de Cálculo

```python
# Exemplo: Adicionar linha de Lucro Bruto
lucro_bruto = receitas_total - custos_total
```

## ⚠️ Pontos de Atenção

1. **Formato dos Arquivos**: Todos os arquivos CNPJ devem ter exatamente o mesmo formato
2. **Datas**: Certifique-se que as colunas de data estão corretamente formatadas
3. **Valores**: Valores devem ser numéricos (sem R$ ou símbolos)
4. **CNPJ**: Nome do arquivo deve ser apenas os números do CNPJ

## 🐛 Troubleshooting

### Erro: "Arquivo não encontrado"
- Verifique se os arquivos estão no diretório correto
- Confirme que o nome do arquivo está correto (CNPJ.xlsx)

### Valores zerados ou incorretos
- Verifique se a coluna "Competência" ou "Liquidação" está preenchida
- Confirme que os valores estão em formato numérico

### Demora no processamento
- Para muitas empresas, use `processar_multiplas_empresas()` que tem logs de progresso

## 📞 Suporte

Para dúvidas ou problemas, contate o time de desenvolvimento Angra Saúde.

---

**Versão:** 1.0  
**Última atualização:** Novembro 2024  
**Desenvolvido por:** Angra Saúde - Sistema Financeiro
