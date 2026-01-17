// frontend/src/pages/Register.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../config';
import '../css/styles.css';

function Register() {
  const [msg, setMsg] = useState('');
  const [msgColor, setMsgColor] = useState('#606770');
  const [isMedico, setIsMedico] = useState(false);
  const navigate = useNavigate();

  const handleRoleChange = (e) => {
    setIsMedico(e.target.value === 'medico');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('Procesando registro...');

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const rolId = data.role === 'medico' ? 1 : 2;

    try {
      // 1. Registrar en Auth y recibir el Token temporal
      const resAuth = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password, rolId })
      });

      const bodyAuth = await resAuth.json();
      if (!resAuth.ok) throw new Error(bodyAuth.message || 'Error al crear usuario.');

      const tokenTemporal = bodyAuth.token; // <--- Token recibido del registro
      const nuevoUsuarioId = bodyAuth.user.id;

      // 2. Crear Perfil en Core (Usando el token para evitar el 403)
      let profileUrl = rolId === 1 ? `${API_URL}/api/core/medicos` : `${API_URL}/api/core/pacientes`;

      const resProfile = await fetch(profileUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenTemporal}` // <--- Aquí pasamos el "permiso"
        },
        body: JSON.stringify({
          ...data,
          usuarioId: nuevoUsuarioId
        })
      });

      if (!resProfile.ok) throw new Error('Error al configurar el perfil.');

      // 3. Finalizar y mandar al Login
      setMsg('¡Cuenta creada! Redirigiendo al inicio de sesión...');
      setMsgColor('#42b72a');

      setTimeout(() => {
        navigate('/'); // Al llegar aquí y loguearse, saltará el 2FA
      }, 2000);

    } catch (err) {
      setMsg(err.message);
      setMsgColor('#dc2626');
    }
  };

  return (
    <div className="auth-wrapper">
      <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
        <h1 style={{ textAlign: 'center', color: 'var(--primary)', marginBottom: '20px' }}>APOLO</h1>
        <div className="card">
          <h2 style={{ marginTop: 0, marginBottom: '5px' }}>Crear cuenta nueva</h2>
          <p style={{ margin: '0 0 20px 0', color: '#606770' }}>Es rápido y fácil.</p>
          <div className="separator" style={{ marginTop: 0 }}></div>

          <div className="msg" style={{ color: msgColor, fontWeight: 'bold' }}>{msg}</div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <input type="text" name="nombre" placeholder="Nombre" required className="form-control" style={{ width: '100%' }} />
              <input type="text" name="apellido" placeholder="Apellido" required className="form-control" style={{ width: '100%' }} />
            </div>
            <div className="form-group">
              <input type="email" name="email" placeholder="Correo electrónico" required />
            </div>
            <div className="form-group">
              <input type="password" name="password" placeholder="Contraseña nueva" required minLength="6" />
            </div>
            {!isMedico && (
              <div className="form-group">
                <label style={{ fontSize: '12px', color: '#666' }}>Fecha de Nacimiento</label>
                <input type="date" name="fechaNacimiento" required />
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <input type="text" name="identificacion" placeholder="Identificación" required style={{ flex: 1 }} />
              <input type="tel" name="telefono" placeholder="Teléfono" style={{ flex: 1 }} />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '12px', color: '#606770' }}>¿Quién eres?</label>
              <select name="role" onChange={handleRoleChange} className="form-control">
                <option value="paciente">Paciente</option>
                <option value="medico">Médico</option>
              </select>
            </div>
            {isMedico && (
              <div className="prof-box">
                <input type="text" name="especialidad" placeholder="Especialidad" />
                <input type="text" name="numeroLicencia" placeholder="Licencia" />
              </div>
            )}
            <button type="submit" className="btn btn-success" style={{ width: '100%' }}>Registrarte</button>
          </form>
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <Link to="/">¿Ya tienes una cuenta?</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;