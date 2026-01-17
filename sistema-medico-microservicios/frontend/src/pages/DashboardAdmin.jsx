// src/pages/DashboardAdmin.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import '../css/dashboard.css';

function DashboardAdmin() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('medicos');
    const [medicos, setMedicos] = useState([]);
    const [pacientes, setPacientes] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Modales de datos
    const [modalUser, setModalUser] = useState({ isOpen: false, type: '', data: null });
    const [modalReassign, setModalReassign] = useState({ isOpen: false });

    // --- NUEVO ESTADO PARA EL MODAL DE ALERT/CONFIRM ---
    const [alertConfig, setAlertConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info', // 'danger' | 'success' | 'warning'
        confirmText: 'Aceptar',
        onConfirm: null,
        showCancel: false
    });

    // Función para abrir el nuevo modal de forma fácil
    const showAlert = (title, message, type = 'info', onConfirm = null, showCancel = false, confirmText = 'Aceptar') => {
        setAlertConfig({ isOpen: true, title, message, type, onConfirm, showCancel, confirmText });
    };

    const closeAlert = () => setAlertConfig({ ...alertConfig, isOpen: false });

    // --- CARGA DE DATOS ---
    useEffect(() => {
        const rol = parseInt(sessionStorage.getItem('rolId'));
        if (rol !== 3) { navigate('/'); return; } 
        cargarDatos();
    }, [navigate]);

    const cargarDatos = async () => {
        const token = sessionStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/core/admin/all`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setMedicos(Array.isArray(data.medicos) ? data.medicos : []);
                setPacientes(Array.isArray(data.pacientes) ? data.pacientes : []);
            }
        } catch (err) { console.error(err); }
    };

    const source = tab === 'medicos' ? medicos : pacientes;
    const filteredData = source.filter(item => {
        const term = searchTerm.toLowerCase();
        const nombreCompleto = `${item.Nombre} ${item.Apellido}`.toLowerCase();
        return nombreCompleto.includes(term) || (item.Email && item.Email.toLowerCase().includes(term));
    });

    // --- ACCIONES CORREGIDAS CON EL NUEVO MODAL ---

    const handleDeleteMedico = (id) => {
        showAlert(
            "¿Eliminar médico?", 
            "Esta acción es irreversible y borrará el acceso en Firebase y SQL.", 
            "danger", 
            async () => {
                const token = sessionStorage.getItem('token');
                const res = await fetch(`${API_URL}/api/core/admin/medicos/${id}`, {
                    method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.status === 409) {
                    setModalReassign({ isOpen: true });
                } else if (res.ok) {
                    const medico = medicos.find(m => m.MedicoID === id);
                    await fetch(`${API_URL}/api/auth/users/${medico.UsuarioID}`, { 
                        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } 
                    });
                    showAlert("Médico eliminado", "La cuenta ha sido borrada con éxito.", "success", cargarDatos);
                }
            }, 
            true, // Mostrar botón cancelar
            "Eliminar"
        );
    };

    const handleDeletePaciente = (p) => {
        showAlert(
            "CUIDADO", 
            `Se borrará permanentemente a ${p.Nombre}. 
            ¿Deseas continuar?`, 
            "danger", 
            async () => {
                const token = sessionStorage.getItem('token');
                const res = await fetch(`${API_URL}/api/core/admin/pacientes/${p.PacienteID}`, {
                    method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    await fetch(`${API_URL}/api/auth/users/${p.UsuarioID}`, { 
                        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } 
                    });
                    showAlert("Éxito", "Paciente y registros eliminados.", "success", cargarDatos);
                }
            }, 
            true,
            "Borrar todo"
        );
    };

    const handleUnlock = (usuarioId) => {
        showAlert(
            "Desbloquear cuenta", 
            "¿Confirmas que deseas restablecer los intentos de esta cuenta?", 
            "warning", 
            async () => {
                const token = sessionStorage.getItem('token');
                const res = await fetch(`${API_URL}/api/core/admin/users/${usuarioId}/unlock`, {
                    method: 'PUT', headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) showAlert("Desbloqueada", "El usuario ya puede intentar loguearse.", "success", cargarDatos);
            }, 
            true
        );
    };

    return (
        <div className="container">
            {/* Sidebar y Main Content (Igual que antes) */}
            <aside className="sidebar">
                <div className="profile-section">
                    <div className="avatar"><i className="fas fa-user-shield"></i></div>
                    <h3>Administrador</h3>
                    <p>Gestión del Sistema</p>
                </div>
                <nav>
                    <button className={`nav-btn ${tab === 'medicos' ? 'active' : ''}`} onClick={() => setTab('medicos')}><i className="fas fa-user-md"></i> Médicos</button>
                    <button className={`nav-btn ${tab === 'pacientes' ? 'active' : ''}`} onClick={() => setTab('pacientes')}><i className="fas fa-user-injured"></i> Pacientes</button>
                    <button className="nav-btn logout" onClick={() => { sessionStorage.clear(); navigate('/'); }}><i className="fas fa-sign-out-alt"></i> Salir</button>
                </nav>
            </aside>

            <main className="main-content">
                <header><h1>Panel de Administración</h1></header>
                <section className="content-section">
                    <div className="section-header">
                        <h2>{tab === 'medicos' ? 'Médicos' : 'Pacientes'} Registrados</h2>
                        <input type="text" placeholder="Buscar..." className="search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr><th>ID</th><th>Estado</th><th>Nombre</th><th>Email</th><th style={{textAlign:'right'}}>Acciones</th></tr>
                            </thead>
                            <tbody>
                                {filteredData.map(u => (
                                    <tr key={tab === 'medicos' ? u.MedicoID : u.PacienteID}>
                                        <td>{tab === 'medicos' ? u.MedicoID : u.PacienteID}</td>
                                        <td>
                                            {u.Activo ? <span style={{color:'green'}}><i className="fas fa-check-circle"></i> Activo</span> : 
                                            <button className="btn-danger-icon" style={{padding:'2px 8px', fontSize:'11px'}} onClick={() => handleUnlock(u.UsuarioID)}>BLOQUEADO</button>}
                                        </td>
                                        <td style={{fontWeight:'bold'}}>{u.Nombre} {u.Apellido}</td>
                                        <td>{u.Email}</td> 
                                        <td style={{textAlign:'right'}}>
                                            <div style={{display:'flex', gap:'5px', justifyContent:'flex-end'}}>
                                                <button className="btn-icon" onClick={() => setModalUser({isOpen: true, type: tab === 'medicos' ? 'medico' : 'paciente', data: u})}><i className="fas fa-edit"></i></button>
                                                <button className="btn-danger-icon" onClick={() => tab === 'medicos' ? handleDeleteMedico(u.MedicoID) : handleDeletePaciente(u)}><i className="fas fa-trash"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>

            {/* --- MODAL DE ALERTA / CONFIRMACIÓN PROFESIONAL --- */}
{alertConfig.isOpen && (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
        <div className="modal-card notification-modal">
            {/* Icono dinámico */}
            <div className={`${alertConfig.type}-icon`}>
                {alertConfig.type === 'success' ? '✓' : alertConfig.type === 'danger' ? '✕' : ''}
            </div>
            
            {/* Título dinámico (Ej: PELIGRO en rojo) */}
           <h2 className={alertConfig.type === 'danger' ? 'text-danger' : ''}>
                {alertConfig.title}
            </h2>
            
            <p>{alertConfig.message}</p>
            
            <div className="modal-actions-inline">
                {/* Botón Principal: SIEMPRE AZUL (como "Aceptar") */}
                <button 
                    className="btn btn-primary" 
                    style={{ flex: 1 }}
                    onClick={() => {
                        if (alertConfig.onConfirm) alertConfig.onConfirm();
                        closeAlert();
                    }}
                >
                    {alertConfig.confirmText}
                </button>

                {/* Botón Cancelar: SIEMPRE GRIS */}
                {alertConfig.showCancel && (
                    <button 
                        className="btn btn-danger" 
                        style={{ flex: 1 }} 
                        onClick={closeAlert}
                    >
                        Cancelar
                    </button>
                )}
            </div>
        </div>
    </div>
)}
            {/* Mantener Modal de Edición igual que antes... */}
        </div>
    );
}

export default DashboardAdmin;