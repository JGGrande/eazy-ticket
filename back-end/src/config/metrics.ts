import { Histogram } from 'prom-client'; // Histogram é ideal para medir durações — agrupa observações em buckets

// Métrica de duração das requisições HTTP
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',        // Nome da métrica no Prometheus
  help: 'Duration of HTTP requests in seconds', // Descrição exibida no /metrics
  labelNames: ['method', 'route', 'status_code'], // Dimensões para filtrar (ex: GET /events 200)
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5], // Limites dos buckets em segundos
});

// Métrica de duração das queries no banco de dados
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',              // Nome da métrica de queries no banco
  help: 'Duration of database queries in seconds',
  labelNames: ['operation'],                      // Label com o tipo de operação (select, insert, update, delete...)
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1], // Buckets menores que os de HTTP — queries devem ser muito mais rápidas
});
