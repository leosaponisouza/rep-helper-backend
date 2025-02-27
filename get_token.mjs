// get_token.js
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

// Sua configuração do Firebase (a que você usa no frontend!)
const firebaseConfig = {
    apiKey: "AIzaSyAYZpzOE0ucf3EmUbYI26Aaybfm4c-xdqc",
    authDomain: "a090922.firebaseapp.com",
    databaseURL: "https://a090922-default-rtdb.firebaseio.com",
    projectId: "a090922",
    storageBucket: "a090922.firebasestorage.app",
    messagingSenderId: "11954158708",
    appId: "1:11954158708:web:8ba15b4bc6d94bf6a4a521"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function getToken() {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, "sleo028@gmail.com", "teste123"); // Substitua com email/senha REAIS
    const token = await userCredential.user.getIdToken();
    console.log(token); // Imprime o token no console
    return token;
  } catch (error) {
    console.error("Erro ao obter token:", error);
    return null; // Ou tratar o erro de outra forma
  }
}

getToken();