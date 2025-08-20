# Integração Front‑end — Importação de Boletos (OlympiaBank)

Documento para orientar o front‑end a **subir arquivos (CSV/XLSX)** com até **2.000 linhas**, acompanhar **status/progresso** e baixar **relatórios** do processamento assíncrono.

> **Stack do back‑end (referência):** Node.js + NestJS/Express, BullMQ (workers), PostgreSQL, Docker. Processamento **assíncrono** com concorrência **12** e **retry** automático para 5xx/429 (máx. 5).

---

## 1) Visão geral do fluxo
1. Front envia **POST /v1/imports** (multipart/form-data) com o **arquivo** (CSV ou XLSX).
2. API responde com **201** e um **importId (UUID)**.
3. Front acompanha o status por **polling** (`GET /v1/imports/{id}`) **ou** via **SSE** (`GET /v1/imports/{id}/events`).
4. Ao concluir, o front pode baixar **resultados** e **erros**:
   - `GET /v1/imports/{id}/results.csv`
   - `GET /v1/imports/{id}/errors.csv`
5. O sistema também dispara um **webhook** (opcional) ao finalizar.

**Observação sobre vencimento**: o upstream OlympiaBank (endpoint de boletos) **não recebe vencimento como entrada** na especificação atual; “`vencimento`” é **armazenado e reportado** (para conferência) mas **não altera** o boleto no banco. Se o upstream passar a aceitar, a API será atualizada mantendo o mesmo layout de arquivo.

---

## 2) Autenticação
Todas as chamadas exigem header:
```
Authorization: Bearer <TOKEN_DO_CLIENTE>
```
Opcional para uploads idempotentes (recomendada ao re‑tentar o mesmo arquivo):
```
Idempotency-Key: <uuid-ou-hash-do-arquivo>
```

---

## 3) Upload de arquivo
### Endpoint
```
POST /v1/imports
Content-Type: multipart/form-data
```

### Campos (form-data)
- `file` (**obrigatório**): arquivo **CSV** ou **XLSX** com **cabeçalho** na primeira linha.
- `fileType` (**opcional**): `csv` | `xlsx` (detectado automaticamente se ausente).
- `delimiter` (**opcional, CSV**): vírgula `,` (padrão) ou `;`.
- `dateFormat` (**opcional**): `YYYY-MM-DD` (padrão). Aceita também `DD/MM/YYYY`.
- `webhookUrl` (**opcional**): URL para notificação ao concluir **(se não enviado, usa o padrão do cliente)**.

### Resposta (201)
```json
{
  "importId": "8e1b3b3d-8c9e-4f70-8a64-6a4c5e2a7a6c",
  "status": "queued",
  "receivedAt": "2025-08-14T15:10:00Z",
  "maxRows": 2000
}
```

### Limites
- **Máx. 1 arquivo** por requisição.
- **Até 2.000 linhas** por arquivo.
- Tamanho: sugerido **≤ 10MB**.

---

## 4) Layout do arquivo (colunas)
**Cabeçalho obrigatório** (ordem livre; nomes devem bater):
- `amount` → valor do boleto (**recomendado em centavos**, inteiro). Também aceita decimal em reais ("99.90" ou "99,90"); a API converte para centavos.
- `name` → nome do cliente.
- `document` → CPF ou CNPJ (enviar **apenas dígitos**).
- `telefone` → telefone (apenas dígitos; DDI/DDD opcionais; o back‑end normaliza para +55 quando ausente).
- `email` → e‑mail válido.
- `vencimento` → data desejada (reportada; ver observação).

### Regras de validação/sanitização
- `document`: 11 (CPF) ou 14 (CNPJ) dígitos. Caracteres não‑numéricos são removidos.
- `telefone`: remove não‑numéricos; se não tiver DDI, assume **+55**.
- `amount`: se decimal em reais, converte com precisão (ex.: "10.00" → 1000).
- `email`: validação básica RFC; espaços e acentos removidos.
- `vencimento`: aceita `YYYY-MM-DD` ou `DD/MM/YYYY`; armazenado e refletido no relatório (não enviado ao upstream neste momento).

### Exemplo CSV (UTF‑8, delimitador vírgula)
```
amount,name,document,telefone,email,vencimento
1099,João Souza,12345678901,11988887777,joao@example.com,2025-08-20
25990,Maria Lima,11222333000181,21999995555,maria@example.com,20/08/2025
```

### Exemplo XLSX
- Aba 1 (qualquer nome), linha 1 = cabeçalho acima; seguintes = dados.

---

## 5) Acompanhar status
### Polling
```
GET /v1/imports/{importId}
```
**Resposta (200)**
```json
{
  "importId": "8e1b3b3d-8c9e-4f70-8a64-6a4c5e2a7a6c",
  "status": "processing", // queued | processing | completed | failed | canceled
  "stats": {
    "total": 2000,
    "processed": 830,
    "succeeded": 800,
    "failed": 30,
    "remaining": 1170
  },
  "etaSeconds": 95,
  "startedAt": "2025-08-14T15:12:00Z",
  "updatedAt": "2025-08-14T15:12:25Z"
}
```

### SSE (para barra de progresso em tempo real)
```
GET /v1/imports/{importId}/events
Accept: text/event-stream
```
Eventos disparados: `queued`, `progress`, `completed`, `failed`.

**Exemplo de evento `progress`:**
```
event: progress
data: {"processed":830,"succeeded":800,"failed":30,"remaining":1170,"etaSeconds":95}
```

---

## 6) Baixar relatórios
```
GET /v1/imports/{importId}/results.csv   // Sucessos por linha
GET /v1/imports/{importId}/errors.csv    // Erros por linha
```

### `results.csv` (colunas)
- `row` (nº da linha original, 1‑based desconsiderando o cabeçalho)
- `status` (sempre `success`)
- `message` ("ok")
- `idTransaction`
- `boletoUrl`
- `boletoCode`
- `pdf`
- `dueDate` (retornado pelo upstream)
- `amount` (em centavos)
- `name`, `document`, `telefone`, `email`, `vencimento` (ecoados)

**Exemplo**
```
row,status,message,idTransaction,boletoUrl,boletoCode,pdf,dueDate,amount,name,document,telefone,email,vencimento
2,success,ok,827fc7b9-ecba-3ed3-93d7-f72eb6fc1455,https://.../barcode,1979...,https://.../pdf,2025-08-15T23:59:59.000Z,1099,João Souza,12345678901,11988887777,joao@example.com,2025-08-20
```

### `errors.csv` (colunas)
- `row`
- `status` = `error`
- `errorCode` (ver seção 8)
- `message`
- `amount,name,document,telefone,email,vencimento` (ecoados)

---

## 7) Webhook de conclusão (opcional)
Quando configurado, ao finalizar o processamento do import a API envia:
```
POST <webhookUrl>
Content-Type: application/json
```
**Payload**
```json
{
  "importId": "8e1b3b3d-8c9e-4f70-8a64-6a4c5e2a7a6c",
  "status": "completed",     
  "totals": { "total": 2000, "succeeded": 1980, "failed": 20 },
  "resultsUrl": "https://api.seudominio.com/v1/imports/8e1.../results.csv",
  "errorsUrl": "https://api.seudominio.com/v1/imports/8e1.../errors.csv",
  "startedAt": "2025-08-14T15:12:00Z",
  "finishedAt": "2025-08-14T15:20:43Z"
}
```
> Recomendação: responder `200 OK` rapidamente (≤ 5s). Em caso de falha no webhook, a API re‑tentará com backoff exponencial (limite configurado).

---

## 8) Códigos de erro & mensagens (principais)
- **400** `INVALID_FILE_TYPE` — arquivo não é CSV/XLSX.
- **400** `MISSING_COLUMNS` — cabeçalhos obrigatórios ausentes.
- **400** `TOO_MANY_ROWS` — > 2.000 linhas.
- **401** `UNAUTHORIZED` — token inválido/ausente.
- **413** `PAYLOAD_TOO_LARGE` — arquivo acima do limite.
- **415** `UNSUPPORTED_MEDIA_TYPE` — content-type inválido.
- **422** `ROW_VALIDATION_FAILED` — erro em campos (ver `errors.csv`).
- **429** `RATE_LIMITED` — tente novamente mais tarde.
- **500** `INTERNAL_ERROR` — erro inesperado.

Erros por **linha** (no `errors.csv`):
- `INVALID_DOCUMENT` (CPF/CNPJ)
- `INVALID_EMAIL`
- `INVALID_PHONE`
- `INVALID_AMOUNT`
- `INVALID_DATE_FORMAT` (vencimento)
- `UPSTREAM_VALIDATION_ERROR` (erro 4xx do banco)
- `UPSTREAM_TEMP_ERROR` (erros 5xx/timeout após retries)

---

## 9) Exemplo — Upload via cURL
```bash
curl -X POST "https://api.seudominio.com/v1/imports" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: 6c2b6b1c-3b5a-4f0a-8e1e-abc123" \
  -F "file=@/caminho/boletos.xlsx" \
  -F "fileType=xlsx" \
  -F "dateFormat=YYYY-MM-DD" \
  -F "webhookUrl=https://meusite.com/webhooks/imports"
```

---

## 10) Exemplo — Upload em React/TypeScript
```ts
async function uploadImport(file: File) {
  const form = new FormData();
  form.append("file", file);
  form.append("fileType", file.name.endsWith(".xlsx") ? "xlsx" : "csv");
  form.append("dateFormat", "YYYY-MM-DD");

  const res = await fetch("https://api.seudominio.com/v1/imports", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: form,
  });

  if (!res.ok) throw new Error("Falha no upload");
  return res.json(); // { importId, status, ... }
}
```

### Polling de status
```ts
async function getStatus(importId: string) {
  const res = await fetch(`https://api.seudominio.com/v1/imports/${importId}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  if (!res.ok) throw new Error("Falha ao consultar status");
  return res.json();
}
```

### SSE (tempo real)
```ts
function subscribeProgress(importId: string, onMessage: (data: any) => void) {
  const ev = new EventSource(`https://api.seudominio.com/v1/imports/${importId}/events`, {
    withCredentials: false,
  });
  ev.onmessage = (e) => onMessage(JSON.parse(e.data));
  ev.onerror = () => ev.close();
  return () => ev.close();
}
```

### Download de relatórios
```ts
function download(url: string, filename: string) {
  fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
    .then((r) => r.blob())
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    });
}
```

---

## 11) Contratos de resposta (JSON)
### `GET /v1/imports/{id}`
```json
{
  "importId": "string",
  "status": "queued|processing|completed|failed|canceled",
  "stats": { "total": 0, "processed": 0, "succeeded": 0, "failed": 0, "remaining": 0 },
  "etaSeconds": 0,
  "startedAt": "ISO-8601 or null",
  "finishedAt": "ISO-8601 or null",
  "links": {
    "resultsCsv": "https://.../results.csv",
    "errorsCsv": "https://.../errors.csv"
  }
}
```

### `POST /v1/imports` (erros)
```json
{
  "error": {
    "code": "MISSING_COLUMNS",
    "message": "Colunas obrigatórias ausentes: amount, document"
  }
}
```

---

## 12) Considerações de UX
- Exibir **pré‑validação** local simples (extensão, cabeçalho presente, linhas estimadas) antes do upload.
- Após criar o import, mostrar **status** e uma **barra de progresso** (via SSE preferencialmente; fallback para polling a cada 2–3s).
- Ao concluir, oferecer botões: **Baixar sucessos** e **Baixar erros**.
- Em erros de upload, exibir mensagens do `error.code` + sugestão de correção.

---

## 13) Ambiente de testes
- **Base URL (homologação):** `https://api.seudominio.com` *(ajustar quando disponível)*
- **Token de teste:** fornecer por canal seguro.
- **Postman/Insomnia:** coleção será disponibilizada pelo back‑end.

---

## 14) Checklist do front‑end
- [ ] Enviar `Authorization: Bearer <token>` e opcional `Idempotency-Key`.
- [ ] Usar `multipart/form-data` com o campo `file` e cabeçalho na primeira linha.
- [ ] Respeitar limite de 2.000 linhas por arquivo.
- [ ] Preferir **SSE** para progresso; usar **polling** como fallback.
- [ ] Tratar os códigos/erros descritos e oferecer download dos CSVs.
- [ ] Informar `webhookUrl` se desejar override por upload.

---

### Dúvidas frequentes
- **Posso mandar `vencimento`?** Sim, é aceito e reportado; hoje não define a data do boleto no banco (ver observação no topo).
- **Delimitador no CSV?** Padrão vírgula, aceita `;` se informar `delimiter`; detecção automática tenta inferir.
- **Ordem das colunas importa?** Não; os **nomes** devem estar corretos.
- **Planilha sem cabeçalho funciona?** Não; cabeçalho é obrigatório.

