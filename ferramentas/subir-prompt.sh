#!/bin/bash
# =====================================================================
# SUBIR O PROMPT PRO BANCO
#
# O prompt não mora mais na página: ele mora no seu Supabase (tabela
# prompts_publicos), e só sai de lá pra quem comprou. Este script pega
# o prompt.md daqui da pasta e manda pro banco.
#
# COMO USAR (no Terminal, dentro desta pasta):
#   ./ferramentas/subir-prompt.sh
#
# Não precisa de senha: ele usa o login que a CLI do Supabase já tem
# guardado no seu Mac.
#
# Depois de subir, a mudança vale NA HORA pra todas as alunas. Não
# precisa de commit nem de push: a página só busca o texto do banco.
# =====================================================================

set -e
cd "$(dirname "$0")/.."

PROJETO="ykypgdzihgxibeplvrjj"   # o Supabase da comunidade
CHAVE="manychat"

if [ ! -f prompt.md ]; then
  echo "Não achei o prompt.md aqui na pasta."
  exit 1
fi

# Pega o login da CLI do Supabase no chaveiro do Mac.
TOKEN=$(security find-generic-password -s "Supabase CLI" -a "supabase" -w 2>/dev/null \
  | sed 's/^go-keyring-base64://' | base64 -d 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "Não consegui pegar seu login do Supabase."
  echo "Rode 'supabase login' primeiro e tente de novo."
  exit 1
fi

PROMPT=$(cat prompt.md)

# O $marca$ ... $marca$ é o jeito do Postgres aceitar um texto grande
# com aspas e acento dentro, sem se atrapalhar.
SQL="update prompts_publicos
        set texto = \$sobe_prompt\$${PROMPT}\$sobe_prompt\$,
            atualizado_em = now()
      where chave = '${CHAVE}';"

curl -s -X POST "https://api.supabase.com/v1/projects/${PROJETO}/database/query" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg q "$SQL" '{query:$q}')" > /dev/null

# Confere o que ficou salvo.
CONFERE=$(curl -s -X POST "https://api.supabase.com/v1/projects/${PROJETO}/database/query" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg q "select length(texto) as t, produtos_liberados from prompts_publicos where chave='${CHAVE}';" '{query:$q}')")

echo
echo "Prompt atualizado no banco."
echo "  $(echo "$CONFERE" | jq -r '.[0].t') caracteres salvos"
echo "  abre pra quem comprou: $(echo "$CONFERE" | jq -r '.[0].produtos_liberados | join(", ")')"
echo
echo "Já está valendo pras alunas. Não precisa de push."
