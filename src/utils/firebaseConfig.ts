import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config(); // Carrega as variáveis de ambiente do .env

// Verificação de segurança APRIMORADA:
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.error("ERRO: A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida!");
  console.error("Verifique se você configurou o arquivo .env corretamente.");
  process.exit(1); // Encerra o processo com um código de erro
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} catch (error) {
  console.error("ERRO: Falha ao analisar a variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY.");
  console.error("Verifique se o JSON no seu .env está formatado corretamente (aspas duplas, etc.).");
  console.error("Erro original:", error); // Mostra o erro original do JSON.parse
  process.exit(1); // Encerra o processo
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export { admin };