import pool from '../utils/db';
import { AppError } from '../utils/errorHandlers';
import { QueryResult } from 'pg';

export interface Republic {
  id?: string;
  name: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  owner_id: string;
  code?: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Republic:
 *       type: object
 *       required:
 *         - name
 *         - street
 *         - number
 *         - neighborhood
 *         - city
 *         - state
 *         - zip_code
 *         - owner_id
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID único da república (gerado pelo banco de dados)
 *         name:
 *           type: string
 *           description: Nome da república
 *         street:
 *           type: string
 *           description: Rua da república
 *         number:
 *           type: string
 *           description: Número do endereço da república
 *         complement:
 *           type: string
 *           description: Complemento do endereço da república (opcional)
 *         neighborhood:
 *           type: string
 *           description: Bairro da república
 *         city:
 *           type: string
 *           description: Cidade da república
 *         state:
 *           type: string
 *           description: Estado da república (sigla de 2 letras)
 *         zip_code:
 *           type: string
 *           description: CEP da república
 *         owner_id:
 *           type: string
 *           format: uuid
 *           description: ID do usuário que é dono da república
 *         code:
 *           type: string
 *           description: Código único da república (6 caracteres alfanuméricos)
 *       example:
 *         id: "c4a5b6d7-e8f9-0123-4567-89abcdef0123"
 *         name: "República dos Programadores"
 *         street: "Rua dos Códigos"
 *         number: "42"
 *         complement: "Apto 101"
 *         neighborhood: "Centro"
 *         city: "São Paulo"
 *         state: "SP"
 *         zip_code: "01234-567"
 *         owner_id: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *         code: "XYZ123"
 *
 *     RepublicCreate:
 *       allOf:
 *         - $ref: '#/components/schemas/Republic'
 *         - type: object
 *           required:
 *             - name
 *             - street
 *             - number
 *             - neighborhood
 *             - city
 *             - state
 *             - zip_code
 *             - owner_id
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *               readOnly: true  # O ID não deve ser enviado na criação
 *             code:
 *               type: string
 *               readOnly: true # O código não deve ser enviado na criação
 *
 *     RepublicUpdate:
 *        type: object
 *        properties:
 *           name:
 *             type: string
 *             description: Nome da república
 *           street:
 *             type: string
 *             description: Rua da república
 *           number:
 *             type: string
 *             description: Número do endereço da república
 *           complement:
 *             type: string
 *             description: Complemento do endereço da república (opcional)
 *           neighborhood:
 *             type: string
 *             description: Bairro da república
 *           city:
 *              type: string
 *              description: Cidade da República
 *           state:
 *             type: string
 *             description: Estado da república (sigla de 2 letras)
 *           zip_code:
 *             type: string
 *             description: CEP da república
 *           owner_id:
 *             type: string
 *             format: uuid
 *             description: ID do usuário que é dono da república
 *           code:
 *              type: string
 *              description: Código da república
 */


//Função para gerar o código da república
const generateRepublicCode = async (): Promise<string> => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    let isCodeUnique = false;
  
    while (!isCodeUnique) {
      code = ''; // Reseta o código a cada iteração
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
  
      //Verificar se já existe
      const existingRepublic = await getRepublicByCode(code);
      isCodeUnique = !existingRepublic; //Se não existir, o código é único
    }
  
    return code;
  }
  
  export const createRepublic = async (republicData: Republic): Promise<Republic> => {
    const { name, street, number, complement, neighborhood, city, state, zip_code, owner_id } = republicData;
  
    const code = await generateRepublicCode();
  
    const query = `
          INSERT INTO republics (name, street, number, complement, neighborhood, city, state, zip_code, owner_id, code)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *;
      `;
  
    try {
      const result: QueryResult<Republic> = await pool.query(query, [name, street, number, complement, neighborhood, city, state, zip_code, owner_id, code]);
      const newRepublic = result.rows[0];
  
      // ATUALIZA O USUÁRIO (CORRIGIDO!) - Usa ID da república
      await pool.query('UPDATE "user" SET current_republic_id = $1, is_admin = TRUE WHERE uid = $2', [newRepublic.id, owner_id]); // <-- CORRIGIDO: newRepublic.id
  
      return newRepublic;
  
    } catch (error: any) {
       if (error.code === '23503') { // Violação de foreign key (owner_id)
        throw new AppError('Invalid owner_id', 400);
      }
      if (error.code === '23505') {
        throw new AppError('Republic code already exists', 409);
      }
      console.error("Erro ao criar república:", error);
      throw new AppError('Failed to create republic', 500);
    }
  };
  
  export const getAllRepublics = async (): Promise<Republic[]> => {
    const result = await pool.query('SELECT * FROM republics');
    return result.rows;
  };
  
  export const getRepublicById = async (id: string): Promise<Republic | null> => {
    const result: QueryResult<Republic> = await pool.query('SELECT * FROM republics WHERE id = $1', [id]);
    return result.rows[0] || null;
  };
  
  export const getRepublicByCode = async (code: string): Promise<Republic | null> => {
    try {
      // Garantimos que code é uma string válida
      if (!code) {
        return null;
      }
      
      const query = `SELECT * FROM republics WHERE code = $1`;
      const result: QueryResult<Republic> = await pool.query(query, [code]);
      
      return result.rows[0] || null; // Retorna null se não encontrar
    } catch (error: any) {
      throw new AppError('Error finding republic', 500);
    }
  };
  export const updateRepublic = async (id: string, updates: Partial<Republic>): Promise<Republic> => {
    const updateFields = Object.keys(updates)
      .filter(key => updates[key as keyof Republic] !== undefined)
      .map((key, index) => `"${key}" = $${index + 2}`)
      .join(', ');
  
    if (!updateFields) {
      throw new AppError('No valid fields to update', 400);
    }
  
    const query = `
        UPDATE republics
        SET ${updateFields}
        WHERE id = $1
        RETURNING *;
    `;
    const values = [id, ...Object.values(updates).filter(value => value !== undefined)];
  
    try {
      const result: QueryResult<Republic> = await pool.query(query, values);
      if (result.rowCount === 0) {
        throw new AppError('Republic not found', 404);
      }
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23503') {
        throw new AppError('Invalid owner_id', 400);
      }
      throw new AppError('Failed to update Republic', 500);
    }
  };
  
  // Não teremos soft delete para republic, será um delete direto.
  export const deleteRepublic = async (id: string): Promise<void> => {
  
    //Desassociar os usuários da república, antes de deletar
    await pool.query('UPDATE "user" SET current_republic_id = NULL, is_admin = FALSE WHERE current_republic_id = $1', [id]);
  
    const result = await pool.query('DELETE FROM republics WHERE id = $1', [id]);
  
    if (result.rowCount === 0) {
      throw new AppError('Republic not found', 404);
    }
  };
