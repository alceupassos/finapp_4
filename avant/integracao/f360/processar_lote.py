#!/usr/bin/env python3
"""
Script Simplificado - Processar DRE/DFC em Lote
================================================

Modo de uso:
1. Edite o arquivo 'empresas.csv' com os CNPJs e nomes das empresas
2. Coloque todos os arquivos de dados ([CNPJ].xlsx) na pasta de entrada
3. Execute este script
4. Os arquivos DRE_DFC_[CNPJ].xlsx serão gerados na pasta de saída

"""

import pandas as pd
import sys
sys.path.insert(0, '/home/claude')

from processar_dre_dfc import ProcessadorDREDFC
from pathlib import Path


def main():
    print("\n" + "="*80)
    print("  GERADOR DE DRE E DFC - PROCESSAMENTO EM LOTE")
    print("="*80 + "\n")
    
    # Configurações - AJUSTE AQUI OS CAMINHOS
    DIR_ENTRADA = '/mnt/user-data/uploads'
    DIR_SAIDA = '/mnt/user-data/outputs'
    ARQUIVO_EMPRESAS = '/home/claude/empresas.csv'  # ou use empresas_template.csv
    
    print(f"📁 Diretório de entrada: {DIR_ENTRADA}")
    print(f"📁 Diretório de saída: {DIR_SAIDA}")
    print(f"📄 Arquivo de empresas: {ARQUIVO_EMPRESAS}")
    print()
    
    # Verificar se arquivo de empresas existe
    if not Path(ARQUIVO_EMPRESAS).exists():
        print(f"❌ ERRO: Arquivo {ARQUIVO_EMPRESAS} não encontrado!")
        print(f"   Crie o arquivo com o formato:")
        print(f"   CNPJ,Nome")
        print(f"   26888098000159,GRUPO VOLPE - MATRIZ")
        print(f"   12345678000190,EMPRESA 2")
        return
    
    # Ler lista de empresas
    print("📋 Carregando lista de empresas...")
    try:
        df_empresas = pd.read_csv(ARQUIVO_EMPRESAS)
        
        # Validar formato
        if 'CNPJ' not in df_empresas.columns or 'Nome' not in df_empresas.columns:
            print("❌ ERRO: Arquivo de empresas deve ter colunas 'CNPJ' e 'Nome'")
            return
        
        # Remover linhas com placeholders (CNPJ_EMPRESA_X)
        df_empresas = df_empresas[~df_empresas['CNPJ'].str.startswith('CNPJ_')]
        
        lista_empresas = list(df_empresas.itertuples(index=False, name=None))
        
        print(f"✅ {len(lista_empresas)} empresas encontradas:")
        for cnpj, nome in lista_empresas:
            print(f"   • {nome} ({cnpj})")
        print()
        
    except Exception as e:
        print(f"❌ ERRO ao ler arquivo de empresas: {e}")
        return
    
    # Perguntar confirmação
    resposta = input("Deseja continuar com o processamento? (s/n): ")
    if resposta.lower() != 's':
        print("❌ Processamento cancelado pelo usuário.")
        return
    
    print()
    
    # Criar processador
    try:
        processador = ProcessadorDREDFC(DIR_ENTRADA, DIR_SAIDA)
        processador.carregar_referencias()
    except Exception as e:
        print(f"❌ ERRO ao inicializar processador: {e}")
        return
    
    # Processar empresas
    print()
    processador.processar_multiplas_empresas(lista_empresas)
    
    print("\n" + "="*80)
    print("  PROCESSAMENTO CONCLUÍDO")
    print("="*80 + "\n")
    print(f"📁 Os arquivos foram salvos em: {DIR_SAIDA}")
    print()


if __name__ == '__main__':
    main()
