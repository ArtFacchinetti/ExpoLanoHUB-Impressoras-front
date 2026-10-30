# Gerenciador de impressoras — frontend

Interface web em português para a [API local de impressoras](../impressoras). Inclui visão geral, lista de equipamentos, detalhe com leituras e eventos, e relatório mensal.

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

Para validar a versão de produção, execute `npm.cmd run build`. O servidor de produção que hospedar `dist/` precisará encaminhar `/api/*` para a API e devolver `index.html` nas rotas do módulo. A API atual não tem autenticação e só deve ser usada localmente nesta fase.

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
