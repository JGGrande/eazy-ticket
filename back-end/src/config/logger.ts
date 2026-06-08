import winston from 'winston';           // Logger estruturado para Node.js
import LokiTransport from 'winston-loki'; // Transport que envia os logs para o Grafana Loki via HTTP

// URL base do Loki — usa variável de ambiente ou fallback para o hostname do serviço no Docker Compose
const lokiUrl = process.env.LOKI_URL ?? 'http://loki:3100';

// Nome do serviço que será usado como label nos logs — mesmo valor que aparece nos traces do Tempo
const serviceName = process.env.OTEL_SERVICE_NAME ?? 'eazy-ticket-back-end';

export const logger = winston.createLogger({
  level: 'info', // Nível mínimo de log — mensagens abaixo de 'info' (ex: 'debug') são ignoradas

  // Define o formato padrão aplicado a todos os transportes que não sobrescrevem o format
  format: winston.format.combine(
    winston.format.timestamp(), // Adiciona o campo "timestamp" com a data/hora atual em cada log
    winston.format.json(),      // Serializa o log como JSON — necessário para o Loki interpretar os campos corretamente
  ),

  transports: [
    // Transport 1: exibe os logs no terminal durante o desenvolvimento
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Colore o nível do log (info=verde, warn=amarelo, error=vermelho)
        winston.format.simple(),   // Formato legível em uma única linha: "info: mensagem"
      ),
    }),

    // Transport 2: envia os logs para o Grafana Loki em tempo real
    new LokiTransport({
      host: lokiUrl,                 // Endereço HTTP do Loki para onde os logs serão enviados
      labels: { service: serviceName }, // Labels fixos anexados a todos os logs — permitem filtrar por serviço no Grafana
      json: true,                    // Envia o corpo do log como JSON em vez de string plana
      format: winston.format.json(), // Garante que o payload enviado ao Loki seja JSON
      replaceTimestamp: true,        // Usa o timestamp do Winston como timestamp oficial do log no Loki (em vez do horário de recebimento)
      onConnectionError: (err) => console.error('Loki connection error:', err), // Loga no console se o Loki estiver inacessível, sem derrubar a aplicação
    }),
  ],
});
