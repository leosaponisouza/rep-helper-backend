// middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { AppError } from '../utils/errorHandlers';
import * as userModel from '../models/user.model';
import { admin } from '../utils/firebaseConfig';
import { validationResult } from 'express-validator';

// Interface para Request com usuário autenticado
interface AuthenticatedRequest extends Request {
  user?: userModel.User
}

// Gerar token JWT
export const signToken = (id: string, role: string) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET não definida nas variáveis de ambiente");
  }
  
  const expiresInSeconds = Number(process.env.JWT_EXPIRES_IN || 3600); // 1 hora padrão
  
  return jwt.sign({ id, role }, jwtSecret, {
    expiresIn: expiresInSeconds,
  });
};

// Login com Firebase
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed: ' + JSON.stringify(errors.array()), 400));
    }
    
    // Tentar obter o token do Firebase do corpo da requisição ou do cabeçalho Authorization
    let firebaseToken;
    
    // Verificar primeiro se está no corpo da requisição
    if (req.body.firebaseToken) {
      firebaseToken = req.body.firebaseToken;
    }
    // Se não estiver no corpo, verificar no cabeçalho
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      firebaseToken = req.headers.authorization.split(' ')[1];
    }
    
    if (!firebaseToken) {
      return next(new AppError('Token do Firebase ausente', 401));
    }
    
    // Continuar com a verificação do token...
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().verifyIdToken(firebaseToken);
    } catch (error: any) {
      console.error("Erro na autenticação do Firebase:", error);
      if (error.code === 'auth/id-token-expired') {
        return next(new AppError('Token do Firebase expirado', 401));
      }
      return next(new AppError('Falha na autenticação do Firebase', 401));
    }
    
    // Buscar usuário no banco de dados
    const user = await userModel.getUserByFirebaseUID(firebaseUser.uid);
    
    if (!user) {
      return next(new AppError('Usuário não encontrado no banco de dados', 404));
    }
    
    // Gerar JWT próprio
    const token = signToken(user.uid!, user.role || 'user');
    
    // Atualizar último login
    await userModel.updateUser(user.uid!, { last_login: new Date() });
    
    // Enviar resposta
    res.status(200).json({
      status: 'success',
      token,
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(new AppError('Falha na validação', 400));
      }
      
      // Obter o token do corpo da requisição
      const { token } = req.body;
      
      if (!token) {
        return next(new AppError('Token é obrigatório', 400));
      }
      
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return next(new AppError("JWT_SECRET não definida", 500));
      }
      
      // Verificar o token atual
      let decoded;
      try {
        // Verificar mesmo que esteja expirado
        decoded = jwt.verify(token, jwtSecret, { ignoreExpiration: true }) as JwtPayload;
      } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
          return next(new AppError('Token inválido', 401));
        }
        return next(error);
      }
      
      // Buscar o usuário no banco de dados
      const user = await userModel.getUserById(decoded.id);
      if (!user) {
        return next(new AppError('Usuário não encontrado', 404));
      }
      
      // Gerar um novo token
      const newToken = signToken(user.uid!, user.role || 'user');
      
      // Retornar o novo token
      res.status(200).json({
        status: 'success',
        token: newToken
      });
    } catch (error) {
      next(error);
    }
  };
// Middleware para proteger rotas
export const protect = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Obter token JWT
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return next(new AppError('Autenticação necessária', 401));
    }
    
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next(new AppError("JWT_SECRET não definida", 500));
    }
    
    // Verificar token JWT
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    
    // Buscar usuário no banco de dados
    const currentUser = await userModel.getUserById(decoded.id);
    if (!currentUser) {
      return next(new AppError('Usuário não encontrado', 401));
    }
    
    // Adicionar informações do usuário à requisição
    req.user = currentUser;
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Token expirado', 401));
    } else if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Token inválido', 401));
    }
    next(error);
  }
};

// Middleware para controle de acesso baseado em função
export const restrictTo = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('Permissão negada para esta ação', 403));
    }
    next();
  };
};