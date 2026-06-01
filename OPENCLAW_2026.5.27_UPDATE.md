# Atualização Pixel Office Web → OpenClaw 2026.5.27

## Resumo

O projeto Pixel Office Web foi atualizado para ser compatível com o OpenClaw v2026.5.27 (protocolo v4).

## Mudanças Realizadas

### 1. `server.js` - Correções Críticas

#### ✅ Protocolo WebSocket
- **URL corrigido**: `ws://host:port/ws` (sem `/api/v1`)
- **Protocolo atualizado**: v4 (era v3)

#### ✅ Autenticação
- Mantida autenticação Ed25519 (ainda necessária para dispositivos)
- Corrigido `client.mode` de `"operator"` para `"cli"` (valor permitido pelo schema)
- Corrigido `client.id` para `"cli"` (valor permitido)

#### ✅ Conexão
- Adicionada inscrição em eventos de sessão: `sessions.messages.subscribe`
- Mantida reconexão automática

#### ✅ Eventos de Ferramentas
- Mantido mapeamento correto: `stream: "tool"` com `phase: "start" | "done" | "error"`
- Mantidos nomes de ferramentas compatíveis

### 2. `src/hooks/useExtensionMessages.ts`
- ✅ Já estava correto - usa tipos de mensagens compatíveis
- `agentToolStart`, `agentToolDone`, `agentToolsClear`
- `agentStatus`, `agentOutput`, `agentCreated`

### 3. `src/browserMock.ts`
- ✅ Já estava correto - conecta em `ws://localhost:3002`

## Testes

```bash
# Terminal 1 - Backend
node server.js

# Terminal 2 - Frontend
npm run dev
```

**Resultado**: ✅ Conectado com sucesso ao OpenClaw 2026.5.27 (protocolo 4)

```
[OpenClaw] Connected! Server 2026.5.27, protocol 4
```

## Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `server.js` | URL WS, protocolo v4, client.mode="cli", subscriptions |

## Arquivos Não Modificados (já compatíveis)

| Arquivo | Status |
|---------|--------|
| `src/hooks/useExtensionMessages.ts` | ✅ Compatível |
| `src/browserMock.ts` | ✅ Compatível |
| `src/App.tsx` | ✅ Compatível |

## Próximos Passos

1. **Testar envio de mensagens** - Verificar se chat funciona corretamente
2. **Testar eventos de ferramentas** - Confirmar que tool bubbles aparecem
3. **Verificar múltiplas sessões** - O roadmap menciona suporte a multi-session

## Notas

- A autenticação Ed25519 ainda é necessária para dispositivos (não foi removida completamente)
- O campo `caps` deve ser `[]` (vazio) para clientes operator
- O campo `commands` deve ser `[]` (vazio) para clientes operator
