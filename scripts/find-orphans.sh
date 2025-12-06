#!/bin/bash

OUTPUT="orphan-report.txt"

echo "🔍 RELATÓRIO DE COMPONENTES ÓRFÃOS" > $OUTPUT
echo "Gerado em: $(date)" >> $OUTPUT
echo "========================================" >> $OUTPUT
echo "" >> $OUTPUT

# 1. Modais órfãos
echo "1️⃣ MODAIS ÓRFÃOS" >> $OUTPUT
echo "---" >> $OUTPUT
for modal in $(grep -rh "export function.*Modal\|export const.*Modal" src --include="*.tsx" | sed 's/export function //g' | sed 's/export const //g' | sed 's/(.*//g' | sed 's/ =.*//g' | sort -u); do
  count=$(grep -r "import.*$modal" src --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
  if [ $count -eq 0 ]; then
    file=$(grep -r "export.*$modal" src --include="*.tsx" | head -1 | cut -d: -f1)
    echo "❌ $modal" >> $OUTPUT
    echo "   Arquivo: $file" >> $OUTPUT
    echo "" >> $OUTPUT
  fi
done

# 2. Componentes de UI órfãos
echo "" >> $OUTPUT
echo "2️⃣ COMPONENTES DE UI ÓRFÃOS (Button, Card, Input, etc.)" >> $OUTPUT
echo "---" >> $OUTPUT
for comp in $(grep -rh "export function.*\(Button\|Card\|Input\|Form\|Table\|List\)" src --include="*.tsx" | sed 's/export function //g' | sed 's/(.*//g' | sort -u); do
  count=$(grep -r "import.*$comp\|<$comp" src --include="*.tsx" 2>/dev/null | wc -l)
  if [ $count -eq 0 ]; then
    file=$(grep -r "export function $comp" src --include="*.tsx" | head -1 | cut -d: -f1)
    echo "❌ $comp" >> $OUTPUT
    echo "   Arquivo: $file" >> $OUTPUT
    echo "" >> $OUTPUT
  fi
done

# 3. Gráficos órfãos
echo "" >> $OUTPUT
echo "3️⃣ GRÁFICOS/CHARTS ÓRFÃOS" >> $OUTPUT
echo "---" >> $OUTPUT
for chart in $(grep -rh "export.*\(Chart\|Graph\|Plot\)" src --include="*.tsx" | sed 's/export function //g' | sed 's/export const //g' | sed 's/(.*//g' | sed 's/ =.*//g' | sort -u); do
  count=$(grep -r "import.*$chart\|<$chart" src --include="*.tsx" 2>/dev/null | wc -l)
  if [ $count -eq 0 ]; then
    file=$(grep -r "export.*$chart" src --include="*.tsx" | head -1 | cut -d: -f1)
    echo "❌ $chart" >> $OUTPUT
    echo "   Arquivo: $file" >> $OUTPUT
    echo "" >> $OUTPUT
  fi
done

# 4. Páginas órfãs
echo "" >> $OUTPUT
echo "4️⃣ PÁGINAS ÓRFÃS (src/pages)" >> $OUTPUT
echo "---" >> $OUTPUT
if [ -d "src/pages" ]; then
  for page in $(find src/pages -name "*.tsx" -o -name "*.ts"); do
    basename=$(basename $page .tsx)
    basename=$(basename $basename .ts)
    count=$(grep -r "import.*$basename\|from.*$page" src --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
    if [ $count -eq 0 ]; then
      echo "❌ $basename" >> $OUTPUT
      echo "   Arquivo: $page" >> $OUTPUT
      echo "" >> $OUTPUT
    fi
  done
else
  echo "(Diretório src/pages não existe)" >> $OUTPUT
fi

# 5. Hooks customizados órfãos
echo "" >> $OUTPUT
echo "5️⃣ HOOKS CUSTOMIZADOS ÓRFÃOS (use*)" >> $OUTPUT
echo "---" >> $OUTPUT
for hook in $(grep -rh "export.*function use[A-Z]\|export const use[A-Z]" src --include="*.tsx" --include="*.ts" | sed 's/export function //g' | sed 's/export const //g' | sed 's/(.*//g' | sed 's/ =.*//g' | sort -u); do
  count=$(grep -r "import.*$hook" src --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
  if [ $count -eq 0 ]; then
    file=$(grep -r "export.*$hook" src --include="*.tsx" --include="*.ts" | head -1 | cut -d: -f1)
    echo "❌ $hook" >> $OUTPUT
    echo "   Arquivo: $file" >> $OUTPUT
    echo "" >> $OUTPUT
  fi
done

# 6. Utilitários/helpers órfãos
echo "" >> $OUTPUT
echo "6️⃣ UTILITÁRIOS/HELPERS ÓRFÃOS" >> $OUTPUT
echo "---" >> $OUTPUT
if [ -d "src/utils" ] || [ -d "src/lib" ] || [ -d "src/helpers" ]; then
  for util_file in $(find src/utils src/lib src/helpers -name "*.ts" -o -name "*.tsx" 2>/dev/null); do
    # Extrair exports desse arquivo
    exports=$(grep "export" $util_file | sed 's/export function //g' | sed 's/export const //g' | sed 's/(.*//g' | sed 's/ =.*//g' | sed 's/{.*//g')
    for exp in $exports; do
      if [ ! -z "$exp" ]; then
        count=$(grep -r "import.*$exp" src --include="*.tsx" --include="*.ts" --exclude-dir="utils" --exclude-dir="lib" --exclude-dir="helpers" 2>/dev/null | wc -l)
        if [ $count -eq 0 ]; then
          echo "❌ $exp" >> $OUTPUT
          echo "   Arquivo: $util_file" >> $OUTPUT
          echo "" >> $OUTPUT
        fi
      fi
    done
  done
fi

echo "" >> $OUTPUT
echo "========================================" >> $OUTPUT
echo "✅ Relatório completo gerado em: $OUTPUT" >> $OUTPUT

cat $OUTPUT