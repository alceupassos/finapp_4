## 🚀 Como fazer Deploy no VPS

### Primeira vez - Modo Fácil

```bash
./deploy-setup.sh
```

O script interativo vai:
- ✅ Pedir informações do VPS (IP, usuário, senha)
- ✅ Testar conexão SSH automaticamente
- ✅ Instalar Nginx se necessário
- ✅ Fazer build e deploy completo
- ✅ Salvar configurações para próximos deploys

### Deploys futuros (rápido)

```bash
./deploy-quick.sh
```

### Verificar antes de fazer deploy

```bash
./check-deploy.sh
```

---

## 📚 Documentação Completa

- **DEPLOY-QUICKSTART.md** - Comandos úteis e guia rápido
- **DEPLOY.md** - Documentação detalhada com troubleshooting

## 🔧 Requisitos do VPS

- Ubuntu/Debian Linux
- Acesso SSH (root ou sudo)
- Nginx (instalado automaticamente se necessário)

## 🌐 Após o Deploy

Acesse sua aplicação em:
```
http://SEU_IP_DO_VPS
```

Configure SSL (HTTPS):
```bash
ssh root@SEU_IP
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d seu_dominio.com
```
