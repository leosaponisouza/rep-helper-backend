import app from './app';
import dotenv from 'dotenv';
import pool from './utils/db';

dotenv.config();

const PORT = process.env.PORT || 3000;

// Teste de conexão com o banco de dados antes de iniciar o servidor
pool.connect()
  .then(() => {
    console.log('Connected to the database!');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error connecting to the database:', err);
    process.exit(1); // Encerra o processo em caso de erro de conexão
  });
  