// routes/auth.routes.ts
import express from 'express';
import * as authMiddleware from '../middleware/auth.middleware';
import { body } from 'express-validator';

const router = express.Router();

/**
 * @swagger
 * /auth/login:
 *  post:
 *      summary: Faz login do usuário com token do Firebase e retorna um JWT.
 *      tags: [Auth]
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      required:
 *                          - firebaseToken
 *                      properties:
 *                          firebaseToken:
 *                              type: string
 *                              description: Token de ID do Firebase.
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
 *              description: Token do Firebase inválido ou expirado.
 *          404:
 *              description: Usuário não encontrado no banco de dados.
 *          500:
 *              description: Erro interno do servidor.
 */
router.post(
  '/login',
  [
    body('firebaseToken').notEmpty().withMessage('Token do Firebase é obrigatório')
  ],
  authMiddleware.login
);

/**
* @swagger
* /auth/refresh-token:
*   post:
*     summary: Atualiza o token JWT
*     tags: [Auth]
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - token
*             properties:
*               token:
*                 type: string
*                 description: Token JWT atual
*     responses:
*       200:
*         description: Token atualizado com sucesso
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
*                   description: Novo token JWT
*       401:
*         description: Não autorizado, token expirado ou inválido.
*       500:
*         description: Erro interno do servidor
*/
router.post(
  '/refresh-token',
  [
    body('token').notEmpty().withMessage('Token JWT atual é obrigatório')
  ],
  authMiddleware.refreshToken
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Realiza o logout do usuário
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Logout realizado com sucesso
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro interno do servidor
 */
router.post(
  '/logout',
  authMiddleware.protect,
  (req, res) => {
    res.status(200).json({
      status: 'success',
      message: 'Logout realizado com sucesso'
    });
  }
);

export default router;