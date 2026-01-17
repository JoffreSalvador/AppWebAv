// frontend/src/pages/ResetPage.jsx
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verifyPasswordResetCode } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { API_URL } from '../config';
import '../css/styles.css';

function ResetPage() {
    const navigate = useNavigate();
    const query = new URLSearchParams(useLocation().search);
    const code = query.get('oobCode');

    // Estados
    const [showResetModal, setShowResetModal] = useState(false);
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(true);

    // --- ESTADOS PARA EL MODAL DE NOTIFICACIÓN ---
    const [notification, setNotification] = useState({
        show: false,
        title: "",
        text: "",
        type: "error", // "error" o "success"
        onConfirm: null
    });

    // Función auxiliar para mostrar el modal en lugar de alert
    const showAlert = (title, text, type = "error", action = null) => {
        setNotification({
            show: true,
            title,
            text,
            type,
            onConfirm: action
        });
    };

    useEffect(() => {
        if (code) {
            verifyPasswordResetCode(auth, code)
                .then((userEmail) => {
                    setEmail(userEmail);
                    setLoading(false);
                    setShowResetModal(true);
                })
                .catch(() => {
                    setLoading(false);
                    showAlert("Enlace inválido", "El enlace ha expirado o ya fue utilizado.", "error", () => navigate('/'));
                });
        } else {
            navigate('/');
        }
    }, [code, navigate]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());

        if (data.newPassword !== data.confirmPassword) {
            showAlert("Error de validación", "Las nuevas contraseñas no coinciden.");
            return;
        }

        if (data.newPassword.length < 6) {
            showAlert("Contraseña débil", "La nueva contraseña debe tener al menos 6 caracteres.");
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    currentPassword: data.currentPassword,
                    newPassword: data.newPassword
                })
            });

            const body = await res.json();
            if (res.ok) {
                showAlert("¡Éxito!", "Tu contraseña ha sido actualizada correctamente. Ya puedes iniciar sesión.", "success", () => navigate('/'));
            } else {
                showAlert("Error", body.message || "No se pudo actualizar la contraseña.");
            }
        } catch (err) {
            showAlert("Error de red", "No se pudo conectar con el servidor.");
        }
    };

    const closeNotification = () => {
        setNotification({ ...notification, show: false });
        if (notification.onConfirm) notification.onConfirm();
    };

    if (loading) return <div className="auth-wrapper"><h1>Verificando enlace...</h1></div>;

    return (
        <div className="auth-wrapper">
            {/* FORMULARIO DE RESTABLECIMIENTO */}
            {showResetModal && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <h1 style={{ color: '#1877f2', marginBottom: '10px' }}>APOLO</h1>
                        <h2>Restablecer contraseña</h2>
                        <p style={{marginBottom: '20px'}}>Cuenta: <b>{email}</b></p>
                        
                        <form onSubmit={handleUpdate}>
                            <div className="form-group">
                                <input type="password" name="currentPassword" placeholder="Contraseña actual" required />
                            </div>
                            <div className="form-group">
                                <input type="password" name="newPassword" placeholder="Nueva contraseña" required />
                            </div>
                            <div className="form-group">
                                <input type="password" name="confirmPassword" placeholder="Confirmar nueva contraseña" required />
                            </div>

                            <div className="modal-actions-inline">
                                <button className="btn btn-primary" type="submit" style={{flex: 1}}>Actualizar</button>
                                <button className="btn btn-danger" type="button" onClick={() => navigate('/')} style={{flex: 1, backgroundColor: '#767676'}}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL DE NOTIFICACIÓN (REEMPLAZA AL ALERT) --- */}
            {notification.show && (
                <div className="modal-overlay" style={{ zIndex: 1300 }}>
                    <div className="modal-card notification-modal">
                        <div className={notification.type === "success" ? "success-icon" : "error-icon"}>
                            {notification.type === "success" ? "✓" : "✕"}
                        </div>
                        <h2 style={{ color: notification.type === "success" ? "#42b72a" : "#dc2626" }}>
                            {notification.title}
                        </h2>
                        <p>{notification.text}</p>
                        <button className="btn btn-primary" onClick={closeNotification}>Aceptar</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ResetPage;