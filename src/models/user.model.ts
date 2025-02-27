import pool from '../utils/db';
import { AppError } from '../utils/errorHandlers';
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
 *           description: ID único do usuário (gerado pelo firebase)
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
 *         role:
 *           type: string
 *           enum: [admin, user, resident]
 *           description: Papel do usuário (admin, user, resident)
 *         entry_date:
 *           type: string
 *           format: date-time
 *           description: Data de entrada na republica.
 *         departure_date:
 *           type: string
 *           format: date-time
 *           description: Data de saida da republica.
 *       example:
 *          uid: "abcdef1234567890"
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
 *          entry_date: "2023-10-27T12:00:00Z"
 *          departure_date: "2024-10-27T12:00:00Z"
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
 *        entry_date:
 *           type: string
 *           format: date-time
 *           description: Data de entrada na republica.
 *        departure_date:
 *           type: string
 *           format: date-time
 *           description: Data de saida da republica.
 */

// Interface para representar um usuário (TypeScript)
export interface User {
  uid: string;
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
  role?: 'admin' | 'user' | 'resident'; // Enum inline
  entry_date?: Date;
  departure_date?: Date;
}


export const createUser = async (userData: User): Promise<User> => {
  const { uid, name, email, phone_number, profile_picture_url, firebase_uid, provider, current_republic_id, is_admin, status, role, entry_date, departure_date} = userData;

  const query = `
    INSERT INTO "user" ( name, email, phone_number, profile_picture_url, firebase_uid, provider, current_republic_id, is_admin, status, role, entry_date, departure_date)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12 )
    RETURNING *;
  `;
  const existingUser = await getUserByFirebaseUID(firebase_uid);
  if(existingUser) {
      throw new AppError('Firebase UID already exists', 409);
  }
  try {
    const result: QueryResult<User> = await pool.query(query, [name, email, phone_number, profile_picture_url, firebase_uid, provider, current_republic_id, is_admin, status, role, entry_date, departure_date]);
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


export const getAlluser = async (): Promise<User[]> => {
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
  const result = await pool.query('DELETE FROM user WHERE uid = $1', [uid]);
  if (result.rowCount === 0) {
    throw new AppError('User not found', 404);
  }
};

/**
 * Atualiza a república atual de um usuário
 * @param uid - ID único do usuário
 * @param republicId - ID da república (ou null para remover o usuário de qualquer república)
 * @returns O usuário atualizado
 */
export const updateUserRepublic = async (uid: string, republicId: string | null): Promise<User> => {
  try {
    // Verificar se o usuário existe
    const user = await getUserById(uid);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Atualizar o campo current_republic_id
    // Se o republicId for null, também definimos is_admin como FALSE para evitar permissões residuais
    const query = republicId === null 
      ? `UPDATE "user" SET current_republic_id = NULL, is_admin = FALSE WHERE uid = $1 RETURNING *`
      : `UPDATE "user" SET current_republic_id = $2 WHERE uid = $1 RETURNING *`;

    const values = republicId === null ? [uid] : [uid, republicId];
    
    const result: QueryResult<User> = await pool.query(query, values);
    
    // Verificar se a atualização foi bem-sucedida
    if (result.rowCount === 0) {
      throw new AppError('Failed to update user republic', 500);
    }

    return result.rows[0];
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    
    if (error.code === '23503') { // Violação de foreign key
      throw new AppError('Invalid republic_id', 400);
    }
    
    throw new AppError('Failed to update user republic', 500);
  }
};
