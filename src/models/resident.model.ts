import pool from '../utils/db';
import { AppError } from '../utils/errorHandlers';
import { QueryResult } from 'pg';

/**
 * @swagger
 * components:
 *   schemas:
 *     Resident:
 *       type: object
 *       required:
 *         - republic_id
 *         - user_id
 *         - entry_date
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único do residente (gerado pelo banco de dados)
 *         republic_id:
 *           type: string
 *           format: uuid
 *           description: ID da república à qual o residente pertence
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: ID do usuário que é o residente
 *         entry_date:
 *           type: string
 *           format: date-time
 *           description: Data de entrada do residente na república
 *         departure_date:
 *           type: string
 *           format: date-time
 *           description: Data de saída do residente da república (opcional)
 *       example:
 *         id: 1
 *         republic_id: "c4a5b6d7-e8f9-0123-4567-89abcdef0123"
 *         user_id: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *         entry_date: "2023-10-27T10:00:00Z"
 *         departure_date: null
 *
 *     ResidentCreate:
 *      allOf:
 *        - $ref: '#/components/schemas/Resident'
 *        - type: object
 *          required:
 *            - republic_id
 *            - user_id
 *            - entry_date
 *          properties:
 *            id:
 *             type: integer
 *             readOnly: true
 *
 *     ResidentUpdate:
 *       type: object
 *       properties:
 *         republic_id:
 *           type: string
 *           format: uuid
 *           description: ID da república à qual o residente pertence
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: ID do usuário que é o residente
 *         entry_date:
 *           type: string
 *           format: date-time
 *           description: Data de entrada do residente na república
 *         departure_date:
 *           type: string
 *           format: date-time
 *           description: Data de saída do residente da república (opcional)
 *
 *     ResidentWithUser:  # Schema para quando retornar o residente com dados do usuário
 *       allOf:
 *         - $ref: '#/components/schemas/Resident'
 *       properties:
 *         user_name:
 *           type: string
 *           description: Nome do usuário.
 *         user_email:
 *           type: string
 *           format: email
 *           description: Email do usuário.
 *         profile_picture_url:
 *           type: string
 *           format: url
 *           description: URL da foto de perfil do usuário.
 */


// Interface para representar um residente (TypeScript)
export interface Resident {
  id?: number; // SERIAL, gerado automaticamente
  republic_id: string;
  user_id: string;
  entry_date: Date;
  departure_date?: Date | null;
}

export const createResident = async (residentData: Resident): Promise<Resident> => {
  const { republic_id, user_id, entry_date, departure_date } = residentData;

  const query = `
    INSERT INTO residents (republic_id, user_id, entry_date, departure_date)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;

  try {
    const result: QueryResult<Resident> = await pool.query(query, [republic_id, user_id, entry_date, departure_date]);
    return result.rows[0];
  } catch (error: any) {
    if (error.code === '23505') { // Violação de unique constraint (republic_id, user_id, entry_date)
      throw new AppError('Resident already exists with this entry date', 409); // 409 Conflict
    }
    if (error.code === '23503') { // Violação de foreign key
      throw new AppError('Invalid republic_id or user_id', 400); //Bad Request
    }
    throw new AppError('Failed to create resident', 500);
  }
};

export const getAllResidents = async (): Promise<Resident[]> => {
  const result = await pool.query('SELECT * FROM residents');
  return result.rows;
};

//Obter residentes de uma república
export const getResidentsByRepublicId = async (republicId: string): Promise<Resident[]> => {
  const query = `
        SELECT r.*, u.name as user_name, u.email as user_email, u.profile_picture_url
        FROM residents r
        JOIN "user" u ON r.user_id = u.uid
        WHERE r.republic_id = $1
        AND r.departure_date IS NULL;
    `;
  const result = await pool.query(query, [republicId]);
  return result.rows;
}

//Obter um residente específico.
export const getResidentById = async (id: number): Promise<Resident | null> => {
  const query = `SELECT * FROM residents WHERE id = $1;`;
  const result: QueryResult<Resident> = await pool.query(query, [id]);
  return result.rows[0] || null;
}

export const updateResident = async (id: number, updates: Partial<Resident>): Promise<Resident> => {
  const updateFields = Object.entries(updates)
    .filter(([, value]) => value !== undefined) // Filtra entradas com valor undefined
    .map(([key], index) => `"${key}" = $${index + 2}`) // Usa a chave (key)
    .join(', ');

    //Mesmo código que antes...
    if (!updateFields) {
        throw new AppError('No valid fields to update', 400);
    }

    const query = `
      UPDATE residents
      SET ${updateFields}
      WHERE id = $1
      RETURNING *;
    `;

    const values = [id, ...Object.values(updates).filter(value => value !== undefined)];

    //Restante da função
    try {
        const result: QueryResult<Resident> = await pool.query(query, values);
        if (result.rowCount === 0) {
        throw new AppError('Resident not found', 404);
        }
        return result.rows[0];
    }  catch (error:any) {
            if (error.code === '23503') { //Violação de foreign key
                throw new AppError('Invalid republic_id or user_id', 400); //Bad request
            }
        throw new AppError('Failed to update resident', 500);
        }
};
//Soft delete, atualizando a data de saída
export const deleteResident = async (id: number): Promise<Resident> => {
  const query = `
        UPDATE residents
        SET departure_date = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *;
    `;
  const result: QueryResult<Resident> = await pool.query(query, [id]);

  if (result.rowCount === 0) {
    throw new AppError('Resident not found', 404);
  }
  return result.rows[0];
}