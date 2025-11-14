## Diagnóstico
- Confirmar DNS e resposta
  - `dig +short www.ifin.app.br` deve apontar para `147.93.183.55`
  - `curl -I https://www.ifin.app.br/` para ver status e headers
- Verificar configuração Nginx
  - `nginx -t` (sintaxe)
  - Listar vhosts: `/etc/nginx/sites-enabled` e conteúdo de `ifin.app.br`
  - Checar se há `proxy_pass` ativo (ex.: `:5173`, `:3000`) causando 502
- Logs
  - `tail -n 200 /var/log/nginx/error.log`
  - `tail -n 200 /var/log/nginx/ifin.app.br.error.log` (se existir)

## Correção (vhost estático SPA)
- Conteúdo do vhost (HTTPS):
```
server {
    listen 443 ssl;
    server_name www.ifin.app.br ifin.app.br;
    ssl_certificate /etc/letsencrypt/live/www.ifin.app.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.ifin.app.br/privkey.pem;

    root /var/www/finapp;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Temporário: evitar 502 em /api
    location ^~ /api/ {
        return 204;
    }
}
```
- HTTP → HTTPS (opcional):
```
server {
    listen 80 default_server;
    server_name _;
    return 301 https://$host$request_uri;
}
```
- Remover blocos antigos que fazem `proxy_pass` para dev servers (`:5173`, `:3000`) e qualquer upstream inexistente.

## Execução
1) Aplicar vhost acima em `/etc/nginx/sites-available/ifin.app.br` e `ln -sf` para `sites-enabled`
2) `nginx -t` e recarregar: `nginx -s reload` (ou `kill -HUP <PID>` se não estiver sob systemd)
3) Testar:
   - `curl -I https://www.ifin.app.br/` → `200 OK`
   - Navegar no site; rotas SPA devem funcionar
4) Ajustar `/api` quando a Edge Function/Wasender estiver pronta (trocar `return 204` por proxy real)

## Validação
- Verificar logs de erro e acesso após reload
- Conferir que não há mais 502; se persistir, apontar qual `location` está acionado (`curl -v` e inspecionar)

## Entrega
- Eu aplico a correção, recarrego Nginx e te envio o status (`200 OK`) e os logs/prints de validação.
