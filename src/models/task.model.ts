import pool from '../utils/db';
import { AppError } from '../utils/errorHandlers';
import { QueryResult } from 'pg';

/**
 * @swagger
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       required:
 *         - title
 *         - republic_id
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID único da tarefa (gerado pelo banco de dados)
 *         title:
 *           type: string
 *           description: Título da tarefa
 *         description:
 *           type: string
 *           description: Descrição da tarefa (opcional)
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Data e hora de criação da tarefa (automático)
 *         is_completed:
 *           type: boolean
 *           description: Indica se a tarefa foi completada (padrão false)
 *         completed_at:
 *           type: string
 *           format: date-time
 *           description: Data e hora de conclusão da tarefa (opcional)
 *         next_due_date:
 *           type: string
 *           format: date-time
 *           description: Próxima data de vencimento da tarefa (opcional)
 *         category:
 *           type: string
 *           description: Categoria da tarefa (opcional)
 *         republic_id:
 *           type: string
 *           format: uuid
 *           description: ID da república à qual a tarefa pertence
 *       example:
 *         id: "d4b3c2a1-f5e6-4879-9012-abcdef123456"
 *         title: "Limpar a cozinha"
 *         description: "Lavar a louça, limpar o fogão e o chão."
 *         created_at: "2023-10-28T14:00:00Z"
 *         is_completed: false
 *         completed_at: null
 *         next_due_date: "2023-11-04T18:00:00Z"
 *         category: "Limpeza"
 *         republic_id: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *
 *     TaskCreate:
 *       allOf:
 *         - $ref: '#/components/schemas/Task'
 *         - type: object
 *           required:
 *             - title
 *             - republic_id
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *               readOnly: true  # O ID não deve ser enviado na criação
 *             created_at:
 *               type: string
 *               format: date-time
 *               readOnly: true # created_at não deve ser enviado na criação
 *             is_completed:
 *               type: boolean
 *               readOnly: true  # is_completed não deve ser enviado na criação
 *             completed_at:
 *               type: string
 *               format: date-time
 *               readOnly: true  # completed_at não deve ser enviado na criação
 *
 *     TaskUpdate:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           description: Título da tarefa
 *         description:
 *           type: string
 *           description: Descrição da tarefa (opcional)
 *         is_completed:
 *           type: boolean
 *           description: Indica se a tarefa foi completada
 *         completed_at:
 *           type: string
 *           format: date-time
 *           description: Data e hora de conclusão da tarefa (opcional)
 *         next_due_date:
 *           type: string
 *           format: date-time
 *           description: Próxima data de vencimento da tarefa (opcional)
 *         category:
 *           type: string
 *           description: Categoria da tarefa (opcional)
 */


export interface Task {
  id?: string; // UUID, gerado automaticamente
  title: string;
  description?: string | null;
  created_at?: Date;
  is_completed?: boolean;
  completed_at?: Date | null;
  next_due_date?: Date | null;
  category?: string | null;
  republic_id: string;
}

export const createTask = async (taskData: Task): Promise<Task> => {
  const { title, description, next_due_date, category, republic_id } = taskData;

  const query = `
    INSERT INTO task (title, description, next_due_date, category, republic_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

  try {
    const result: QueryResult<Task> = await pool.query(query, [title, description, next_due_date, category, republic_id]);
    return result.rows[0];
  } catch (error: any) {
    if (error.code === '23503') { // Violação de foreign key (republic_id)
      throw new AppError('Invalid republic_id', 400);
    }
    throw new AppError('Failed to create task', 500);
  }
};

export const getAllTasks = async (republicId: string): Promise<Task[]> => {
    const query = 'SELECT * FROM task WHERE republic_id = $1';
    const result: QueryResult<Task> = await pool.query(query, [republicId]);
    return result.rows;
};

// Get a single task by ID
export const getTaskById = async (id: string): Promise<Task | null> => {
  const query = 'SELECT * FROM task WHERE id = $1';
  const result: QueryResult<Task> = await pool.query(query, [id]);
  return result.rows[0] || null;
};

// Update a task
export const updateTask = async (id: string, updates: Partial<Task>): Promise<Task> => {
    const updateFields = Object.entries(updates)
    .filter(([, value]) => value !== undefined)
    .map(([key], index) => `"${key}" = $${index + 2}`)
    .join(', ');

    if (!updateFields) {
        throw new AppError('No valid fields to update', 400);
    }

  const query = `
    UPDATE task
    SET ${updateFields}
    WHERE id = $1
    RETURNING *;
  `;

  const values = [id, ...Object.values(updates).filter(value => value !== undefined)];

  try {
    const result: QueryResult<Task> = await pool.query(query, values);
      if (result.rowCount === 0) {
        throw new AppError('Task not found', 404);
    }
    return result.rows[0];
  } catch (error: any) {
     if (error.code === '23503') { // Violação de foreign key (republic_id)
      throw new AppError('Invalid republic_id', 400);
    }
    throw new AppError('Failed to update task', 500);
  }
};

// Delete a task (Hard delete.  Consider soft-delete for production.)
export const deleteTask = async (id: string): Promise<void> => {
    const query = 'DELETE FROM task WHERE id = $1';
    const result = await pool.query(query, [id]);
    if(result.rowCount === 0) {
        throw new AppError('Task not found', 404);
    }
};

// Mark task as complete
export const completeTask = async (id: string): Promise<Task> => {
    const query = `UPDATE task SET is_completed = TRUE, completed_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *;`;
    const result: QueryResult<Task> = await pool.query(query, [id]);

     if (result.rowCount === 0) {
        throw new AppError('Task not found', 404);
    }
    return result.rows[0];
}

// Tasks by category (optional, good for filtering)
export const getTasksByCategory = async (republicId: string, category: string): Promise<Task[]> => {
  const query = `SELECT * FROM task WHERE republic_id = $1 AND category = $2`;
  const result: QueryResult<Task> = await pool.query(query, [republicId, category]);
  return result.rows;
};