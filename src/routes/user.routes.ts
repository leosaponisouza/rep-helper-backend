import express from 'express';
import * as userController from '../controllers/user.controller'; // Importe com .ts
import * as authMiddleware from '../middleware/auth.middleware'; // Importe com .ts
import { body } from 'express-validator';

const router = express.Router();

// --- Rotas de Usuário ---

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Cria um novo usuário
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserCreate'  // Referência ao schema do usuário
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Erro de validação
 *       409:
 *         description: Email ou Firebase UID já existe
 *       500:
 *         description: Erro interno do servidor
 */
router.post(
  '/',
  [ // Validações com express-validator
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email').normalizeEmail(),
    body('firebase_uid').notEmpty().withMessage('Firebase UID is required'),
    body('provider').notEmpty().withMessage('Provider is required'),
    body('current_republic_id').optional().isUUID().withMessage('Invalid republic ID'),
    body('is_admin').optional().isBoolean().withMessage('is_admin must be a boolean'),
    body('status').optional().isIn(['active', 'inactive', 'banned']).withMessage('Invalid status value'),
    body('role').optional().isIn(['admin', 'user', 'resident']).withMessage('Invalid role value'), // Adiciona validação para role
  ],
  userController.createUser
);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Obtém todos os usuários (requer autenticação e ser admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuários
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Não autorizado (não é admin)
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/', authMiddleware.protect, authMiddleware.restrictTo('admin'), userController.getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Obtém um usuário pelo ID (requer autenticação)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do usuário
 *     responses:
 *       200:
 *         description: Detalhes do usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/:id', authMiddleware.protect, userController.getUserById);

/**
 * @swagger
 * /users/firebase/{firebaseUid}:
 *  get:
 *      summary: Obtém usuário pelo UID do firebase (requer autenticação)
 *      tags: [Users]
 *      security:
 *          - bearerAuth: []
 *      parameters:
 *          - in: path
 *            name: firebaseUid
 *            required: true
 *            schema:
 *              type: string
 *            description: UID do firebase do usuário.
 *      responses:
 *          200:
 *              description: Usuário encontrado com sucesso.
 *              content:
 *                 application/json:
 *                     schema:
 *                          $ref: '#/components/schemas/User'
 *          401:
 *              description: Não autenticado
 *          404:
 *              description: Usuário não encontrado
 *          500:
 *              description: Erro interno do servidor.
 */
router.get('/firebase/:firebaseUid', authMiddleware.protect, userController.getUserByFirebaseUID);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Atualiza um usuário (requer autenticação e, geralmente, ser o próprio usuário ou admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdate'
 *     responses:
 *       200:
 *         description: Usuário atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *          description: Erro de validação.
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Não autorizado (não é o próprio usuário nem admin)
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.put(
  '/:id',
  authMiddleware.protect,
  //Exemplo de como restringir a rota:
  // authMiddleware.restrictTo('admin', 'user'), // Permite que admins ou o próprio usuário editem
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Invalid email').normalizeEmail(),
    body('phone_number').optional().trim().isMobilePhone('any').withMessage('Invalid phone number'), // Validação flexível de telefone
    body('current_republic_id').optional().isUUID().withMessage('Invalid republic ID'),
    body('is_admin').optional().isBoolean().withMessage('is_admin must be a boolean'),
    body('status').optional().isIn(['active', 'inactive', 'banned']).withMessage('Invalid status value'),
    body('role').optional().isIn(['admin', 'user', 'resident']).withMessage('Invalid role value'), // Adiciona validação para role
  ],
  userController.updateUser
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Deleta um usuário (requer autenticação e, geralmente, ser o próprio usuário ou admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do usuário
 *     responses:
 *       204:
 *         description: Usuário deletado com sucesso (sem conteúdo)
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Não autorizado (não é o próprio usuário nem admin)
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.delete('/:id', authMiddleware.protect, userController.deleteUser);

// --- Rotas de Autenticação (Login/Logout) ---

/**
 * @swagger
 * /users/login:
 *  post:
 *      summary: Faz login do usuário (autenticação com Firebase) e retorna um JWT.
 *      tags: [Users]
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      required:
 *                          - email
 *                          - password
 *                      properties:
 *                          email:
 *                              type: string
 *                              format: email
 *                              description: Email do usuário.
 *                          password:
 *                              type: string
 *                              description: Senha do usuário.
 *      responses:
 *          200:
 *              description: Login bem-sucedido. Retorna o token JWT e os dados do usuário.
 *              content:
 *                  application/json:
 *                      schema:
 *                         type: object
 *                         properties:
 *                             status:
 *                                  type: string
 *                                  example: success
 *                             token:
 *                                 type: string
 *                                 description: Token JWT.
 *                             data:
 *                                 type: object
 *                                 properties:
 *                                     user:
 *                                         $ref: '#/components/schemas/User'
 *          400:
 *             description: Dados de entrada inválidos
 *          401:
 *              description: Credenciais inválidas (email ou senha incorretos, ou usuário não encontrado no Firebase).
 *          404:
 *              description: Usuário não encontrado no *banco de dados* (mas encontrado no Firebase).
 *          500:
 *              description: Erro interno do servidor.
 */
router.post(
  '/login',
  authMiddleware.login
);

/**
* @swagger
* /users/refresh-token:
*   post:
*     summary: Refreshes the JWT
*     tags: [Users]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: JWT Refreshed
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
*                   description: New JWT Token
*       401:
*         description: Unauthorized, token expired or invalid.
*       500:
*         description: Internal Server Error
*/
router.post('/refresh-token', authMiddleware.refreshToken);
/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Obtém os dados do usuário autenticado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/me', authMiddleware.protect, userController.getMe);
export default router;