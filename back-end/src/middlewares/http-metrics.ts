import { NextFunction, Request, Response } from 'express';
import { httpRequestDuration } from '../config/metrics';

export function HttpMetricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const end = httpRequestDuration.startTimer(); // Inicia o cronômetro assim que a requisição chega

  res.on('finish', () => {
    // Evento disparado quando o Express termina de enviar a resposta
    end({
      method: req.method,                                    // GET, POST, etc.
      route: req.baseUrl + (req.route?.path ?? req.path),   // /events/:id (usa o path parametrizado quando disponível)
      status_code: res.statusCode,                          // 200, 404, 500...
    }); // Para o cronômetro e registra a duração com as labels
  });

  next(); // Passa para o próximo middleware sem bloquear a requisição
}
