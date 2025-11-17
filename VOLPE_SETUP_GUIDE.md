# 🎯 Guia de Configuração - Versão Grupo VOLPE

## 📋 Resumo das Alterações

### ✅ O que foi implementado:

1. **Login Exclusivo VOLPE** (`VolpeLoginModal.tsx`)
   - Interface dedicada para empresas do grupo VOLPE
   - Seleção de empresa no próprio login
   - Default para matriz 0159

2. **Filtro de Empresas**
   - Todos os componentes agora filtram apenas empresas VOLPE
   - Baseado no nome (contém "VOLPE") ou CNPJ (inicia com 26888098)

3. **Dados Reais Carregados**
   - 15 empresas do grupo VOLPE cadastradas
   - 885 registros de fluxo de caixa para matriz 0159
   - 934 registros DRE para matriz 0159
   - Período: Janeiro 2025 até Novembro 2025

## 🚀 Como usar

### Opção 1: Login Padrão (localhost:3002)
```bash
pnpm run dev
# Acesse: http://localhost:3002
# O sistema detectará automaticamente e usará o login VOLPE
```

### Opção 2: Login Direto (arquivo HTML)
```bash
# Abra o arquivo: login-volpe.html
# Usuário: dev@angrax.com.br
# Senha: B5b0dcf500@#
# Empresa: LOJA 01 - VOLPE MATRIZ (0159) [já selecionada]
```

## 📊 Dados Disponíveis

### Empresas VOLPE:
- **LOJA 01 - VOLPE MATRIZ** (26888098000159) - 885 registros DFC, 934 DRE
- **LOJA 02 - VOLPE** (26888098000230) - 3 registros DFC
- **LOJA 03 - VOLPE** (26888098000310) - 3 registros DFC
- ... (total de 15 empresas)

### Dashboard Features:
- ✅ Gráficos de fluxo de caixa reais
- ✅ Tabelas DRE/DFC com dados 2025
- ✅ KPIs calculados com base nos dados reais
- ✅ Seleção de empresa mantém 0159 como padrão

## 🔧 Arquivos Modificados

1. `src/services/dataLoader.ts` - Filtro VOLPE nos dados
2. `src/components/VolpeLoginModal.tsx` - Novo login dedicado
3. `src/App.tsx` - Detecção de domínio para login VOLPE
4. `login-volpe.html` - Login standalone para testes

## 🎯 Próximos Passos

1. **Testar o login** com dev@angrax.com.br
2. **Verificar os gráficos** carregando dados reais
3. **Confirmar que a matriz 0159** aparece como default
4. **Validar navegação** entre empresas VOLPE

## 📞 Suporte

Se os dados não aparecerem:
1. Verifique se o servidor está rodando: `pnpm run dev`
2. Confirme os dados: `node scripts/validate_import.mjs`
3. Acesse: http://localhost:3002

**Status: ✅ PRONTO PARA USO**