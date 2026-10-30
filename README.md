# Gerenciador de impressoras — frontend

Interface web em português para a [API local de impressoras](../impressoras). Inclui visão geral, lista de equipamentos, detalhe com leituras e eventos, e relatório mensal.

Na visão geral, **Coletar agora** consulta estado (`FAST`) e contador/suprimentos (`NORMAL`) de todas as impressoras ativas. O resultado informa quantas responderam e quais falharam; ao terminar, os dados da interface são consultados novamente. **Atualizar tela** apenas relê os dados já armazenados, sem iniciar uma coleta SNMP.

## Contêiner do frontend

O `Dockerfile` gera o build estático e o Caddy o serve na porta 80 do contêiner. O `compose.yaml` publica a porta **8080** do computador, liga o frontend à rede Docker `impressoras_default` e configura reinício automático `unless-stopped`. O Caddy encaminha `/api/*` diretamente ao serviço `api:3000` e devolve `index.html` para as rotas da interface. A porta 3000 do backend continua restrita a `127.0.0.1` no computador.

Inicie primeiro o backend, pois ele cria a rede compartilhada. Depois suba o frontend em segundo plano:

```powershell
cd C:\Users\Expol\Documents\Dev\impressoras
docker compose up -d api

cd C:\Users\Expol\Documents\Dev\impressorasFront
docker compose up -d --build web
docker compose ps
```

Abra `http://127.0.0.1:8080/impressoras` no próprio computador. Em outro computador da rede, use `http://192.168.0.109:8080/impressoras` enquanto esse for o IP do servidor. O terminal pode ser fechado após `up -d`. Para aplicar alterações no código do frontend, repita `docker compose up -d --build web` nesta pasta. Para consultar logs use `docker compose logs --tail=100 web`; para parar, `docker compose stop web`.

Se a rede bloquear a porta 8080, crie esta regra no PowerShell **como administrador** do computador que hospeda o Docker:

```powershell
New-NetFirewallRule -DisplayName "Impressoras Front Container 8080" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8080 -Profile Private -RemoteAddress LocalSubnet
```

A regra não foi criada automaticamente porque a sessão de desenvolvimento não tinha permissão de administrador. A página e `/api/health` foram testadas pelo IP local `192.168.0.109`, mas o acesso a partir de outro computador ainda precisa ser conferido. Se quiser restringir o contêiner ao próprio computador, defina `FRONT_BIND_IP=127.0.0.1` em `.env`; `FRONT_PORT` e `BACKEND_DOCKER_NETWORK` também podem ser ajustados conforme `.env.example`.

Este serviço ainda usa HTTP e a API não tem autenticação. Use-o apenas numa rede interna confiável até implementar autenticação, HTTPS e política de acesso. Para permanecer disponível após reiniciar o computador, o Docker também precisa iniciar automaticamente; `unless-stopped` só age quando o Docker está em execução. Neste computador, a opção **Docker Desktop → Settings → General → Start Docker Desktop when you sign in** estava desativada em 30/10/2026 e precisa ser ativada para iniciar após o login. Isso ainda não equivale a um servidor que opera antes do login. O Windows Server 2012 da empresa não é o destino para esses contêineres.

## Rodar localmente

Requer Node.js 20.19+ ou 22.12+ e o backend ativo em `http://127.0.0.1:3000`.

```powershell
# No repositório do backend, com Docker Desktop ativo:
docker compose up -d api

# Neste repositório:
npm.cmd install
npm.cmd run dev
```

Abra o endereço informado pelo Vite (por padrão `http://127.0.0.1:5173`). Se a API usar outra porta, copie `.env.example` para `.env.local` e ajuste `VITE_API_PROXY_TARGET`. O navegador chama apenas `/api/*`; o proxy do Vite encaminha as requisições à API local. Não coloque credenciais do banco ou SNMP neste projeto.

### Acesso temporário pela rede local

No computador que roda o backend e este frontend, mantenha o Docker ativo e execute:

```powershell
cd C:\Users\Expol\Documents\Dev\impressorasFront
npm.cmd run dev:lan
```

Em outro computador da mesma rede, abra `http://192.168.0.109:5174/impressoras`. Esse é o IP Ethernet observado em 30/10/2026; se mudar, confirme o novo IP com `Get-NetIPAddress -AddressFamily IPv4`. O modo de rede usa a porta 5174, separada da porta 5173 usada em `npm.cmd run dev`. O backend permanece acessível só no computador servidor, enquanto o proxy `/api` do frontend repassa as chamadas.

Se o outro computador não conseguir abrir a página, verifique o firewall do Windows no computador servidor. Em PowerShell **como administrador**, esta regra libera apenas a porta do frontend para a sub-rede local no perfil privado:

```powershell
New-NetFirewallRule -DisplayName "Impressoras Front LAN" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5174 -Profile Private -RemoteAddress LocalSubnet
```

Use `dev:lan` apenas para testes com computadores confiáveis. O Vite serve arquivos de desenvolvimento, e a API ainda não tem autenticação: qualquer pessoa com acesso a essa página pode consultar os dados e acionar os botões de coleta. Para manter o frontend em execução sem terminal aberto, use o contêiner descrito acima.

Para validar o build fora do Docker, execute `npm.cmd run build`. O Caddy no contêiner já encaminha `/api/*` e devolve `index.html` nas rotas do módulo.

## Integração futura

O módulo está isolado em `src/modules/printers`. Para anexá-lo a um aplicativo React com React Router, monte uma rota com `/*` e passe o mesmo prefixo à propriedade `basePath`:

```tsx
import { PrinterModule } from './modules/printers';

<Route
  path="/operacoes/impressoras/*"
  element={<PrinterModule basePath="/operacoes/impressoras" apiBasePath="/api" embedded />}
/>
```

O módulo mantém suas próprias consultas e rotas. Com `embedded`, usa a navegação do aplicativo anfitrião e omite a barra lateral própria. `apiBasePath` pode apontar para outro caminho de mesma origem quando o aplicativo maior fornecer seu proxy. O CSS é limitado ao elemento raiz do módulo. Os contratos JSON e a interpretação dos valores estão em `types.ts`, `api.ts` e `format.ts`.

## Semântica dos dados

- Totais e leituras de contador são preservados como strings na API e formatados com `BigInt` apenas na apresentação.
- O valor mensal é mostrado como **aumento do contador**, sem equivalência presumida em folhas ou trabalhos faturáveis.
- Suprimentos mostram valores brutos. Valores negativos como `-3` não viram porcentagens.
- Status atualiza a cada 30 segundos; relatório e amostras a cada 5 minutos.
- O histórico automático começou em 28/10/2026. Leituras e eventos usam os limites atuais da API, sem prometer paginação completa.

Consulte [FRONTEND_HANDOFF.md](./FRONTEND_HANDOFF.md) para o contrato e as limitações do backend v0.4.0.
