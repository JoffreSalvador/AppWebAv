import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import '../css/dashboard.css'; // Importamos tus estilos

function DashboardMedico() {
    const navigate = useNavigate();
    
    // Estados de Vista y Datos
    const [view, setView] = useState('pacientes'); // 'pacientes', 'detalle', 'chat'
    const [pacientes, setPacientes] = useState([]);
    const [selectedPaciente, setSelectedPaciente] = useState(null);
    const [historia, setHistoria] = useState({ consultas: [], examenes: [] });
    
    // Estado de Usuario (Médico)
    const [medico, setMedico] = useState({ nombre: '', id: null });

    // Estados para Modales
    const [modalConsulta, setModalConsulta] = useState({ isOpen: false, data: null }); // data != null es editar
    const [modalExamen, setModalExamen] = useState({ isOpen: false, data: null, consultaId: null });

    // Chat
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const ws = useRef(null);

    // 1. Verificar Sesión al cargar
    useEffect(() => {
        const token = sessionStorage.getItem('token');
        const rol = parseInt(sessionStorage.getItem('rolId'));
        const nombre = sessionStorage.getItem('email'); // O nombreUsuario si lo guardaste
        const id = sessionStorage.getItem('usuarioId');

        if (!token || rol !== 1) {
            navigate('/'); // Si no es médico, fuera
            return;
        }

        setMedico({ nombre, id });
        cargarPacientes();
    }, [navigate]);

    // 2. Cargar Pacientes (Core Service)
    const cargarPacientes = async () => {
        try {
            const token = sessionStorage.getItem('token');
            // Nota: Usamos el endpoint del Core Service
            const res = await fetch(`${API_URL}/api/core/pacientes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPacientes(data);
            }
        } catch (error) {
            console.error("Error cargando pacientes", error);
        }
    };

    // 3. Ver Historia Clínica (Clinical Service)
    const verHistoria = async (paciente) => {
        setSelectedPaciente(paciente);
        setView('detalle');
        
        try {
            const token = sessionStorage.getItem('token');
            const [resConsultas, resExamenes] = await Promise.all([
                fetch(`${API_URL}/api/clinical/paciente/${paciente.UsuarioID}/consultas`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/clinical/paciente/${paciente.UsuarioID}/examenes`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const consultas = await resConsultas.json();
            const examenes = await resExamenes.json();

            setHistoria({ consultas, examenes });
        } catch (error) {
            console.error("Error cargando historia", error);
        }
    };

    // 4. Lógica de Chat (WebSocket)
    useEffect(() => {
        if (view === 'chat') {
            // Conectar WS
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            // Asumimos que el Chat Service corre en el puerto 3004 (o a través del gateway si configuraste WS proxy)
            // Para desarrollo local directo al microservicio chat:
            ws.current = new WebSocket(`ws://localhost:3004`); 

            ws.current.onopen = () => console.log("Chat Conectado");
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
        const msg = {
            username: medico.nombre,
            text: chatInput,
            rol: 1
        };
        ws.current.send(JSON.stringify(msg));
        setChatInput('');
    };

    // 5. Guardar Consulta
    const handleGuardarConsulta = async (e) => {
        e.preventDefault();
        const form = e.target;
        const data = {
            pacienteId: selectedPaciente.UsuarioID,
            medicoId: medico.id, // Opcional si el backend lo saca del token
            motivo: form.motivo.value,
            sintomas: form.sintomas.value,
            diagnostico: form.diagnostico.value,
            tratamiento: form.tratamiento.value
        };

        const token = sessionStorage.getItem('token');
        // Aquí simplificamos: Solo CREAR por ahora (POST)
        const res = await fetch(`${API_URL}/api/clinical/consultas`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            setModalConsulta({ isOpen: false, data: null });
            verHistoria(selectedPaciente); // Recargar
        } else {
            alert("Error al guardar consulta");
        }
    };

    // Función auxiliar para calcular edad
    const calcularEdad = (fecha) => {
        if (!fecha) return '--';
        const hoy = new Date();
        const cumple = new Date(fecha);
        let edad = hoy.getFullYear() - cumple.getFullYear();
        const m = hoy.getMonth() - cumple.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;
        return edad;
    };

    const handleLogout = () => {
        sessionStorage.clear();
        navigate('/');
    };

    return (
        <div className="container">
            {/* SIDEBAR */}
            <aside className="sidebar">
                <div className="profile-section">
                    <div className="avatar">
                        <i className="fas fa-user-md"></i>
                    </div>
                    <h3>{medico.nombre}</h3>
                    <p>Médico</p>
                </div>
                <nav>
                    <button className={`nav-btn ${view === 'pacientes' || view === 'detalle' ? 'active' : ''}`} onClick={() => setView('pacientes')}>
                        <i className="fas fa-user-injured"></i> Pacientes
                    </button>
                    <button className={`nav-btn ${view === 'chat' ? 'active' : ''}`} onClick={() => setView('chat')}>
                        <i className="fas fa-comments"></i> Chat Global
                    </button>
                    <button className="nav-btn logout" onClick={handleLogout}>
                        <i className="fas fa-sign-out-alt"></i> Cerrar Sesión
                    </button>
                </nav>
            </aside>

            {/* MAIN CONTENT */}
            <main className="main-content">
                <header>
                    <h1>Dashboard Médico</h1>
                    <span>{new Date().toLocaleDateString()}</span>
                </header>

                {/* VISTA: LISTA DE PACIENTES */}
                {view === 'pacientes' && (
                    <section className="content-section">
                        <h2>Mis Pacientes</h2>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Identificación</th>
                                        <th>Nombre</th>
                                        <th>Edad</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pacientes.map(p => (
                                        <tr key={p.UsuarioID}>
                                            <td>{p.Identificacion || 'N/A'}</td>
                                            <td>{p.Nombre} {p.Apellido}</td>
                                            <td>{calcularEdad(p.FechaNacimiento)} años</td>
                                            <td>
                                                <button className="btn-primary btn-sm" onClick={() => verHistoria(p)}>
                                                    <i className="fas fa-eye"></i> Ver Historia
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {pacientes.length === 0 && <tr><td colSpan="4">No tienes pacientes asignados aún.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* VISTA: DETALLE HISTORIA */}
                {view === 'detalle' && selectedPaciente && (
                    <section className="content-section">
                        <button className="btn-secondary" onClick={() => setView('pacientes')} style={{marginBottom: '20px'}}>
                            <i className="fas fa-arrow-left"></i> Volver
                        </button>
                        
                        <div className="exam-card" style={{borderLeft: '4px solid var(--primary)'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <div>
                                    <h2 style={{margin: 0}}>{selectedPaciente.Nombre} {selectedPaciente.Apellido}</h2>
                                    <p style={{color: '#666', margin: 0}}>ID: {selectedPaciente.Identificacion}</p>
                                </div>
                                <button className="btn-primary" onClick={() => setModalConsulta({isOpen: true, data: null})}>
                                    <i className="fas fa-plus"></i> Nueva Consulta
                                </button>
                            </div>
                        </div>

                        <h3>Historial Clínico</h3>
                        {historia.consultas.map(c => (
                            <div key={c.ConsultaID} className="exam-card" style={{marginBottom: '20px'}}>
                                <small style={{color: '#666'}}>{new Date(c.FechaConsulta).toLocaleDateString()}</small>
                                <h3 style={{marginTop: '5px', color: 'var(--primary)'}}>{c.MotivoConsulta}</h3>
                                <p><strong>Dx:</strong> {c.Diagnostico}</p>
                                <p><strong>Tx:</strong> {c.Tratamiento}</p>
                                {c.Sintomas && <p><strong>Síntomas:</strong> {c.Sintomas}</p>}
                                
                                {/* Lista de Exámenes asociados (Filtrado simple en Frontend) */}
                                <div style={{marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #ccc'}}>
                                    <strong>Exámenes:</strong>
                                    <ul>
                                        {historia.examenes
                                            .filter(e => e.ConsultaID === c.ConsultaID) // Asumiendo que guardamos ConsultaID
                                            .map(e => (
                                                <li key={e.ExamenID}>{e.TipoExamen} - {e.ObservacionesResultados}</li>
                                            ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                        {historia.consultas.length === 0 && <p>No hay historial registrado.</p>}
                    </section>
                )}

                {/* VISTA: CHAT */}
                {view === 'chat' && (
                    <section className="content-section">
                        <h2>Chat Global</h2>
                        <div className="chat-container">
                            <div id="chatMessages">
                                {chatMessages.map((msg, i) => (
                                    <div key={i} className={`message-bubble ${msg.username === medico.nombre ? 'outgoing' : 'incoming'}`}>
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

            {/* MODAL CONSULTA */}
            {modalConsulta.isOpen && (
                <div className="modal active">
                    <div className="modal-content">
                        <span className="close-modal" onClick={() => setModalConsulta({isOpen: false, data: null})}>&times;</span>
                        <h2>Registrar Consulta</h2>
                        <form onSubmit={handleGuardarConsulta}>
                            <div className="form-group">
                                <label>Motivo</label>
                                <input name="motivo" required placeholder="Dolor de cabeza..." />
                            </div>
                            <div className="form-group">
                                <label>Síntomas</label>
                                <textarea name="sintomas" rows="2"></textarea>
                            </div>
                            <div className="form-group">
                                <label>Diagnóstico</label>
                                <input name="diagnostico" required />
                            </div>
                            <div className="form-group">
                                <label>Tratamiento</label>
                                <textarea name="tratamiento" rows="3" required></textarea>
                            </div>
                            <button type="submit" className="btn-primary" style={{width: '100%'}}>Guardar</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DashboardMedico;