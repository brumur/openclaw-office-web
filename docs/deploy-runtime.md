# Deploy / Runtime Notes (Jarvis)

Notas reais do deploy que funcionou no host **Jarvis**.

---

## Runtime validado

- App web publicada localmente no host **Jarvis**
- Exposição: **host `:7080` → container/app `:3000`**
- `server.js` serve **HTTP + `/ws` no mesmo processo e na mesma porta 3000**
- Em desenvolvimento, o Vite roda em **8090** e faz proxy de `/api` e `/ws` para `localhost:3000`

Resumo prático:

```text
browser -> http://jarvis:7080
             \-> /api  -> server.js:3000
             \-> /ws   -> server.js:3000
```

---

## OPENCLAW_URL no container Linux

### Problema observado

Configurar:

```bash
OPENCLAW_URL=http://host.docker.internal:18789
```

falhou dentro do container Linux com erro de resolução de nome (`ENOTFOUND`).

### Correção aplicada

Usar o gateway do Docker no host Linux:

```bash
OPENCLAW_URL=http://172.17.0.1:18789
```

Isso permitiu o `server.js` alcançar o OpenClaw rodando no host.

> Se a rede Docker mudar, revalidar o IP do gateway. No runtime atual do Jarvis, `172.17.0.1` foi o valor que funcionou.

---

## Ordem real dos bloqueios de conexão

### 1. Bridge sem alcançar o OpenClaw

Primeiro o backend nem chegava no OpenClaw por causa do `host.docker.internal` no Linux.

Sintoma: falha de conexão antes mesmo da autenticação/pairing.

Fix: trocar para `http://172.17.0.1:18789`.

### 2. `PAIRING_REQUIRED` / `not-paired`

Depois que a conectividade ficou correta, o próximo bloqueio passou a ser de identidade do dispositivo.

Sintoma: o bridge conecta no endpoint, mas o OpenClaw recusa a sessão porque o device ainda não foi aprovado.

Correção operacional:
- aprovar o device pending no OpenClaw
- depois disso a conexão sobe normalmente

Fluxo prático:

```bash
openclaw devices list
openclaw devices approve <deviceId>
```

---

## Persistência de identidade / pairing

O `server.js` gera e usa uma identidade local persistida em:

```bash
~/.pixel-office-identity.json
```

ou no caminho definido por `OPENCLAW_IDENTITY_PATH`.

### Observação importante

Se essa identidade não persistir entre rebuilds/redeploys, o app gera um novo device e o OpenClaw pode voltar a exigir aprovação (`PAIRING_REQUIRED`).

### Recomendação operacional

Em deploy containerizado, preservar esse arquivo via volume/bind mount.

Exemplo conceitual:

```text
host persistent file/dir -> container OPENCLAW_IDENTITY_PATH
```

A regra prática é simples:
- **token sozinho não basta**
- o **device aprovado precisa continuar sendo o mesmo**
- se trocar a identidade, provavelmente será necessário aprovar de novo

---

## Problemas de frontend corrigidos nesse ciclo

### 1. Frontend tentava abrir `/ws` antes do login

#### Sintoma

Ao abrir a UI sem sessão autenticada, o frontend já tentava conectar em `/ws`. Como o upgrade do WebSocket exige cookie de sessão válido, isso gerava 401/loop de reconexão desnecessário antes do login.

#### Fix aplicado

`src/browserMock.ts` agora faz `fetch('/api/auth/check', { credentials: 'include' })` antes de abrir o WebSocket.

Com isso:
- sem login, a UI fica em estado `disconnected`
- o WebSocket só é aberto quando a sessão HTTP já existe
- evita erro prematuro de auth no `/ws`

### 2. Residentes / bonequinhos não apareciam se o bridge ainda não estava ready

#### Sintoma

Se o browser conectasse antes de o bridge com OpenClaw receber `hello-ok`, os residentes fixos (Jarvis, Lexi, Dev, Infra) não apareciam no escritório.

#### Causa

Os `agentCreated` dos residentes só eram enviados quando o OpenClaw ficava pronto.

#### Fix aplicado

`server.js` passou a:
- anunciar os residentes imediatamente para cada cliente WebSocket novo
- manter e enviar um `bridgeStatus` separado (`connecting`, `connected`, `disconnected`)
- reanunciar os residentes quando a conexão com o OpenClaw estabiliza

Resultado:
- o escritório já carrega povoado
- o estado do bridge fica visível sem depender da presença dos personagens
- reconexões do OpenClaw não “apagam” os residentes

---

## Checklist curto para novos redeploys

1. Garantir publicação do app em **7080 -> 3000** no Jarvis
2. Garantir `OPENCLAW_URL=http://172.17.0.1:18789` no container Linux atual
3. Persistir `~/.pixel-office-identity.json` (ou `OPENCLAW_IDENTITY_PATH`) fora do ciclo efêmero do container
4. Se aparecer `PAIRING_REQUIRED` novamente, verificar se a identidade foi perdida/trocada
5. Validar login antes de testar `/ws`
