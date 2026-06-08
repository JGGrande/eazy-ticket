import { NodeSDK } from '@opentelemetry/sdk-node'; // SDK principal do OTel para Node
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'; // Auto-instrumenta Express, HTTP, pg, etc. sem configuração manual
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'; // Exportador que envia spans via HTTP no protocolo OTLP

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://tempo:4318/v1/traces', // Endpoint de destino dos traces — usa env var ou cai no Tempo como padrão
  }),
  instrumentations: [getNodeAutoInstrumentations()], // Ativa todas as auto-instrumentações disponíveis
});

sdk.start(); // Inicializa o SDK — a partir daqui todos os spans começam a ser coletados

// Quando o processo recebe sinal de encerramento (ex: docker stop),
// faz flush dos spans pendentes antes de encerrar para não perder dados
process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});
