import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API do Meu App de Repúblicas',
      version: '1.0.0',
      description: 'Documentação da API para gerenciar usuários, repúblicas e residentes.',
      contact: {
        name: 'Seu Nome',
        email: 'seu.email@example.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1', // URL base da sua API (ajuste conforme necessário)
        description: 'Servidor de Desenvolvimento',
      },
      // Adicione outros servidores (staging, produção) se necessário
    ],
    components: {
      securitySchemes: {
        bearerAuth: { // Define o esquema de segurança (JWT)
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }], // Aplica a segurança globalmente (todas as rotas exigem JWT)
  },
  apis: ['./src/routes/*.ts', './src/models/*.ts'], // Caminhos para os arquivos com os comentários JSDoc
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;