# Roteiro de Observabilidade

Stack utilizada: **Winston + winston-loki → Grafana Loki** (logs) + **OpenTelemetry → Grafana Tempo** (tracing) + **prom-client → Prometheus → Grafana** (métricas)

---

## Parte 1 — Logs Centralizados com Grafana Loki

### 1.1 Subir o Loki via Docker Compose

Adicione o serviço no `docker-compose.yaml`:

```yaml
loki:
  image: grafana/loki:latest
  restart: on-failure
  command: ["-config.file=/etc/loki/loki.yml"]
  ports:
    - 3100:3100
  volumes:
    - ./docker/loki/loki.yml:/etc/loki/loki.yml:ro
    - loki:/var/loki
  networks:
    - internal
```

Adicione o volume e a dependência no Grafana:

```yaml
grafana:
  depends_on:
    - prometheus
    - tempo
    - loki

volumes:
  loki:
```

### 1.2 Criar o arquivo de configuração do Loki

Crie `docker/loki/loki.yml`:

```yaml
auth_enabled: false

server:
  http_listen_port: 3100

common:
  path_prefix: /var/loki
  storage:
    filesystem:
      chunks_directory: /var/loki/chunks
      rules_directory: /var/loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h
```

### 1.3 Instalar as dependências de logging no back-end

```bash
npm install winston winston-loki
```

| Pacote | Função |
|---|---|
| `winston` | Logger estruturado para Node.js |
| `winston-loki` | Transport que envia logs diretamente para o Loki via HTTP |

### 1.4 Criar o logger centralizado

Crie `src/config/logger.ts`:

```ts
import winston from 'winston';
import LokiTransport from 'winston-loki';

const lokiUrl = process.env.LOKI_URL ?? 'http://loki:3100';
const serviceName = process.env.OTEL_SERVICE_NAME ?? 'eazy-ticket-back-end';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
    new LokiTransport({
      host: lokiUrl,
      labels: { service: serviceName },
      json: true,
      format: winston.format.json(),
      replaceTimestamp: true,
      onConnectionError: (err) => console.error('Loki connection error:', err),
    }),
  ],
});
```

### 1.5 Usar o logger no servidor

Em `src/server.ts`, substitua `console.info` pelo logger:

```ts
import { logger } from './config/logger';

app.listen(env.API_PORT, () => {
  logger.info(`Server is running on port ${env.API_PORT}`);
});
```

Use `logger.info()`, `logger.warn()`, `logger.error()` em todo o código no lugar de `console.*`.

### 1.6 Provisionar o datasource do Loki no Grafana

Em `docker/grafana/provisioning/datasources/datasources.yml`, adicione:

```yaml
- name: Loki
  type: loki
  uid: loki
  url: http://loki:3100
  editable: false
  jsonData:
    derivedFields:
      - name: TraceID
        matcherRegex: '"traceId":"(\w+)"'
        url: "${__value.raw}"
        datasourceUid: tempo  # Navega do log para o trace correspondente no Tempo
```

E no datasource do Tempo, ligue os traces aos logs:

```yaml
jsonData:
  tracesToLogsV2:
    datasourceUid: loki
    filterByTraceID: true
```

### 1.7 Verificar

| Serviço | URL |
|---|---|
| Loki (API) | http://localhost:3100/ready |
| Grafana → Explore → Loki | `{service="eazy-ticket-back-end"}` |

**Checklist de validação:**

- [ ] `GET http://localhost:3100/ready` retorna `ready`
- [ ] Grafana → Explore → datasource Loki → query `{service="eazy-ticket-back-end"}` mostra logs
- [ ] Clicar em um log com `traceId` navega para o trace no Tempo

---

## Parte 2 — Tracing Distribuído com Grafana Tempo

### 2.1 Subir o Tempo via Docker Compose

Adicione o serviço no `docker-compose.yaml`:

```yaml
tempo:
  image: grafana/tempo:latest
  restart: on-failure
  command: ["-config.file=/etc/tempo/tempo.yml"]
  ports:
    - 3200:3200  # API HTTP — usada pelo Grafana para consultar traces
    - 4317:4317  # gRPC OTLP — recebe spans via gRPC
    - 4318:4318  # HTTP OTLP — recebe spans via HTTP
  volumes:
    - ./docker/tempo/tempo.yml:/etc/tempo/tempo.yml:ro
    - tempo:/var/tempo
  networks:
    - internal
```

### 2.2 Criar o arquivo de configuração do Tempo

Crie `docker/tempo/tempo.yml`:

```yaml
stream_over_http_enabled: true

server:
  http_listen_port: 3200

distributor:
  receivers:
    otlp:
      protocols:
        http:
          endpoint: "0.0.0.0:4318"
        grpc:
          endpoint: "0.0.0.0:4317"

storage:
  trace:
    backend: local
    local:
      path: /var/tempo/traces
    wal:
      path: /var/tempo/wal
```

> **Atenção:** versões recentes do Tempo (3.x) não aceitam o campo `compactor` no nível raiz. Não o inclua.

### 2.3 Instalar as dependências OpenTelemetry no back-end

```bash
npm install \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http
```

| Pacote | Função |
|---|---|
| `sdk-node` | SDK principal — inicializa o sistema de tracing |
| `auto-instrumentations-node` | Instrumenta Express, HTTP, pg, etc. automaticamente |
| `exporter-trace-otlp-http` | Envia os spans via HTTP para o Tempo |

### 2.4 Criar o arquivo de setup do OTel

Crie `src/config/otel.ts`:

```ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://tempo:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});
```

### 2.5 Importar o OTel como primeira linha do servidor

Em `src/server.ts`, o import do OTel **deve ser o primeiro** para que a instrumentação aconteça antes de qualquer outro módulo ser carregado:

```ts
import './config/otel'; // DEVE ser o primeiro import
import 'express-async-errors';
import express from 'express';
// ...
```

### 2.6 Definir o nome do serviço nos traces

No `docker-compose.yaml`, injete a variável de ambiente no serviço do back-end:

```yaml
back-end:
  environment:
    - OTEL_SERVICE_NAME=eazy-ticket-back-end
```

Esse nome é o que aparece no Grafana Tempo para identificar de qual serviço o trace veio.

---

## Parte 3 — Métricas com prom-client e Prometheus

### 3.1 Instalar o prom-client

```bash
npm install prom-client
```

### 3.2 Criar as métricas customizadas

Crie `src/config/metrics.ts` com os histogramas de duração:

```ts
import { Histogram } from 'prom-client';

// Duração das requisições HTTP
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

// Duração das queries no banco de dados
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
});
```

> Use **buckets menores** para queries de banco — elas devem ser muito mais rápidas que requisições HTTP.

### 3.3 Criar o middleware de métricas HTTP

Crie `src/middlewares/http-metrics.ts`:

```ts
import { NextFunction, Request, Response } from 'express';
import { httpRequestDuration } from '../config/metrics';

export function HttpMetricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    end({
      method: req.method,
      route: req.baseUrl + (req.route?.path ?? req.path),
      status_code: res.statusCode,
    });
  });

  next();
}
```

> O evento `finish` é disparado quando o Express termina de enviar a resposta — é o momento correto para parar o timer.

### 3.4 Instrumentar as queries do banco

Para medir a duração das queries, é necessário trocar a connection string direta por um `Pool` do `pg` e fazer o monkey-patch do método `query`.

Em `src/config/database.ts`, substitua:

```ts
// Antes
const db = drizzle(env.DATABASE_URL, { ... });
```

por:

```ts
import { Pool } from 'pg';
import { dbQueryDuration } from './metrics';

const pool = new Pool({ connectionString: env.DATABASE_URL });

pool.on('connect', (client) => {
  const originalQuery = (client as any).query.bind(client);

  (client as any).query = function (...args: any[]) {
    const text = typeof args[0] === 'string' ? args[0] : (args[0]?.text ?? '');
    const operation = text.trim().split(/\s+/)[0].toLowerCase() || 'query';
    const end = dbQueryDuration.startTimer({ operation });

    const lastArg = args[args.length - 1];
    if (typeof lastArg === 'function') {
      args[args.length - 1] = (err: any, result: any) => { end(); lastArg(err, result); };
      return originalQuery(...args);
    }

    const result: Promise<any> = originalQuery(...args);
    result.then(() => end(), () => end());
    return result;
  };
});

const db = drizzle(pool, { ... });
```

### 3.5 Registrar as métricas e expor o endpoint `/metrics`

Em `src/server.ts`:

```ts
import { collectDefaultMetrics, register } from 'prom-client';
import { HttpMetricsMiddleware } from './middlewares/http-metrics';

collectDefaultMetrics(); // Coleta CPU, memória, event loop do Node automaticamente

const app = express();

app.use(HttpMetricsMiddleware); // Registra o middleware para todas as rotas

app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### 3.6 Subir o Prometheus via Docker Compose

Adicione ao `docker-compose.yaml`:

```yaml
prometheus:
  image: prom/prometheus:latest
  restart: on-failure
  depends_on:
    - back-end
  ports:
    - 9090:9090
  volumes:
    - ./docker/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    - prometheus:/prometheus
  networks:
    - internal
```

### 3.7 Criar o arquivo de configuração do Prometheus

Crie `docker/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: "back-end"
    static_configs:
      - targets: ["back-end:3000"]
    metrics_path: /metrics
```

---

## Parte 4 — Visualização no Grafana

### 4.1 Subir o Grafana via Docker Compose

```yaml
grafana:
  image: grafana/grafana:latest
  restart: on-failure
  depends_on:
    - prometheus
    - tempo
    - loki
  ports:
    - 3001:3000
  environment:
    - GF_SECURITY_ADMIN_USER=admin
    - GF_SECURITY_ADMIN_PASSWORD=admin
  volumes:
    - grafana:/var/lib/grafana
    - ./docker/grafana/provisioning:/etc/grafana/provisioning:ro
  networks:
    - internal
```

### 4.2 Provisionar os datasources automaticamente

Crie `docker/grafana/provisioning/datasources/datasources.yml`:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    uid: prometheus
    url: http://prometheus:9090
    isDefault: true
    editable: false

  - name: Loki
    type: loki
    uid: loki
    url: http://loki:3100
    editable: false
    jsonData:
      derivedFields:
        - name: TraceID
          matcherRegex: '"traceId":"(\w+)"'
          url: "${__value.raw}"
          datasourceUid: tempo

  - name: Tempo
    type: tempo
    uid: tempo
    url: http://tempo:3200
    editable: false
    jsonData:
      tracesToLogsV2:
        datasourceUid: loki
        filterByTraceID: true
      serviceMap:
        datasourceUid: prometheus
      nodeGraph:
        enabled: true
```

Com esse arquivo, o Grafana já sobe com os três datasources configurados — sem precisar configurar manualmente pela UI.

### 4.3 Acessar e verificar

| Serviço | URL | Credenciais |
|---|---|---|
| Grafana | http://localhost:3001 | admin / admin |
| Prometheus | http://localhost:9090 | — |
| Loki (API) | http://localhost:3100/ready | — |
| Tempo (API) | http://localhost:3200 | — |
| Métricas do app | http://localhost:3000/metrics | — |

**Checklist de validação:**

- [ ] `GET /metrics` retorna métricas no formato Prometheus
- [ ] `GET http://localhost:3100/ready` retorna `ready`
- [ ] Prometheus → Status → Targets mostra `back-end` como `UP`
- [ ] Grafana → Explore → Loki → query `{service="eazy-ticket-back-end"}` mostra logs
- [ ] Grafana → Explore → Prometheus → query `http_request_duration_seconds_count`
- [ ] Grafana → Explore → Tempo → buscar por `Service Name = eazy-ticket-back-end`
- [ ] Clicar em um log com `traceId` navega para o trace no Tempo

---

## Resumo da Arquitetura

```
App (Node.js)
  │
  ├─── winston-loki ────────► Grafana Loki ◄──── Grafana (Explore / Dashboards)
  │         (logs)               :3100
  │
  ├─── OTLP HTTP ──────────► Grafana Tempo ◄──── Grafana (Explore / Dashboards)
  │         (spans/traces)        :3200
  │
  └─── HTTP scrape ◄────────── Prometheus ◄──── Grafana (Explore / Dashboards)
       GET /metrics                :9090
       (histogramas, counters)
```


### 1.1 Subir o Tempo via Docker Compose

Adicione o serviço no `docker-compose.yaml`:

```yaml
tempo:
  image: grafana/tempo:latest
  restart: on-failure
  command: ["-config.file=/etc/tempo/tempo.yml"]
  ports:
    - 3200:3200  # API HTTP — usada pelo Grafana para consultar traces
    - 4317:4317  # gRPC OTLP — recebe spans via gRPC
    - 4318:4318  # HTTP OTLP — recebe spans via HTTP
  volumes:
    - ./docker/tempo/tempo.yml:/etc/tempo/tempo.yml:ro
    - tempo:/var/tempo
  networks:
    - internal
```

### 1.2 Criar o arquivo de configuração do Tempo

Crie `docker/tempo/tempo.yml`:

```yaml
stream_over_http_enabled: true

server:
  http_listen_port: 3200

distributor:
  receivers:
    otlp:
      protocols:
        http:
          endpoint: "0.0.0.0:4318"
        grpc:
          endpoint: "0.0.0.0:4317"

storage:
  trace:
    backend: local
    local:
      path: /var/tempo/traces
    wal:
      path: /var/tempo/wal
```

> **Atenção:** versões recentes do Tempo (3.x) não aceitam o campo `compactor` no nível raiz. Não o inclua.

### 1.3 Instalar as dependências OpenTelemetry no back-end

```bash
npm install \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http
```

| Pacote | Função |
|---|---|
| `sdk-node` | SDK principal — inicializa o sistema de tracing |
| `auto-instrumentations-node` | Instrumenta Express, HTTP, pg, etc. automaticamente |
| `exporter-trace-otlp-http` | Envia os spans via HTTP para o Tempo |

### 1.4 Criar o arquivo de setup do OTel

Crie `src/config/otel.ts`:

```ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://tempo:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});
```

### 1.5 Importar o OTel como primeira linha do servidor

Em `src/server.ts`, o import do OTel **deve ser o primeiro** para que a instrumentação aconteça antes de qualquer outro módulo ser carregado:

```ts
import './config/otel'; // DEVE ser o primeiro import
import 'express-async-errors';
import express from 'express';
// ...
```

### 1.6 Definir o nome do serviço nos traces

No `docker-compose.yaml`, injete a variável de ambiente no serviço do back-end:

```yaml
back-end:
  environment:
    - OTEL_SERVICE_NAME=eazy-ticket-back-end
```

Esse nome é o que aparece no Grafana Tempo para identificar de qual serviço o trace veio.

---

## Parte 2 — Métricas com prom-client e Prometheus

### 2.1 Instalar o prom-client

```bash
npm install prom-client
```

### 2.2 Criar as métricas customizadas

Crie `src/config/metrics.ts` com os histogramas de duração:

```ts
import { Histogram } from 'prom-client';

// Duração das requisições HTTP
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

// Duração das queries no banco de dados
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
});
```

> Use **buckets menores** para queries de banco — elas devem ser muito mais rápidas que requisições HTTP.

### 2.3 Criar o middleware de métricas HTTP

Crie `src/middlewares/http-metrics.ts`:

```ts
import { NextFunction, Request, Response } from 'express';
import { httpRequestDuration } from '../config/metrics';

export function HttpMetricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    end({
      method: req.method,
      route: req.baseUrl + (req.route?.path ?? req.path),
      status_code: res.statusCode,
    });
  });

  next();
}
```

> O evento `finish` é disparado quando o Express termina de enviar a resposta — é o momento correto para parar o timer.

### 2.4 Instrumentar as queries do banco

Para medir a duração das queries, é necessário trocar a connection string direta por um `Pool` do `pg` e fazer o monkey-patch do método `query`.

Em `src/config/database.ts`, substitua:

```ts
// Antes
const db = drizzle(env.DATABASE_URL, { ... });
```

por:

```ts
import { Pool } from 'pg';
import { dbQueryDuration } from './metrics';

const pool = new Pool({ connectionString: env.DATABASE_URL });

pool.on('connect', (client) => {
  const originalQuery = (client as any).query.bind(client);

  (client as any).query = function (...args: any[]) {
    const text = typeof args[0] === 'string' ? args[0] : (args[0]?.text ?? '');
    const operation = text.trim().split(/\s+/)[0].toLowerCase() || 'query';
    const end = dbQueryDuration.startTimer({ operation });

    const lastArg = args[args.length - 1];
    if (typeof lastArg === 'function') {
      args[args.length - 1] = (err: any, result: any) => { end(); lastArg(err, result); };
      return originalQuery(...args);
    }

    const result: Promise<any> = originalQuery(...args);
    result.then(() => end(), () => end());
    return result;
  };
});

const db = drizzle(pool, { ... });
```

### 2.5 Registrar as métricas e expor o endpoint `/metrics`

Em `src/server.ts`:

```ts
import { collectDefaultMetrics, register } from 'prom-client';
import { HttpMetricsMiddleware } from './middlewares/http-metrics';

collectDefaultMetrics(); // Coleta CPU, memória, event loop do Node automaticamente

const app = express();

app.use(HttpMetricsMiddleware); // Registra o middleware para todas as rotas

app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### 2.6 Subir o Prometheus via Docker Compose

Adicione ao `docker-compose.yaml`:

```yaml
prometheus:
  image: prom/prometheus:latest
  restart: on-failure
  depends_on:
    - back-end
  ports:
    - 9090:9090
  volumes:
    - ./docker/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    - prometheus:/prometheus
  networks:
    - internal
```

### 2.7 Criar o arquivo de configuração do Prometheus

Crie `docker/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: "back-end"
    static_configs:
      - targets: ["back-end:3000"]
    metrics_path: /metrics
```

---

## Parte 3 — Visualização no Grafana

### 3.1 Subir o Grafana via Docker Compose

```yaml
grafana:
  image: grafana/grafana:latest
  restart: on-failure
  depends_on:
    - prometheus
    - tempo
  ports:
    - 3001:3000
  environment:
    - GF_SECURITY_ADMIN_USER=admin
    - GF_SECURITY_ADMIN_PASSWORD=admin
  volumes:
    - grafana:/var/lib/grafana
    - ./docker/grafana/provisioning:/etc/grafana/provisioning:ro
  networks:
    - internal
```

### 3.2 Provisionar os datasources automaticamente

Crie `docker/grafana/provisioning/datasources/datasources.yml`:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    uid: prometheus
    url: http://prometheus:9090
    isDefault: true
    editable: false

  - name: Tempo
    type: tempo
    uid: tempo
    url: http://tempo:3200
    editable: false
    jsonData:
      serviceMap:
        datasourceUid: prometheus
      nodeGraph:
        enabled: true
```

Com esse arquivo, o Grafana já sobe com os dois datasources configurados — sem precisar configurar manualmente pela UI.

### 3.3 Acessar e verificar

| Serviço | URL | Credenciais |
|---|---|---|
| Grafana | http://localhost:3001 | admin / admin |
| Prometheus | http://localhost:9090 | — |
| Tempo (API) | http://localhost:3200 | — |
| Métricas do app | http://localhost:3000/metrics | — |

**Checklist de validação:**

- [ ] `GET /metrics` retorna métricas no formato Prometheus
- [ ] Prometheus → Status → Targets mostra `back-end` como `UP`
- [ ] Grafana → Explore → datasource Prometheus → query `http_request_duration_seconds_count`
- [ ] Grafana → Explore → datasource Tempo → buscar por `Service Name = eazy-ticket-back-end`

---

## Resumo da Arquitetura

```
App (Node.js)
  │
  ├─── OTLP HTTP ──────────► Grafana Tempo ◄──── Grafana (Explore / Dashboards)
  │         (spans/traces)        :3200
  │
  └─── HTTP scrape ◄────────── Prometheus ◄──── Grafana (Explore / Dashboards)
       GET /metrics                :9090
       (histogramas, counters)
```
