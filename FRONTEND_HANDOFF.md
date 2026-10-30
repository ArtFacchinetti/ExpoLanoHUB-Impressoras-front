# Guia para iniciar a interface do módulo de impressoras

Estado do backend: **v0.4.0**, em 30/10/2026. Este documento é o contrato de trabalho para começar uma interface em outro chat ou repositório. A API já fornece o necessário para uma primeira tela de dashboard, lista de impressoras, detalhes e relatório mensal. A interface visual ainda não existe.

## Começar no ambiente local

O backend está em `C:\Users\Expol\Documents\Dev\impressoras`. Na pasta dele, com Docker Desktop ativo:

```powershell
docker compose up -d api
Invoke-RestMethod 'http://127.0.0.1:3000/health'
```

Resposta esperada: `{"status":"ok","database":"ok"}`. A API atende **somente no computador local** em `http://127.0.0.1:3000`. O banco está em Docker e seus dados sobrevivem à recriação dos contêineres por meio de um volume nomeado. Não execute `docker compose down -v`, pois isso remove o volume. Não copie `.env`, a senha do banco ou a comunidade SNMP para o repositório da interface.

Para uma interface em outro repositório, com o servidor de desenvolvimento rodando no **mesmo Windows**, use um **proxy**: encaminhe `/api/*` para `http://127.0.0.1:3000/*` e chame `fetch('/api/printers/status')`. Isso evita uma chamada direta do navegador para outra origem: a API ainda não envia cabeçalhos CORS. Se o frontend rodar em outro contêiner ou computador, essa configuração de rede precisará ser adaptada. Se o novo projeto usar Vite, um exemplo é:

```ts
// vite.config.ts, dentro de defineConfig({ ... })
server: {
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:3000',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
  },
},
```

Veja a [configuração oficial do proxy do Vite](https://vite.dev/config/server-options#server-proxy). Para uma instalação futura, a interface e a API podem ser servidas sob a mesma origem com um proxy reverso. A API não tem autenticação; mantenha esta fase local.

## Rotas disponíveis

Todas respondem JSON. `id` é o UUID da impressora, obtido em `/printers` ou `/printers/status`. `month` usa `AAAA-MM`; omitido, usa o mês atual no fuso `America/Sao_Paulo`.

| Método | Rota | Uso na interface |
| --- | --- | --- |
| GET | `/health` | Indicador de conexão com API e banco |
| GET | `/printers/status` | Lista principal: cadastro e último estado de todas as impressoras |
| GET | `/printers` | Cadastro sem o estado, se necessário |
| GET | `/printers/{id}/status` | Detalhe de uma impressora |
| GET | `/printers/events?printerId={id}` | Até 100 eventos recentes; filtro opcional por impressora |
| GET | `/printers/{id}/metrics?month=2026-10&limit=100` | Amostras do contador, mais recentes primeiro; `month` opcional, `limit` de 1 a 500, padrão 100 |
| GET | `/reports/monthly?month=2026-10` | Total mensal e uma linha por impressora |
| GET | `/dashboard/summary?month=2026-10` | Quantidade de impressoras online, offline e total do contador no mês |
| POST | `/printers` | Cadastrar IP: `{"ip":"192.168.0.57"}`; retorna cadastro existente se já houver |
| POST | `/printers/{id}/poll` | Coleta manual: `{"level":"FAST"}` ou `{"level":"NORMAL"}` |

As duas rotas `POST` são úteis para uma tela administrativa local. A primeira versão da interface pode usar apenas os `GETs`.

## Formatos que a interface deve consumir

`GET /dashboard/summary?month=2026-10`:

```json
{
  "month": "2026-10",
  "printers": { "total": 7, "online": 6, "offline": 1, "unknown": 0 },
  "monthlyTotalRaw": "656",
  "timezone": "America/Sao_Paulo",
  "attribution": "increment_at_reading_time"
}
```

Os números acima são **exemplo de uma resposta real em 30/10/2026** e mudam conforme chegam novas coletas. `monthlyTotalRaw` é string numérica para preservar inteiros grandes. Pode ser apresentado como **“aumento do contador no mês”**. Ainda não o rotule como folhas físicas, páginas faturáveis ou somente trabalhos enviados pelo computador.

`GET /reports/monthly?month=2026-10` tem `month`, `timezone`, `attribution`, `counterOid`, `totalRaw` e `printers`. Cada item de `printers` tem esta forma:

```json
{
  "printerId": "4d2f6163-33e8-44a0-859a-8e97fd27099c",
  "ip": "192.168.0.53",
  "online": true,
  "totalRaw": "68",
  "sampleCount": 329,
  "resets": 0,
  "firstReadingAt": "2026-10-28T19:23:51.036Z",
  "lastReadingAt": "2026-10-30T17:40:24.646Z",
  "lastValueRaw": "609516",
  "unitCodeRaw": "8"
}
```

`GET /printers/status` retorna um **array** de objetos `{ id, ip, description, enabled, createdAt, updatedAt, status }`. `status` pode ser `null` até a primeira coleta. Campos úteis dentro de `status`:

- `online`: `true`, `false` ou `null`; `false` após três falhas consecutivas.
- `printerState`: por exemplo `idle`, `printing`, `warmup` ou `unknown`.
- `display`: texto do visor, que pode alternar frequentemente.
- `lastPoll`, `lastSuccess`, `lastFailure`, `lastChange`: datas ISO em UTC; exiba no fuso local.
- `lastError`: mensagem de erro ou `null`; pode indicar falha parcial de uma tabela SNMP mesmo com `online: true`.
- `counters`: array de `{ oid, index, valueRaw, unitOid?, unitCodeRaw?, unitLabel? }`.
- `supplies`: array de valores brutos como `{ index, description, levelRaw, maxCapacityRaw, unitCodeRaw }`.

`GET /printers/{id}/metrics` retorna `{ printer: { id, ip }, month, items }`. Cada item contém `id`, `timestamp` e `values.counters`. Amostras recentes têm `deltaStatus`, `deltaRaw` e `intervalStart`; amostras anteriores à versão 0.3.0 têm apenas `index` e `valueRaw`. O endpoint limita a resposta a 500 itens; **não tem paginação completa**.

`GET /printers/events` retorna um array de `{ id, printerId, timestamp, type, changes }`. `type` é `state_changed`; `changes` descreve o valor anterior e o novo de `online`, `printerState` ou `display`. Há muitas mudanças de texto no visor, então a interface deve destacar primeiro mudanças de disponibilidade e estado.

## Regra do relatório e limites atuais

O backend coleta status a cada **30 segundos** e contador/suprimentos a cada **5 minutos**, por padrão. O relatório mensal soma aumentos do contador SNMP `prtMarkerLifeCount` no índice `1.1`. A primeira leitura é linha de base; uma queda do contador não é somada e incrementa `resets`. Cada aumento entra no mês da leitura que o detectou, inclusive após uma pausa ou na virada do mês, conforme a decisão do projeto. O histórico automático começou em **28/10/2026**; meses anteriores não têm dados.

Na .53, um teste físico mostrou que o total subiu de `609504` para `609514` após 5 faces simples, 4 faces frente e verso e 1 página de relatório. Embora a unidade SNMP declarada seja `8` (`sheets`), o comportamento observado coincidiu com **10 faces marcadas**. Por isso a interface deve conservar o termo “contador” até validar a semântica em mais equipamentos.

`supplies.levelRaw: "-3"` **não é 3%**. Não desenhe barra de toner baseada nesse valor sem uma regra validada. O visor pode exibir alerta de cartucho mesmo quando `printerState` é `idle`; mostre os dois dados separadamente.

## Escopo sugerido da primeira interface

1. Dashboard com cartões de impressoras online/offline/desconhecidas e total do contador no mês, usando `/dashboard/summary`.
2. Tabela de impressoras com IP, modelo, estado, visor, último sucesso e contador atual, usando `/printers/status`.
3. Página de detalhes por UUID, com estado, leituras recentes e eventos, usando as rotas por impressora.
4. Relatório mensal com seletor `AAAA-MM`, total geral e linha por impressora, usando `/reports/monthly`.
5. Estados de carregamento, ausência de dados e falha de conexão. Atualize status a cada ~30 segundos e relatório a cada ~5 minutos; não consulte a cada segundo.

Para um gráfico de **evolução diária completa** ou histórico de eventos com paginação, a API precisará de rotas agregadas/paginadas. Isso não bloqueia as telas acima. Para publicar a interface a outros usuários, serão necessários autenticação, controle de acesso, HTTPS, backup e uma forma segura de expor a API; a instalação atual foi feita para desenvolvimento local.

## Mensagem para iniciar outro chat

Anexe este arquivo ao novo chat ou copie seu conteúdo para o novo repositório antes de enviar a mensagem abaixo.

> Quero criar, em um novo repositório, uma interface web para o módulo de impressoras já existente. Leia `FRONTEND_HANDOFF.md` deste backend. Comece com dashboard, lista, detalhes e relatório mensal. A API local está em `http://127.0.0.1:3000`; use um proxy de desenvolvimento `/api` e não coloque credenciais SNMP ou do banco no frontend. Preserve os campos numéricos brutos como strings e siga as ressalvas do documento sobre contadores e suprimentos. Faça uma interface clara, responsiva e em português.
