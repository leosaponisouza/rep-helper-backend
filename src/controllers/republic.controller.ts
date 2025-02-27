// controllers/republic.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as republicModel from '../models/republic.model';
import * as userModel from '../models/user.model'; // Importa userModel
import { AppError } from '../utils/errorHandlers';
import { validationResult } from 'express-validator';
import { refreshToken, signToken } from '../middleware/auth.middleware'; // Importa signToken
import { User } from '../models/user.model';

// Interface estendida para o Request (como no authMiddleware)
interface AuthenticatedRequest extends Request {
    user?: {
        uid: string;
        role: string;
        firebaseUid: string; // Opcional
    };
}

// --- createRepublic (CORRIGIDO) ---
export const createRepublic = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new AppError('Validation failed', 400));
        }

        if (!req.user) {
            return next(new AppError('Usuário não autenticado.', 401));
        }

        const ownerId = req.user.uid;

        // Cria a república (o model agora lida com a atualização do usuário)
        const newRepublic = await republicModel.createRepublic({ ...req.body, owner_id: ownerId });

        // Obtém o usuário ATUALIZADO do banco de dados
        const updatedUser = await userModel.getUserById(ownerId);
        if (!updatedUser) {
            return next(new AppError('Usuário não encontrado após criar república.', 404)); // Erro crítico
        }

        // Gerar um novo token JWT (com os dados atualizados)
        const token = signToken(updatedUser.uid!, updatedUser.role || 'user');


        // Retorna os dados da república E os dados atualizados do usuário (SEM A SENHA)
        res.status(201).json({
            status: 'success',
            token, // <-- RETORNA O NOVO TOKEN
            data: {
                republic: newRepublic,
                user: updatedUser, // <-- RETORNA OS DADOS ATUALIZADOS DO USUÁRIO
            },
        });

    } catch (error) {
        next(error);
    }
};

// --- getAllRepublics ---
export const getAllRepublics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const republics = await republicModel.getAllRepublics();
        res.status(200).json({
            status: 'success',
            results: republics.length,
            data: {
                republics,
            },
        });
    } catch (error) {
        next(error);
    }
};

// --- getRepublicById ---
export const getRepublicById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const republic = await republicModel.getRepublicById(req.params.id);
        if (!republic) {
            return next(new AppError('Republic not found', 404));
        }
        res.status(200).json({
            status: 'success',
            data: {
                republic,
            },
        });
    } catch (error) {
        next(error);
    }
};

// --- getRepublicByCode ---
export const getRepublicByCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const republic = await republicModel.getRepublicByCode(req.params.code);
        if (!republic) {
            return next(new AppError('Republic not found', 404));
        }
        res.status(200).json({
            status: 'success',
            data: {
                republic,
            },
        });
    } catch (error) {
        next(error);
    }
};

// --- updateRepublic (CORRIGIDO - Permissões) ---
export const updateRepublic = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new AppError('Validation failed', 400));
        }

        // Verifica permissões (apenas o dono ou um admin podem atualizar)
        if (!req.user) {
            return next(new AppError('Usuário não autenticado.', 401));
        }

        const republic = await republicModel.getRepublicById(req.params.id);
        if (!republic) {
            return next(new AppError('Republic not found', 404));
        }

        if (req.user.role !== 'admin' && req.user.uid !== republic.owner_id) {
            return next(new AppError('You do not have permission to update this republic', 403));
        }

        const updatedRepublic = await republicModel.updateRepublic(req.params.id, req.body);
        res.status(200).json({
            status: 'success',
            data: {
                republic: updatedRepublic,
            },
        });

    } catch (error) {
        next(error);
    }
};

// --- deleteRepublic (CORRIGIDO - Permissões) ---
export const deleteRepublic = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        // Verifica permissões (apenas o dono ou um admin podem deletar)
        if (!req.user) {
            return next(new AppError('Usuário não autenticado.', 401));
        }

        const republic = await republicModel.getRepublicById(req.params.id);
        if (!republic) {
            return next(new AppError('Republic not found', 404));
        }

        if (req.user.role !== 'admin' && req.user.uid !== republic.owner_id) {
            return next(new AppError('You do not have permission to delete this republic', 403));
        }

        await republicModel.deleteRepublic(req.params.id);
        res.status(204).send(); // 204 No Content

    } catch (error) {
        next(error);
    }
};
/**
 * Controller para permitir que um usuário entre em uma república usando o código de convite
 */

export const joinRepublicByCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const code = req.params.code;
        
        // Verificar se o código existe e não é undefined
        if (!code) {
            return next(new AppError('Republic code is required', 400));
        }

        // Obter o usuário autenticado
        const authenticatedUser = (req as AuthenticatedRequest).user;

        if (!authenticatedUser) {
            return next(new AppError('User not authenticated', 401));
        }

        // Buscar a república pelo código - garantindo que code é string
        const republic = await republicModel.getRepublicByCode(code);
        
        if (!republic) {
            return next(new AppError('Republic not found with this code', 404));
        }

        // Verificar se o usuário já está nessa república
        const user = await userModel.getUserById(authenticatedUser.uid);
        if (!user) {
            return next(new AppError('User not found', 404));
        }
        
        if (user.current_republic_id === republic.id) {
            return next(new AppError('You are already a member of this republic', 400));
        }

        // Garantir que republic.id não é undefined antes de passar para updateUserRepublic
        const republicId = republic.id;
        if (!republicId) {
            return next(new AppError('Republic has no valid ID', 500));
        }

        // Atualizar o usuário associando-o à república
        const updatedUser = await userModel.updateUserRepublic(authenticatedUser.uid, republicId);
        
        // Gerar novo token JWT usando a função existente do middleware
        const token = signToken(updatedUser.uid!, updatedUser.role || 'user');

        res.status(200).json({
            status: 'success',
            token,
            data: {
                user: updatedUser,
            },
        });
    } catch (error) {
        next(error);
    }
};
