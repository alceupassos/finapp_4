#!/usr/bin/env python3
"""
Script de Validação de Arquivos
================================

Este script verifica se os arquivos de dados das empresas estão no formato correto
antes de processar. Use isto para identificar problemas antecipadamente.

Uso:
    python3 validar_arquivos.py

"""

import pandas as pd
from pathlib import Path
import sys


# Colunas esperadas no arquivo de dados
COLUNAS_ESPERADAS = [
    'Registro', 'Tipo', 'Parcela', 'Empresa', 'Emissão', 
    'Vencimento', 'Liquidação', 'Valor Bruto', 'Centro de Custos',
    'Valor Líquido', 'Conta', 'Observações', 'Competência',
    'Plano de Contas', 'Cliente / Fornecedor', 'Status',
    'Adquirente / Bandeira'
]


def validar_arquivo(caminho_arquivo: Path) -> dict:
    """
    Valida um arquivo de dados de empresa.
    
    Returns:
        dict com resultado da validação
    """
    resultado = {
        'arquivo': caminho_arquivo.name,
        'valido': True,
        'erros': [],
        'avisos': [],
        'info': {}
    }
    
    try:
        # Tentar ler arquivo
        df = pd.read_excel(caminho_arquivo, header=1)
        
        # Verificar colunas
        colunas_arquivo = df.columns.tolist()
        
        # Colunas faltando
        colunas_faltando = set(COLUNAS_ESPERADAS) - set(colunas_arquivo)
        if colunas_faltando:
            resultado['valido'] = False
            resultado['erros'].append(f"Colunas faltando: {', '.join(colunas_faltando)}")
        
        # Colunas extras (aviso, não erro)
        colunas_extras = set(colunas_arquivo) - set(COLUNAS_ESPERADAS)
        if colunas_extras:
            resultado['avisos'].append(f"Colunas extras: {', '.join(colunas_extras)}")
        
        # Verificar se tem dados
        if len(df) == 0:
            resultado['valido'] = False
            resultado['erros'].append("Arquivo vazio (sem dados)")
        else:
            resultado['info']['total_registros'] = len(df)
        
        # Verificar tipos de registro
        if 'Registro' in df.columns:
            tipos_registro = df['Registro'].value_counts().to_dict()
            resultado['info']['tipos_registro'] = tipos_registro
        
        # Verificar se tem datas válidas
        for col in ['Competência', 'Liquidação']:
            if col in df.columns:
                valores_validos = pd.to_datetime(df[col], errors='coerce').notna().sum()
                total = len(df)
                percentual = (valores_validos / total * 100) if total > 0 else 0
                
                if percentual < 50:
                    resultado['avisos'].append(
                        f"Coluna '{col}': apenas {percentual:.1f}% das datas são válidas"
                    )
                
                resultado['info'][f'{col}_validas'] = f"{valores_validos}/{total} ({percentual:.1f}%)"
        
        # Verificar valores numéricos
        for col in ['Valor Bruto', 'Valor Líquido']:
            if col in df.columns:
                valores_validos = pd.to_numeric(df[col], errors='coerce').notna().sum()
                total = len(df)
                percentual = (valores_validos / total * 100) if total > 0 else 0
                
                if percentual < 80:
                    resultado['avisos'].append(
                        f"Coluna '{col}': apenas {percentual:.1f}% são valores numéricos válidos"
                    )
                
                resultado['info'][f'{col}_validos'] = f"{valores_validos}/{total} ({percentual:.1f}%)"
        
    except Exception as e:
        resultado['valido'] = False
        resultado['erros'].append(f"Erro ao ler arquivo: {str(e)}")
    
    return resultado


def main():
    print("\n" + "="*80)
    print("  VALIDADOR DE ARQUIVOS - DRE/DFC")
    print("="*80 + "\n")
    
    # Configurações
    DIR_ENTRADA = '/mnt/user-data/uploads'
    ARQUIVO_EMPRESAS = '/home/claude/empresas.csv'
    
    print(f"📁 Diretório de entrada: {DIR_ENTRADA}\n")
    
    # Verificar arquivos obrigatórios
    print("🔍 Verificando arquivos obrigatórios...\n")
    
    arquivos_obrigatorios = {
        'PlanoDeContas.xlsx': 'Plano de Contas',
        'CentroDeCustos.xlsx': 'Centro de Custos'
    }
    
    todos_ok = True
    for arquivo, descricao in arquivos_obrigatorios.items():
        caminho = Path(DIR_ENTRADA) / arquivo
        if caminho.exists():
            print(f"  ✅ {descricao}: {arquivo}")
        else:
            print(f"  ❌ {descricao}: {arquivo} - NÃO ENCONTRADO")
            todos_ok = False
    
    print()
    
    if not todos_ok:
        print("❌ Arquivos obrigatórios faltando. Corrija antes de continuar.\n")
        return
    
    # Ler lista de empresas
    print("📋 Verificando arquivos de dados das empresas...\n")
    
    if Path(ARQUIVO_EMPRESAS).exists():
        df_empresas = pd.read_csv(ARQUIVO_EMPRESAS)
        # Remover placeholders
        df_empresas = df_empresas[~df_empresas['CNPJ'].str.startswith('CNPJ_')]
        lista_empresas = df_empresas['CNPJ'].tolist()
    else:
        print(f"⚠️  Arquivo {ARQUIVO_EMPRESAS} não encontrado.")
        print("   Verificando todos os arquivos .xlsx no diretório...\n")
        # Buscar todos os arquivos que parecem ser CNPJs
        arquivos = Path(DIR_ENTRADA).glob('*.xlsx')
        lista_empresas = []
        for arq in arquivos:
            nome = arq.stem
            if nome not in ['PlanoDeContas', 'CentroDeCustos'] and nome.isdigit():
                lista_empresas.append(nome)
    
    if not lista_empresas:
        print("❌ Nenhum arquivo de empresa encontrado.\n")
        return
    
    print(f"Encontrados {len(lista_empresas)} arquivo(s) de empresa:\n")
    
    # Validar cada arquivo
    resultados = []
    for cnpj in lista_empresas:
        arquivo = Path(DIR_ENTRADA) / f'{cnpj}.xlsx'
        resultado = validar_arquivo(arquivo)
        resultados.append(resultado)
    
    # Exibir resultados
    validos = 0
    invalidos = 0
    
    for res in resultados:
        if res['valido']:
            emoji = "✅"
            validos += 1
        else:
            emoji = "❌"
            invalidos += 1
        
        print(f"{emoji} {res['arquivo']}")
        
        if res['info']:
            print(f"   ℹ️  Informações:")
            for k, v in res['info'].items():
                print(f"      • {k}: {v}")
        
        if res['avisos']:
            print(f"   ⚠️  Avisos:")
            for aviso in res['avisos']:
                print(f"      • {aviso}")
        
        if res['erros']:
            print(f"   ❌ Erros:")
            for erro in res['erros']:
                print(f"      • {erro}")
        
        print()
    
    # Resumo
    print("="*80)
    print("  RESUMO DA VALIDAÇÃO")
    print("="*80 + "\n")
    print(f"✅ Arquivos válidos: {validos}/{len(resultados)}")
    print(f"❌ Arquivos com problemas: {invalidos}/{len(resultados)}")
    print()
    
    if invalidos > 0:
        print("⚠️  Corrija os problemas acima antes de processar.")
    else:
        print("✅ Todos os arquivos estão prontos para processamento!")
    
    print()


if __name__ == '__main__':
    main()
