import express from 'express';
import * as republicController from '../controllers/republic.controller';
import * as authMiddleware from '../middleware/auth.middleware';
import { body, param } from 'express-validator';

const router = express.Router();

/**
 * @swagger
 * /republics:
 *   post:
 *     summary: Cria uma nova república (o usuário autenticado se torna o dono)
 *     tags: [Republics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RepublicCreate'
 *     responses:
 *       201:
 *         description: República criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Republic'
 *       400:
 *         description: Erro de validação ou owner_id inválido
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro interno do servidor
 */
router.post(
  '/',
  authMiddleware.protect,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('street').trim().notEmpty().withMessage('Street is required'),
    body('number').trim().notEmpty().withMessage('Number is required'),
    body('neighborhood').trim().notEmpty().withMessage('Neighborhood is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('state').isLength({ min: 2, max: 2 }).withMessage('State must be a 2-letter code'),
    body('zip_code').trim().notEmpty().withMessage('Zip code is required'),
    body('owner_id').isUUID().withMessage('Invalid owner_id'),
  ],
  republicController.createRepublic
);

/**
 * @swagger
 * /republics:
 *   get:
 *     summary: Obtém todas as repúblicas (requer autenticação)
 *     tags: [Republics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de repúblicas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Republic'
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/', authMiddleware.protect, republicController.getAllRepublics);

/**
 * @swagger
 * /republics/{id}:
 *   get:
 *     summary: Obtém uma república pelo ID (requer autenticação)
 *     tags: [Republics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da república
 *     responses:
 *       200:
 *         description: Detalhes da república
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Republic'
 *       400:
 *         description: ID da republica inválido
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: República não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/:id',
  authMiddleware.protect,
  [
    param('id').isUUID().withMessage('Invalid republic ID')
  ],
  republicController.getRepublicById
);

/**
 * @swagger
 * /republics/code/{code}:
 *  get:
 *    summary: Obtém uma república pelo código (requer autenticação).
 *    tags: [Republics]
 *    security:
 *      - bearerAuth: []
 *    parameters:
 *      - in: path
 *        name: code
 *        required: true
 *        schema:
 *          type: string
 *          example: "ABCDEF"
 *        description: Código da república (6 caracteres alfanuméricos).
 *    responses:
 *      200:
 *          description: República encontrada com sucesso.
 *          content:
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/Republic'
 *      400:
 *        description: Código Inválido.
 *      401:
 *          description: Não autenticado.
 *      404:
 *          description: República não encontrada.
 *      500:
 *          description: Erro interno do servidor.
 */
router.get('/code/:code',
  authMiddleware.protect,
  [
    param('code').isLength({ min: 6, max: 6 }).withMessage('Invalid Republic Code')
  ],
  republicController.getRepublicByCode
);

/**
 * @swagger
 * /republics/{id}:
 *   put:
 *     summary: Atualiza uma república (requer autenticação e ser o dono ou admin)
 *     tags: [Republics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da república
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RepublicUpdate'
 *     responses:
 *       200:
 *         description: República atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Republic'
 *       400:
 *         description: Erro de validação ou owner_id inválido
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: República não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
router.put('/:id',
  authMiddleware.protect,
  //authMiddleware.restrictTo('admin'), // Exemplo de como restringir a rota
  [
    param('id').isUUID().withMessage('Invalid republic ID'),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('street').optional().trim().notEmpty().withMessage('Street cannot be empty'),
    body('number').optional().trim().notEmpty().withMessage('Number cannot be empty'),
    body('neighborhood').optional().trim().notEmpty().withMessage('Neighborhood cannot be empty'),
    body('city').optional().trim().notEmpty().withMessage('City cannot be empty'),
    body('state').optional().isLength({ min: 2, max: 2 }).withMessage('State must be a 2-letter code'),
    body('zip_code').optional().trim().notEmpty().withMessage('Zip code cannot be empty'),
    body('owner_id').optional().isUUID().withMessage('Invalid owner_id'),
  ],
  republicController.updateRepublic
);
/**
 * @swagger
 * /republics/join/{code}:
 *   post:
 *     summary: Entrar em uma república usando o código de convite
 *     tags: [Republics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Código da república
 *     responses:
 *       200:
 *         description: Entrou na república com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 token:
 *                   type: string
 *                   description: JWT token atualizado
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Erro de validação ou usuário já é membro da república
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: República não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
router.post(
    '/join/:code', 
    authMiddleware.protect,
    [
        param('code').notEmpty().withMessage('Republic code is required')
    ],
    republicController.joinRepublicByCode
);

export default router;