# Endereço interno para o módulo de impressoras

Endereço ativo: `http://impressoras.lanobrasil.local/impressoras`, sem digitar IP ou porta. Em 30/10/2026, o nome resolve para `192.168.0.109`, a página e `/api/health` responderam neste computador, e o usuário confirmou acesso por outras máquinas. As etapas abaixo ficam como referência para manutenção ou migração.

O DNS existente usa a zona `lanobrasil.local` e responde em `192.168.0.197` (`vmdc01.lanobrasil.local`). A aplicação continua no computador que hospeda o Docker; não é necessário instalar Docker no servidor DNS Windows Server 2012.

## 1. Reservar o IP do computador da aplicação

O IP `192.168.0.109` é recebido por DHCP. Antes de criar o registro DNS, reserve esse endereço para a placa Ethernet do computador servidor. No console DHCP do servidor, localize o lease `192.168.0.109` no escopo `192.168.0.0/24` e use **Add to Reservation**. Se o DHCP estiver em outro equipamento, faça a reserva nele. Para conferir o endereço físico da placa no computador servidor:

```powershell
Get-NetAdapter -Name Ethernet | Select-Object Name,MacAddress
```

Se esse IP já tiver uma reserva, apenas confirme que corresponde a este computador. Se a equipe de rede escolher outro IP fixo, use o novo endereço em todas as etapas abaixo.

## 2. Criar o registro no DNS

No servidor DNS, abra **DNS Manager** e navegue por **Forward Lookup Zones → lanobrasil.local**. Clique com o botão direito na zona e escolha **New Host (A or AAAA)**. Preencha:

| Campo | Valor |
| --- | --- |
| Name | `impressoras` |
| IP address | `192.168.0.109` (ou o IP reservado) |

Clique em **Add Host**. Isso cria `impressoras.lanobrasil.local`; não é necessário criar uma nova zona ou comprar um domínio. Não altere os registros existentes do controlador de domínio.

## 3. Confirmar a resolução

Em um computador cliente que usa o DNS corporativo:

```powershell
nslookup impressoras.lanobrasil.local 192.168.0.197
nslookup impressoras.lanobrasil.local
Test-NetConnection impressoras.lanobrasil.local -Port 80
```

Os dois `nslookup` devem retornar o IP reservado. O primeiro consulta o DNS corporativo diretamente; o segundo testa a configuração normal do cliente. `Test-NetConnection` deve mostrar `TcpTestSucceeded: True`.

## 4. Abrir a página

Use `http://impressoras.lanobrasil.local/impressoras`. O endereço sem `/impressoras` também abre a aplicação e redireciona para essa rota. O acesso antigo pela porta 8080 continua disponível durante esta fase.

Se o nome resolver mas a porta 80 não abrir em outro computador, verifique o firewall do Windows no computador que hospeda o Docker. Em PowerShell **como administrador**:

```powershell
New-NetFirewallRule -DisplayName "Impressoras Front HTTP 80" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 80 -Profile Private -RemoteAddress LocalSubnet
```

O acesso a partir de outro computador foi confirmado pelo usuário. Só crie a regra acima se uma futura mudança no firewall bloquear a porta 80.

## Próxima etapa

O endereço acima usa HTTP e a API ainda não tem autenticação. Antes de ampliar o acesso, configurar autenticação e HTTPS com certificado confiável para os computadores da empresa. A zona `.local` pode apresentar problemas de resolução em alguns aparelhos Apple; se isso ocorrer, usar um subdomínio interno de um domínio corporativo registrado.
