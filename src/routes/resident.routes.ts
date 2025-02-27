import express from 'express';
import * as residentController from '../controllers/resident.controller';
import * as authMiddleware from '../middleware/auth.middleware';
import { body, param } from 'express-validator';

const router = express.Router();

/**
 * @swagger
 * /residents:
 *   post:
 *     summary: Cria um novo residente (requer autenticação)
 *     tags: [Residents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResidentCreate'
 *     responses:
 *       201:
 *         description: Residente criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resident'
 *       400:
 *         description: Erro de validação, republic_id ou user_id inválidos
 *       401:
 *         description: Não autenticado
 *       409:
 *         description: Residente já existe com essa data de entrada
 *       500:
 *         description: Erro interno do servidor
 */
router.post(
  '/',
  authMiddleware.protect,
  [
    body('republic_id').isUUID().withMessage('Invalid republic_id'),
    body('user_id').isUUID().withMessage('Invalid user_id'),
    body('entry_date').isISO8601().withMessage('Invalid entry_date (must be ISO8601)'),
    body('departure_date').optional().isISO8601().withMessage('Invalid departure_date (must be ISO8601)'),
  ],
  residentController.createResident
);

/**
 * @swagger
 * /residents:
 *   get:
 *     summary: Obtém todos os residentes (requer autenticação)
 *     tags: [Residents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de residentes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Resident'
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/', authMiddleware.protect, residentController.getAllResidents);

/**
 * @swagger
 * /residents/republic/{republicId}:
 *  get:
 *      summary: Obtém os residentes de uma república (requer autenticação).
 *      tags: [Residents]
 *      security:
 *        - bearerAuth: []
 *      parameters:
 *          - in: path
 *            name: republicId
 *            required: true
 *            schema:
 *              type: string
 *              format: uuid
 *            description: ID da república.
 *      responses:
 *          200:
 *              description: Lista de residentes da república.
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: array
 *                          items:
 *                              $ref: '#/components/schemas/ResidentWithUser'
 *          400:
 *              description: ID da república inválido
 *          401:
 *              description: Não autenticado.
 *          500:
 *              description: Erro interno do servidor.
 */
router.get('/republic/:republicId',
  authMiddleware.protect,
  [
    param('republicId').isUUID().withMessage('Invalid republicId')
  ],
  residentController.getResidentsByRepublicId
);

/**
 * @swagger
 * /residents/{id}:
 *   get:
 *     summary: Obtém um residente específico (requer autenticação)
 *     tags: [Residents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do residente
 *     responses:
 *       200:
 *         description: Detalhes do residente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resident'
 *       400:
 *         description: ID do residente inválido
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Residente não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/:id',
  authMiddleware.protect,
  [
    param('id').isInt().withMessage('Invalid resident ID')
  ],
  residentController.getResidentById
);

/**
 * @swagger
 * /residents/{id}:
 *   put:
 *     summary: Atualiza um residente (requer autenticação)
 *     tags: [Residents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do residente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResidentUpdate'
 *     responses:
 *       200:
 *         description: Residente atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resident'
 *       400:
 *         description: Erro de validação, republic_id ou user_id inválidos
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Residente não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.put('/:id',
  authMiddleware.protect,
  [param('id').isInt().withMessage('Invalid resident ID'),
    body('republic_id').optional().isUUID().withMessage('Invalid republic_id'),
    body('user_id').optional().isUUID().withMessage('Invalid user_id'),
    body('entry_date').optional().isISO8601().withMessage('Invalid entry_date (must be ISO8601)'),
    body('departure_date').optional().isISO8601().withMessage('Invalid departure_date (must be ISO8601)'),

  ],
  residentController.updateResident
);

/**
 * @swagger
 * /residents/{id}:
 *   delete:
 *     summary: "Deleta" um residente (soft delete - requer autenticação)
 *     tags: [Residents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do residente
 *     responses:
 *       204:
 *         description: Residente "deletado" com sucesso (sem conteúdo)
 *       400:
 *          description: ID do residente inválido
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Residente não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.delete('/:id',
  authMiddleware.protect,
  [
    param('id').isInt().withMessage('Invalid resident ID')
  ],
  residentController.deleteResident
);

export default router;