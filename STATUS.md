# Estado do módulo de impressoras

Atualizado em 30/10/2026.

## Já temos

- Backend v0.4.0 em Docker: coleta SNMP, banco PostgreSQL persistente, status, eventos, métricas, resumo e relatório mensal.
- Frontend React/TypeScript: visão geral, lista com busca e filtro, detalhes e relatório mensal, com estados de carregamento e erro.
- Botão **Coletar agora** na home: executa `FAST` e `NORMAL` nas impressoras ativas, mostra progresso e atualiza a tela.
- Proxy `/api`, mantendo a API do Docker na porta local `127.0.0.1:3000`.
- Estilos responsivos e módulo que pode ser incorporado a um aplicativo React maior.
- Comando opcional `npm.cmd run dev:lan` para testes em outros computadores da mesma rede.

## Falta para uso contínuo por outras pessoas

1. Autenticação e controle de acesso, especialmente para cadastro e coleta manual. A API atual não autentica requisições.
2. Publicação do build estático em servidor apropriado, com HTTPS e proxy reverso para `/api`. O Vite serve apenas para desenvolvimento e testes.
3. Configurar acesso de rede e firewall no computador servidor e validar a abertura em outro computador. O IP local pode mudar.
4. Definir backup e recuperação do volume do PostgreSQL antes de depender do histórico.
5. Validar a semântica física do contador em mais modelos e as regras de nível dos suprimentos. Hoje a interface mantém os valores brutos.
6. Se forem necessários gráficos históricos completos, ampliar a API com agregações e paginação de métricas e eventos.
