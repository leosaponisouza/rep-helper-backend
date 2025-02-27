// middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { AppError } from '../utils/errorHandlers'; // Sua classe de erro
import * as userModel from '../models/user.model';
import { admin } from '../utils/firebaseConfig'; // Importe a configuração do Firebase Admin
import { User } from '../models/user.model'; // Importa a interface User
import { validationResult } from 'express-validator';


export const signToken = (id: string, p0: string) => {
  const jwtSecret = process.env.JWT_SECRET;
   if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined in environment variables.");
  }
  const expiresInSeconds = Number(process.env.JWT_EXPIRES_IN);

   if (isNaN(expiresInSeconds)) { //Verifica se a conversão foi sucedida.
        throw new Error("JWT_EXPIRES_IN must be a number (seconds) or a valid string (e.g., '90d').");
    }

  return jwt.sign({ id }, jwtSecret, {
    expiresIn: expiresInSeconds, // Agora é um número
  });
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
      // Retorna os erros de validação do express-validator
      return next(new AppError('Validation failed', 400));
  }

  // Não precisamos mais de email e senha aqui.  O frontend já autenticou com o Firebase.
  // Precisamos APENAS do token do Firebase.
  try {
      let firebaseToken;
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
          firebaseToken = req.headers.authorization.split(' ')[1];
      }

      if (!firebaseToken) {
          return next(new AppError('Firebase token is missing', 401));
      }

      // 1. Validar o token do Firebase (usando o Firebase Admin SDK).
      let firebaseUser;
      try {
          firebaseUser = await admin.auth().verifyIdToken(firebaseToken);
      } catch (error: any) {
          if (error.code === 'auth/id-token-expired') {
              return next(new AppError('Firebase token has expired', 401));
          }
          console.error("Erro na autenticação com Firebase:", error); // Log detalhado
          return next(new AppError('Firebase authentication failed', 401));
      }

      // 2. Buscar o usuário no *nosso* banco de dados (pelo firebase_uid).
      const user = await userModel.getUserByFirebaseUID(firebaseUser.uid);
      if (!user) {
          // Usuário não encontrado no *nosso* banco de dados.
          // Duas opções:
          //   a) Retornar erro 404 (o usuário precisa se cadastrar).
          //   b) Criar o usuário automaticamente (fluxo de "login ou cadastro").
          // Vou implementar a opção (a) primeiro.  Depois, se você quiser, podemos mudar para (b).
          return next(new AppError('User not found in the database', 404)); // 404 Not Found
      }

      // 3. Gerar JWT (do *nosso* backend, incluindo a role).
      const token = signToken(user.uid!, user.role || 'user'); // Inclui a role

      // 4. Atualizar o last_login do usuário (boa prática).
      await userModel.updateUser(user.uid!, { last_login: new Date() });

      res.status(200).json({
          status: 'success',
          token, // <-- Token JWT do *SEU* backend
          data: {
              user: user, // <-- Dados do usuário (sem a senha)
          },
      });

  } catch (error) {
      next(error);
  }
};


// --- Interface Customizada para o Request (adiciona user) ---
interface AuthenticatedRequest extends Request {
    user?: {  // Agora user é um objeto com uid e role
        uid: string;
        role: string;
        firebaseUid: string; // Opcional, mas útil
    };
}


// --- Middleware de Proteção de Rotas (Verificação do JWT) ---
export const protect = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => { // Usa a interface customizada
    try {
        // 1. Obter o token JWT
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return next(new AppError('You are not logged in! Please log in to get access.', 401));
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return next(new AppError("JWT_SECRET is not defined", 500));
        }

        // 2. Verificar e decodificar o token JWT
        const decoded = jwt.verify(token, jwtSecret) as JwtPayload; // Decodifica o JWT

        // 3. Buscar o usuário no banco de dados (usando o ID do token)
        const currentUser = await userModel.getUserById(decoded.id);  // Usa decoded.id (do JWT)
        if (!currentUser) {
            return next(new AppError('The user belonging to this token no longer exists.', 401));
        }

        // 4. Anexar informações do usuário ao objeto req (usando a interface customizada)
        req.user = { uid: currentUser.uid!, role: currentUser.role!, firebaseUid: currentUser.firebase_uid }; // Anexa uid, role e firebaseUid

        next();

    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return next(new AppError('Your token has expired! Please log in again.', 401));
        } else if (error instanceof jwt.JsonWebTokenError) {
            return next(new AppError('Invalid token. Please log in again.', 401));
        }
        next(error); // Outros erros
    }
};

// --- Middleware de Autorização (Restrição por Papel) ---
export const restrictTo = (...roles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => { // Usa AuthenticatedRequest
        if (!req.user || !roles.includes(req.user.role)) { // Verifica a role
            return next(new AppError('You do not have permission to perform this action', 403));
        }
        next();
    };
};

// --- Refresh Token ---
export const refreshToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => { // Usa AuthenticatedRequest
  try {

    const errors = validationResult(req);
  if (!errors.isEmpty()) {
   return next(new AppError('Validation failed', 400)); // Inclui detalhes dos erros
  }
    // 1. Obter o token do cabeçalho da requisição
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

     //Verifica se a secret foi definida
    const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
        return next(new AppError("JWT_SECRET is not defined", 500));
    }

    // 2. Verificar e decodificar o token (USANDO JwtPayload)

    //Função assíncrona para encapsular a chamada
    const verifyToken = async (token: string, secret: string): Promise<JwtPayload> => {
        return new Promise((resolve, reject) => {
            jwt.verify(token, secret, (err, decoded) => {
                if (err) {
                    reject(err); // Rejeita a Promise se houver erro na verificação
                } else {
                    resolve(decoded as JwtPayload); // Resolve a Promise com o payload decodificado
                }
            });
        });
    };

    const decoded = await verifyToken(token, jwtSecret);

    // 3.  Verificar se o usuário ainda existe (pode ter sido deletado)
    const currentUser = await userModel.getUserById(decoded.id);
    if (!currentUser) {
        return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // 4. Gerar novo JWT (incluindo a role)
    const newToken = signToken(currentUser.uid!, currentUser.role || 'user'); // Usa a role, padrão 'user'

    // 5. Enviar novo token na resposta
    res.status(200).json({
      status: 'success',
      token: newToken
    });

  } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Your token has expired! Please log in again.', 401));
    } else if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid token. Please log in again.', 401));
    }
    next(error); // Outros erros
  }
};