import pool from '../utils/db';
import { AppError } from '../utils/errorHandlers';
import bcrypt from 'bcryptjs';
import { QueryResult } from 'pg';

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - firebase_uid
 *         - provider
 *       properties:
 *         uid:
 *           type: string
 *           format: uuid
 *           description: ID único do usuário (gerado pelo banco de dados)
 *         name:
 *           type: string
 *           description: Nome do usuário
 *         email:
 *           type: string
 *           format: email
 *           description: Email do usuário
 *         phone_number:
 *           type: string
 *           description: Número de telefone do usuário (opcional)
 *         profile_picture_url:
 *           type: string
 *           format: url
 *           description: URL da foto de perfil do usuário (opcional)
 *         current_republic_id:
 *           type: string
 *           format: uuid
 *           description: ID da república atual do usuário (opcional)
 *         is_admin:
 *           type: boolean
 *           description: Indica se o usuário é um administrador da república (opcional, padrão false)
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Data e hora de criação do usuário
 *         last_login:
 *           type: string
 *           format: date-time
 *           description: Data e hora do último login do usuário (opcional)
 *         status:
 *           type: string
 *           enum: [active, inactive, banned]
 *           description: Status do usuário
 *         firebase_uid:
 *           type: string
 *           description: UID do usuário no Firebase
 *         provider:
 *           type: string
 *           enum: [email, google.com, facebook.com, phone, github.com, custom]
 *           description: Provedor de autenticação do usuário
 *         password:
 *           type: string
 *           description: Senha do usuário (hashed, presente apenas no banco de dados, nunca retornado na API)
 *         role:
 *           type: string
 *           enum: [admin, user, resident]
 *           description: Papel do usuário (admin, user, resident)
 *       example:
 *          uid: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *          name: "João da Silva"
 *          email: "joao.silva@example.com"
 *          phone_number: "+5511999999999"
 *          profile_picture_url: "https://example.com/profile.jpg"
 *          current_republic_id: "b2c3d4e5-f678-9012-3456-7890abcdef12"
 *          is_admin: false
 *          created_at: "2023-10-27T10:00:00Z"
 *          last_login: "2023-10-27T12:00:00Z"
 *          status: "active"
 *          firebase_uid: "abcdef1234567890"
 *          provider: "email"
 *          role: "user"
 *
 *     UserCreate:  # Schema separado para a criação do usuário (sem uid, created_at, etc.)
 *      allOf:
 *        - type: object
 *          required:
 *            - name
 *            - email
 *            - firebase_uid
 *            - provider
 *          properties:
 *            password:
 *              type: string
 *              description:  Senha do usuário. Opcional, pois o usuário pode se registrar com outro provider.
 *            role:
 *              type: string
 *              enum: [admin, user, resident]
 *              description: Papel do usuário (admin, user, resident).
 *        - $ref: '#/components/schemas/User'
 *
 *     UserUpdate:
 *      type: object
 *      properties:
 *        name:
 *          type: string
 *          description: Nome do usuário.
 *        email:
 *          type: string
 *          format: email
 *          description: Email do usuário.
 *        phone_number:
 *          type: string
 *          description: Número de telefone do usuário.
 *        profile_picture_url:
 *          type: string
 *          format: url
 *          description: URL da foto de perfil do usuário.
 *        current_republic_id:
 *          type: string
 *          format: uuid
 *          description: ID da república atual do usuário.
 *        is_admin:
 *          type: boolean
 *          description: Indica se o usuário é um administrador da república.
 *        status:
 *          type: string
 *          enum: [active, inactive, banned]
 *          description: Status do usuário.
 *        firebase_uid:
 *         type: string
 *         description: UID do usuário no Firebase.
 *        role:
 *          type: string
 *          enum: [admin, user, resident]
 *          description: Papel do usuário (admin, user, resident).
 */

// Interface para representar um usuário (TypeScript)
export interface User {
  id(id: any, arg1: string): unknown;
  uid?: string; // Opcional para criação (gerado automaticamente)
  name: string;
  email: string;
  phone_number?: string;
  profile_picture_url?: string;
  current_republic_id?: string | null;
  is_admin?: boolean;
  created_at?: Date;
  last_login?: Date;
  status?: 'active' | 'inactive' | 'banned';
  firebase_uid: string;
  provider: 'email' | 'google.com' | 'facebook.com' | 'phone' | 'github.com' | 'custom';
  password?: string;
  role?: 'admin' | 'user' | 'resident'; // Enum inline
}


export const createUser = async (userData: User): Promise<User> => {
  const { name, email, phone_number, profile_picture_url, firebase_uid, provider, password, current_republic_id, is_admin, status, role } = userData;
  const hashedPassword = password ? await bcrypt.hash(password, 12) : null;

  const query = `
    INSERT INTO public."user" (name, email, phone_number, profile_picture_url, firebase_uid, provider, password, current_republic_id, is_admin, status, role)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *;
  `;
  const existingUser = await getUserByFirebaseUID(firebase_uid);
  if(existingUser) {
      throw new AppError('Firebase UID already exists', 409);
  }
  try {
    const result: QueryResult<User> = await pool.query(query, [name, email, phone_number, profile_picture_url, firebase_uid, provider, hashedPassword, current_republic_id, is_admin, status, role]);
    return result.rows[0];
  } catch (error: any) { //  <--  'any' aqui é importante
    if (error.code === '23505') { // Código de erro do PostgreSQL para UNIQUE constraint violation
      throw new AppError('Email or Firebase UID already exists', 409); // 409 Conflict
    }
    if (error.code === '23503') { // Violação de foreign key
      throw new AppError('Invalid republic_id', 400); // Bad Request 
    }
    throw new AppError('Failed to create user', 500); 
  }
};


export const getAllUsers = async (): Promise<User[]> => {
  const result = await pool.query('SELECT * FROM "user"');
  return result.rows;
};

export const getUserById = async (uid: string): Promise<User | null> => {
  const result: QueryResult<User> = await pool.query('SELECT * FROM "user" WHERE uid = $1', [uid]);
  return result.rows[0] || null; // Retorna null se não encontrar
};

export const getUserByFirebaseUID = async (firebaseUid: string): Promise<User | null> => {
  const result: QueryResult<User> = await pool.query('SELECT * FROM "user" WHERE firebase_uid = $1', [firebaseUid]);
  return result.rows[0] || null;
};

export const updateUser = async (uid: string, updates: Partial<User>): Promise<User> => {
  const updateFields = Object.entries(updates) // Usando Object.entries
    .filter(([, value]) => value !== undefined)
    .map(([key], index) => `"${key}" = $${index + 2}`)
    .join(', ');

  if (!updateFields) {
    throw new AppError('No valid fields to update', 400);
  }

  const query = `
      UPDATE "user"
      SET ${updateFields}
      WHERE uid = $1
      RETURNING *;
  `;

  const values = [uid, ...Object.values(updates).filter(value => value !== undefined)];

  try {
    const result: QueryResult<User> = await pool.query(query, values);
    if (result.rowCount === 0) {
      throw new AppError('User not found', 404);
    }
    return result.rows[0];
  } catch (error: any) {
    if (error.code === '23505') {
      throw new AppError('Email or Firebase UID already exists', 409);
    }
    throw new AppError('Failed to update user', 500);
  }
};

export const deleteUser = async (uid: string): Promise<void> => {
  const result = await pool.query('DELETE FROM "user" WHERE uid = $1', [uid]);
  if (result.rowCount === 0) {
    throw new AppError('User not found', 404);
  }
};

//Função para verificar a senha
export const verifyPassword = async (inputPassword: string, hashedPassword: string | null | undefined): Promise<boolean> => {
  if (!hashedPassword) {
    return false;
  }
  return await bcrypt.compare(inputPassword, hashedPassword);
}