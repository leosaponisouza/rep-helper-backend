// controllers/user.controller.ts
import { Request, Response, NextFunction } from 'express';
import pool from '../utils/db';
import { AppError } from '../utils/errorHandlers';
import bcrypt from 'bcryptjs';
import { QueryResult } from 'pg';
import * as userModel from '../models/user.model'; // Importe o modelo
import { validationResult } from 'express-validator';
import { User } from '../models/user.model'; // Importe a interface User


// Interface estendida para o Request, para incluir informações do usuário autenticado.
interface AuthenticatedRequest extends Request {
    user?: {
        uid: string;
        role: string;
        firebaseUid: string; // Opcional, mas útil se você precisar
    };
}

// --- createUser ---
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Validação com express-validator
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new AppError('Validation failed', 400)); // Inclui detalhes dos erros
        }

        const newUser = await userModel.createUser(req.body);
        const { password, ...userData } = newUser; // Removendo a senha antes de enviar a resposta
        res.status(201).json({
            status: 'success',
            data: {
                user: userData, //Retorna todos os dados menos a senha
            },
        });
    } catch (error) {
        next(error); // Repassa o erro para o middleware de tratamento de erros
    }
};

// --- getAllUsers ---
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await userModel.getAllUsers();
        // Removendo a senha de todos os usuários antes de enviar a resposta
        const usersWithoutPassword = users.map(user => {
            const { password, ...userData } = user;
            return userData;
        });

        res.status(200).json({
            status: 'success',
            results: usersWithoutPassword.length,
            data: {
                users: usersWithoutPassword,
            },
        });
    } catch (error) {
        next(error);
    }
};

// --- getUserById ---
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await userModel.getUserById(req.params.id);
        if (!user) {
            return next(new AppError('User not found', 404));
        }

        const { password, ...userData } = user; // Removendo a senha antes de enviar
        res.status(200).json({
            status: 'success',
            data: {
                user: userData, // Envia os dados do usuario sem a senha
            },
        });
    } catch (error) {
        next(error);
    }
};

// --- getUserByFirebaseUID ---
export const getUserByFirebaseUID = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await userModel.getUserByFirebaseUID(req.params.firebaseUid);
        if (!user) {
            return next(new AppError('User not found', 404));
        }
        const {password, ...userData} = user;
        res.status(200).json({
            status: 'success',
            data: {
                user: userData, //Envia os dados do usuario sem a senha
            },
        });
    } catch (error) {
        next(error);
    }
};

// --- updateUser ---
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new AppError('Validation failed', 400));
        }

        // Impede que campos sensíveis sejam atualizados.  Adicione outros campos conforme necessário.
        const restrictedFields = ['firebase_uid', 'provider', 'password', 'created_at', 'last_login'];
        for (const field of restrictedFields) {
            if (req.body[field] !== undefined) {
                return next(new AppError(`Cannot update field: ${field}`, 400));
            }
        }

        // Verifica se o usuário que está fazendo a atualização é um admin OU é o dono do próprio perfil.
        const authenticatedUser = (req as AuthenticatedRequest).user; // Pega o usuário do middleware protect

        if (authenticatedUser?.role !== 'admin' && authenticatedUser?.uid !== req.params.id) {
            return next(new AppError('You do not have permission to update this user', 403)); // 403 Forbidden
        }

        const updatedUser = await userModel.updateUser(req.params.id, req.body);
        const {password, ...userData} = updatedUser // Removendo a senha antes de enviar.
        res.status(200).json({
            status: 'success',
            data: {
                user: userData, //Envia os dados do usuário sem a senha.
            },
        });
    } catch (error) {
        next(error);
    }
};

// --- deleteUser ---
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Verifica se o usuário que está fazendo a deleção é um admin OU é o dono do próprio perfil.
        const authenticatedUser = (req as AuthenticatedRequest).user;  // Pega o usuário do middleware protect
        if (authenticatedUser?.role !== 'admin' && authenticatedUser?.uid !== req.params.id) {
            return next(new AppError('You do not have permission to delete this user', 403));  // 403 Forbidden
        }

        await userModel.deleteUser(req.params.id);
        res.status(204).send(); // 204 No Content
    } catch (error) {
        next(error);
    }
};

// --- getMe ---
export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => { // Usa AuthenticatedRequest
    try {
        if (!req.user) {
            return next(new AppError('Usuário não autenticado.', 401));
        }

        const user = await userModel.getUserById(req.user.uid); // Usa req.user.uid
        if (!user) {
            return next(new AppError('Usuário não encontrado.', 404));
        }

        const { password, ...userData } = user; // Remove a senha
        res.status(200).json({
            status: 'success',
            data: {
                user: userData,
            },
        });
    } catch (error) {
        next(error);
    }
};