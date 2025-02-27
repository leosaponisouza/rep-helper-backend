import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import dotenv from 'dotenv';

// Carrega variáveis de ambiente do arquivo .env
dotenv.config();

// Configuração do Firebase usando variáveis de ambiente
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Opcionalmente, você pode armazenar as credenciais em variáveis de ambiente também
// ou usar um sistema mais seguro de gerenciamento de secrets
async function getToken() {
  try {
    // Email e senha podem vir de variáveis de ambiente ou de outro lugar seguro
    const email = process.env.FIREBASE_AUTH_EMAIL || "sleo028@gmail.com";
    const password = process.env.FIREBASE_AUTH_PASSWORD || "teste123";
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    console.log(token); // Imprime o token no console
    return token;
  } catch (error) {
    console.error("Erro ao obter token:", error);
    return null; // Ou tratar o erro de outra forma
  }
}

getToken();