import express from 'express';
import * as taskController from '../controllers/task.controller';  // Sem .ts
import * as authMiddleware from '../middleware/auth.middleware';  // Sem .ts
import { body, param } from 'express-validator';

const router = express.Router();

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Cria uma nova tarefa para a república do usuário autenticado
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskCreate'
 *     responses:
 *       201:
 *         description: Tarefa criada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Erro de validação (título ausente, republic_id inválido, etc.).
 *       401:
 *         description: Não autenticado (token ausente ou inválido).
 *       403:
 *         description: Não autorizado (usuário não pertence à república).
 *       500:
 *         description: Erro interno do servidor.
 */
router.post(
  '/',
  authMiddleware.protect,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').optional().trim(),
    body('next_due_date').optional().isISO8601().withMessage('Invalid date format'),
    body('category').optional().trim(),
    body('republic_id').isUUID().withMessage('Invalid republic_id'),
  ],
  taskController.createTask
);

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Obtém todas as tarefas da república do usuário autenticado
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tarefas.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *       401:
 *         description: Não autenticado.
 *       403:
 *         description: Usuário não associado a uma república.
 *       500:
 *         description: Erro interno do servidor.
 */
router.get('/', authMiddleware.protect, taskController.getAllTasks);

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Obtém uma tarefa específica pelo ID (requer autenticação e que a tarefa pertença à república do usuário)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da tarefa.
 *     responses:
 *       200:
 *         description: Detalhes da tarefa.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       401:
 *         description: Não autenticado.
 *       403:
 *         description: Usuário não tem permissão para acessar esta tarefa.
 *       404:
 *         description: Tarefa não encontrada.
 *       500:
 *         description: Erro interno do servidor.
 */
router.get('/:id',
    authMiddleware.protect,
    [
        param('id').isUUID().withMessage('Invalid task ID')
    ],
    taskController.getTaskById
);

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Atualiza uma tarefa (requer autenticação e permissão)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da tarefa.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskUpdate'
 *     responses:
 *       200:
 *         description: Tarefa atualizada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Erro de validação.
 *       401:
 *         description: Não autenticado.
 *       403:
 *         description: Usuário não tem permissão para atualizar esta tarefa.
 *       404:
 *         description: Tarefa não encontrada.
 *       500:
 *         description: Erro interno do servidor.
 */
router.put(
  '/:id',
  authMiddleware.protect,
  [
    param('id').isUUID().withMessage('Invalid task ID'),
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('description').optional().trim(),
    body('next_due_date').optional().isISO8601().withMessage('Invalid date format'),
    body('category').optional().trim(),
    body('is_completed').optional().isBoolean().withMessage('is_completed must be a boolean'), //Valida is_completed
  ],
  taskController.updateTask
);

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Deleta uma tarefa (requer autenticação e permissão)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da tarefa.
 *     responses:
 *       204:
 *         description: Tarefa deletada com sucesso (sem conteúdo).
 *       401:
 *         description: Não autenticado.
 *       403:
 *         description: Usuário não tem permissão para deletar esta tarefa.
 *       404:
 *         description: Tarefa não encontrada.
 *       500:
 *         description: Erro interno do servidor.
 */
router.delete('/:id',
    authMiddleware.protect,
    [
        param('id').isUUID().withMessage('Invalid task ID')
    ],
    taskController.deleteTask
);

/**
 * @swagger
 * /tasks/{id}/complete:
 *  patch:
 *    summary: Marca uma tarefa como completa (requer autenticação e permissão).
 *    tags: [Tasks]
 *    security:
 *      - bearerAuth: []
 *    parameters:
 *      - in: path
 *        name: id
 *        required: true
 *        schema:
 *          type: string
 *          format: uuid
 *        description: ID da tarefa.
 *    responses:
 *      200:
 *        description: Tarefa marcada como completa com sucesso.
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Task'
 *      401:
 *        description: Não autenticado.
 *      403:
 *        description: Usuário não tem permissão para atualizar esta tarefa.
 *      404:
 *        description: Tarefa não encontrada.
 *      500:
 *        description: Erro interno do servidor.
 */
router.patch('/:id/complete',
    authMiddleware.protect,
    [
        param('id').isUUID().withMessage('Invalid task ID')
    ],
    taskController.completeTask
);

/**
 * @swagger
 * /tasks/category/{category}:
 *  get:
 *    summary: Obtém tarefas por categoria (requer autenticação).
 *    tags: [Tasks]
 *    security:
 *      - bearerAuth: []
 *    parameters:
 *      - in: path
 *        name: category
 *        required: true
 *        schema:
 *          type: string
 *        description: Categoria das tarefas.
 *    responses:
 *      200:
 *        description: Lista de tarefas da categoria especificada.
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                $ref: '#/components/schemas/Task'
 *      401:
 *        description: Não autenticado.
 *      403:
 *        description: Usuário não associado a uma república.
 *      500:
 *        description: Erro interno do servidor.
 */
router.get('/category/:category',
  authMiddleware.protect,
  [
      param('category').notEmpty().withMessage('Category is required')
  ],
 taskController.getTasksByCategory
);

export default router;