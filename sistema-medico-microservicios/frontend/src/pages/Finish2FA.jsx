import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { auth } from "../firebaseConfig";

// En el useEffect de esta página:
if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem('emailForSignIn');
    
    signInWithEmailLink(auth, email, window.location.href)
      .then((result) => {
        // ¡ÉXITO! El correo es válido. 
        // Ahora sí, recuperamos los datos temporales y entramos a la APP
        const body = JSON.parse(window.localStorage.getItem('tempUserData'));
        
        sessionStorage.setItem('token', 'TOKEN_GENERADO'); // Aquí pides tu JWT real
        navigate('/dashboard-medico'); // O el que corresponda
      });
}