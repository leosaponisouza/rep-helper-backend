// app.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { AppError } from './utils/errorHandlers';

// Importando rotas
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import healthRoutes from './routes/health.routes';
import republicRoutes from './routes/republic.routes';
import residentRoutes from './routes/resident.routes';
import taskRoutes from './routes/task.routes';
// Importe outras rotas conforme necessário

const app = express();

// Middlewares globais
app.use(helmet()); // Segurança
app.use(cors()); // Cross-Origin Resource Sharing
app.use(express.json({ limit: '10kb' })); // Parser de JSON com limite
app.use(express.urlencoded({ extended: true, limit: '10kb' })); // Parser de formulários

// Logging em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rotas
app.use('/api/v1/auth', authRoutes); // Rotas de autenticação
app.use('/api/v1/users', userRoutes); // Rotas de usuário
app.use('/api/v1/resident', residentRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/republics', republicRoutes);
app.use('/api/v1/health', healthRoutes);

// Rota de health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Servidor online',
    timestamp: new Date().toISOString()
  });
});

// Manipulação de rotas não encontradas
app.all('*', (req, res, next) => {
  next(new AppError(`Rota não encontrada: ${req.originalUrl}`, 404));
});

// Middleware de tratamento de erros global
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  if (process.env.NODE_ENV === 'development') {
    // Resposta de erro detalhada em desenvolvimento
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    // Resposta de erro simplificada em produção
    // Não expor detalhes de erros de programação
    if (err.isOperational) {
      // Erros operacionais conhecidos
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    } else {
      // Erros desconhecidos ou de programação
      console.error('ERRO 💥', err);
      res.status(500).json({
        status: 'error',
        message: 'Algo deu errado'
      });
    }
  }
});

export default app;