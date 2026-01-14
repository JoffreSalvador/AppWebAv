import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import '../css/dashboard.css';

function DashboardPaciente() {
    const navigate = useNavigate();
    const [view, setView] = useState('consultas'); // 'consultas', 'examenes', 'chat'
    const [paciente, setPaciente] = useState({ nombre: '', id: null });
    const [consultas, setConsultas] = useState([]);
    const [examenes, setExamenes] = useState([]);
    
    // Chat
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const ws = useRef(null);

    useEffect(() => {
        const token = sessionStorage.getItem('token');
        const rol = parseInt(sessionStorage.getItem('rolId'));
        const nombre = sessionStorage.getItem('email');
        const id = sessionStorage.getItem('usuarioId'); // Este es UsuarioID

        if (!token || rol !== 2) { // 2 = Paciente
            navigate('/');
            return;
        }

        setPaciente({ nombre, id });
        cargarDatos(id, token);
    }, [navigate]);

    const cargarDatos = async (id, token) => {
        try {
            const [resC, resE] = await Promise.all([
                fetch(`${API_URL}/api/clinical/paciente/${id}/consultas`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/clinical/paciente/${id}/examenes`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (resC.ok) setConsultas(await resC.json());
            if (resE.ok) setExamenes(await resE.json());

        } catch (error) {
            console.error("Error cargando datos", error);
        }
    };

    // Chat Logic (Igual que médico)
    useEffect(() => {
        if (view === 'chat') {
            ws.current = new WebSocket(`ws://localhost:3004`); 
            ws.current.onmessage = (e) => {
                const msg = JSON.parse(e.data);
                setChatMessages(prev => [...prev, msg]);
            };
        } else {
            if (ws.current) ws.current.close();
        }
    }, [view]);

    const enviarMensaje = () => {
        if (!chatInput.trim() || !ws.current) return;
        const msg = { username: paciente.nombre, text: chatInput, rol: 2 };
        ws.current.send(JSON.stringify(msg));
        setChatInput('');
    };

    const handleLogout = () => {
        sessionStorage.clear();
        navigate('/');
    };

    return (
        <div className="container">
            <aside className="sidebar">
                <div className="profile-section">
                    <div className="avatar"><i className="fas fa-user"></i></div>
                    <h3>{paciente.nombre}</h3>
                    <p>Paciente</p>
                </div>
                <nav>
                    <button className={`nav-btn ${view === 'consultas' ? 'active' : ''}`} onClick={() => setView('consultas')}>
                        <i className="fas fa-stethoscope"></i> Mis Consultas
                    </button>
                    <button className={`nav-btn ${view === 'examenes' ? 'active' : ''}`} onClick={() => setView('examenes')}>
                        <i className="fas fa-file-medical"></i> Mis Exámenes
                    </button>
                    <button className={`nav-btn ${view === 'chat' ? 'active' : ''}`} onClick={() => setView('chat')}>
                        <i className="fas fa-comments"></i> Chat Global
                    </button>
                    <button className="nav-btn logout" onClick={handleLogout}>
                        <i className="fas fa-sign-out-alt"></i> Cerrar Sesión
                    </button>
                </nav>
            </aside>

            <main className="main-content">
                <header>
                    <h1>Mi Historial Médico</h1>
                    <span>{new Date().toLocaleDateString()}</span>
                </header>

                {view === 'consultas' && (
                    <section className="content-section">
                        <h2>Historial de Consultas</h2>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Motivo</th>
                                        <th>Diagnóstico</th>
                                        <th>Tratamiento</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {consultas.map(c => (
                                        <tr key={c.ConsultaID}>
                                            <td>{new Date(c.FechaConsulta).toLocaleDateString()}</td>
                                            <td>{c.MotivoConsulta}</td>
                                            <td>{c.Diagnostico}</td>
                                            <td>{c.Tratamiento}</td>
                                        </tr>
                                    ))}
                                    {consultas.length === 0 && <tr><td colSpan="4">No tienes consultas.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {view === 'examenes' && (
                    <section className="content-section">
                        <h2>Mis Exámenes</h2>
                        <div className="dashboard-stats" style={{display: 'flex', flexWrap: 'wrap', gap: '20px'}}>
                            {examenes.map(e => (
                                <div key={e.ExamenID} className="exam-card" style={{width: '300px'}}>
                                    <h3>{e.TipoExamen}</h3>
                                    <p><strong>Fecha:</strong> {new Date(e.FechaRealizacion).toLocaleDateString()}</p>
                                    <p>{e.ObservacionesResultados}</p>
                                </div>
                            ))}
                        </div>
                        {examenes.length === 0 && <p>No hay exámenes registrados.</p>}
                    </section>
                )}

                {view === 'chat' && (
                    <section className="content-section">
                        <h2>Chat Global</h2>
                        <div className="chat-container">
                            <div id="chatMessages">
                                {chatMessages.map((msg, i) => (
                                    <div key={i} className={`message-bubble ${msg.username === paciente.nombre ? 'outgoing' : 'incoming'}`}>
                                        <span className="msg-sender">{msg.username}</span>
                                        {msg.text}
                                    </div>
                                ))}
                            </div>
                            <div className="chat-input-area">
                                <input 
                                    type="text" 
                                    value={chatInput} 
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder="Escribe..." 
                                />
                                <button className="btn-primary" onClick={enviarMensaje}>
                                    <i className="fas fa-paper-plane"></i>
                                </button>
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}

export default DashboardPaciente;