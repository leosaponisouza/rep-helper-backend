import { Request, Response, NextFunction } from 'express';

// Error class personalizada
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Erros operacionais (ex: input inválido) vs. erros de programação

    Error.captureStackTrace(this, this.constructor);
  }
}

// Middleware para lidar com erros
export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Em desenvolvimento, envie mais detalhes do erro
  if (process.env.NODE_ENV === 'development') {
    console.error(err); // Log completo do erro
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      error: err,
      stack: err.stack
    });
  } else {
    // Em produção, envie uma mensagem de erro mais genérica
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    } else {
      // Erro de programação ou outro erro desconhecido: não vazar detalhes para o cliente
      console.error('ERROR 💥', err);
      res.status(500).json({
        status: 'error',
        message: 'Something went wrong!',
      });
    }

  }
};


export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
};