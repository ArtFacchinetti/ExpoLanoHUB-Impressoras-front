# Estado do módulo de impressoras

Atualizado em 30/10/2026.

## Já temos

- Backend v0.4.0 em Docker: coleta SNMP, banco PostgreSQL persistente, status, eventos, métricas, resumo e relatório mensal.
- Frontend React/TypeScript: visão geral, lista com busca e filtro, detalhes e relatório mensal, com estados de carregamento e erro.
- Botão **Coletar agora** na home: executa `FAST` e `NORMAL` nas impressoras ativas, mostra progresso e atualiza a tela.
- Proxy `/api`, mantendo a API do Docker na porta local `127.0.0.1:3000`.
- Estilos responsivos e módulo que pode ser incorporado a um aplicativo React maior.
- Comando opcional `npm.cmd run dev:lan` para testes em outros computadores da mesma rede.
- Contêiner do frontend com build estático, Caddy, proxy `/api` e reinício `unless-stopped`. Testado localmente na porta 8080.
- A porta 80 também está publicada e foi testada localmente, preparando a URL sem número de porta.

## Falta para uso contínuo por outras pessoas

1. Autenticação e controle de acesso, especialmente para cadastro e coleta manual. A API atual não autentica requisições.
2. Adicionar HTTPS e autenticação à publicação contínua. O Caddy já serve o build e encaminha `/api`, mas esta fase ainda usa HTTP e não tem login.
3. Se necessário, criar a regra de firewall para a porta 80 com administrador e validar a abertura em outro computador. A porta 8080 já havia sido testada em outras máquinas.
4. Reservar o IP do host e criar `impressoras.lanobrasil.local` no DNS corporativo; validar a porta 80 em outro computador. Ver [DNS_INTERNO.md](./DNS_INTERNO.md).
5. Ativar o início automático do Docker Desktop após login no computador atual ou migrar para um host dedicado com Docker Engine iniciado como serviço.
6. Definir backup e recuperação do volume do PostgreSQL antes de depender do histórico.
7. Validar a semântica física do contador em mais modelos e as regras de nível dos suprimentos. Hoje a interface mantém os valores brutos.
8. Se forem necessários gráficos históricos completos, ampliar a API com agregações e paginação de métricas e eventos.
