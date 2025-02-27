import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { globalErrorHandler, notFoundHandler } from './utils/errorHandlers';
import userRoutes from './routes/user.routes';
import residentRoutes from './routes/resident.routes';
import taskRoutes from './routes/task.routes';
import swaggerUi from 'swagger-ui-express'; // Importa o swagger-ui-express
import swaggerSpec from './utils/swagger';
import republicRoutes from './routes/republic.routes'
import healthRoutes from './routes/health.routes'; // Corrected import path
const app: Application = express();

// Middlewares Globais
app.use(cors());
app.use(helmet());

// Logger de requisições (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}
// Configuração do Swagger UI (DEVE VIR ANTES DAS SUAS ROTAS)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(express.json()); // Parse JSON body

// Rotas
app.use('/api/v1/users', userRoutes);  // Exemplo: /api/v1/users
app.use('/api/v1/resident', residentRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/republics', republicRoutes);
app.use('/api/v1/health', healthRoutes);
// ... adicione outras rotas

// Rota não encontrada (404)
app.use(notFoundHandler);

// Tratamento de erros global
app.use(globalErrorHandler);


export default app;
