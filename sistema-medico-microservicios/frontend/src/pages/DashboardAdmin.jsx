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
        const email = (item.Email || '').toLowerCase();
        const cedula = (item.Identificacion || '').toLowerCase(); // Incluimos cédula

        return nombreCompleto.includes(term) || email.includes(term) || cedula.includes(term);
    });

    // --- ACCIONES CORREGIDAS CON EL NUEVO MODAL ---
    const handleDeleteMedico = (id) => {
        showAlert(
            "PELIGRO",
            "¿Eliminar médico? Esta acción es irreversible y borrará el acceso.",
            "danger",
            async () => {
                const token = sessionStorage.getItem('token');
                const res = await fetch(`${API_URL}/api/core/admin/medicos/${id}`, {
                    method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.status === 409) {
                    // Si hay pacientes, abrimos el modal de reasignación
                    setModalReassign({ isOpen: true });
                } else if (res.ok) {
                    const medico = medicos.find(m => m.MedicoID === id);
                    // Borramos en Auth (SQL + Firebase)
                    await fetch(`${API_URL}/api/auth/users/${medico.UsuarioID}`, {
                        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
                    });
                    showAlert("¡Éxito!", "Médico eliminado permanentemente.", "success", cargarDatos);
                }
            },
            true,
            "Borrar todo"
        );
    };

    const handleDeletePaciente = (p) => {
        showAlert(
            "PELIGRO",
            `Se borrará permanentemente a ${p.Nombre}. ¿Deseas continuar?`,
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
                    showAlert("¡Éxito!", "Paciente eliminado correctamente.", "success", cargarDatos);
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

    const handleSaveUser = async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        const token = sessionStorage.getItem('token');
        const isMedico = modalUser.type === 'medico';
        const id = isMedico ? modalUser.data.MedicoID : modalUser.data.PacienteID;
        const usuarioId = modalUser.data.UsuarioID;

        try {
            // 1. Validar duplicados
            const resVal = await fetch(`${API_URL}/api/core/validate-registry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identificacion: data.identificacion,
                    licencia: isMedico ? data.licencia : null,
                    excludeUserId: usuarioId
                })
            });

            if (!resVal.ok) {
                const errVal = await resVal.json();
                return showAlert("Error de validación", errVal.message, "danger");
            }

            // 2. Actualizar Email en Auth (Si ha cambiado)
            if (data.email !== modalUser.data.Email) {
                const resAuth = await fetch(`${API_URL}/api/auth/users/${usuarioId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ email: data.email })
                });
                if (!resAuth.ok) throw new Error("Error al actualizar el correo");
            }

            // 3. Actualizar Perfil en Core
            const endpoint = isMedico ? `/api/core/admin/medicos/${id}` : `/api/core/pacientes/${id}`;

            // --- CORRECCIÓN DE PAYLOAD ---
            const payload = isMedico ? {
                nombre: data.nombre,
                apellido: data.apellido,
                identificacion: data.identificacion,
                especialidad: data.especialidad,
                licencia: data.licencia, // Cambiado de 'numeroLicencia' a 'licencia'
                telefono: data.telefono
            } : {
                nombre: data.nombre,
                apellido: data.apellido,
                identificacion: data.identificacion,
                fechaNacimiento: data.fechaNacimiento,
                telefono: data.telefono,
                medicoId: modalUser.data.MedicoID // Se mantiene el médico que ya tenía
            };

            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setModalUser({ isOpen: false, type: '', data: null });
                showAlert("¡Éxito!", "Los datos se han guardado correctamente.", "success", cargarDatos);
            } else {
                // Si el error es 500, intentamos ver qué dice el servidor
                const errorText = await res.text();
                console.error("Respuesta del servidor:", errorText);
                showAlert("Error del servidor", "Hubo un problema al actualizar los datos en la base de datos.", "danger");
            }

        } catch (error) {
            console.error("Error en handleSaveUser:", error);
            showAlert("Error Crítico", "No se pudo conectar con el servidor.", "danger");
        }
    };

    return (
        <div className="admin-layout">
            {/* SIDEBAR MODERNO */}
            <aside className="admin-sidebar">
                <div className="admin-brand">
                    <h1 className="logo-text">APOLO</h1>
                    <span className="brand-badge">ADMIN</span>
                </div>

                <div className="admin-profile">
                    <div className="avatar-circle">
                        <i className="fas fa-user-shield"></i>
                    </div>
                    <div className="profile-info">
                        <h3>Administrador</h3>
                        <p>Gestión del Sistema</p>
                    </div>
                </div>

                <nav className="admin-nav">
                    <button className={`nav-item ${tab === 'medicos' ? 'active' : ''}`} onClick={() => setTab('medicos')}>
                        <i className="fas fa-user-md"></i> <span>Médicos</span>
                    </button>
                    <button className={`nav-item ${tab === 'pacientes' ? 'active' : ''}`} onClick={() => setTab('pacientes')}>
                        <i className="fas fa-user-injured"></i> <span>Pacientes</span>
                    </button>
                    <div className="nav-spacer"></div>
                    <button className="nav-item logout" onClick={() => { sessionStorage.clear(); navigate('/'); }}>
                        <i className="fas fa-sign-out-alt"></i> <span>Cerrar Sesión</span>
                    </button>
                </nav>
            </aside>

            {/* CONTENIDO PRINCIPAL */}
            <main className="admin-main">
                <header className="admin-header">
                    <div className="header-title">
                        <h1>Panel de Gestión</h1>
                        <p>{tab === 'medicos' ? 'Administración de personal médico' : 'Control de pacientes registrados'}</p>
                    </div>
                    <div className="header-search">
                        <i className="fas fa-search"></i>
                        <input
                            type="text"
                            placeholder={`Buscar ${tab}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </header>

                <section className="admin-content">
                    <div className="content-card">
                        <div className="table-wrapper">
                            <table className="modern-table">
                                <thead>
                                    <tr>
                                        <th>Estado</th>
                                        <th>Nombre Completo</th>
                                        <th>Email</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* MAPEAMOS LOS DATOS FILTRADOS */}
                                    {filteredData.map(u => (
                                        <tr key={tab === 'medicos' ? u.MedicoID : u.PacienteID}>
                                            <td>
                                                <span className={`badge ${u.Activo ? 'badge-success' : 'badge-danger'}`}
                                                    onClick={!u.Activo ? () => handleUnlock(u.UsuarioID) : undefined}
                                                    style={{ cursor: u.Activo ? 'default' : 'pointer' }}>
                                                    {u.Activo ? 'Activo' : 'Bloqueado'}
                                                </span>
                                            </td>
                                            <td className="col-name">{u.Nombre} {u.Apellido}</td>
                                            <td className="col-email">{u.Email}</td>
                                            <td className="col-actions">
                                                <button className="action-btn edit" title="Editar" onClick={() => setModalUser({ isOpen: true, type: tab === 'medicos' ? 'medico' : 'paciente', data: u })}>
                                                    <i className="fas fa-pen"></i>
                                                </button>
                                                <button className="action-btn delete" title="Eliminar" onClick={() => tab === 'medicos' ? handleDeleteMedico(u.MedicoID) : handleDeletePaciente(u)}>
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* MENSAJE SI NO HAY RESULTADOS (Igual que en el médico) */}
                                    {filteredData.length === 0 && (
                                        <tr>
                                            <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#65676b' }}>
                                                No se encontraron {tab} que coincidan con "{searchTerm}"
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
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
                            {/* Busca esta parte en el modal de alerta de DashboardAdmin.jsx */}
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    if (alertConfig.onConfirm) alertConfig.onConfirm();
                                    closeAlert();
                                }}
                            >
                                {alertConfig.confirmText}
                            </button>

                            {/* Botón Cancelar: SIEMPRE GRIS */}
                            {alertConfig.showCancel && (
                                <button className="btn btn-danger" onClick={closeAlert}
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* MODAL EDICIÓN USUARIO */}
            {modalUser.isOpen && (
                <div className="modal-overlay">
                    <div className="modal-card">

                        {/* BOTÓN X PEQUEÑO EN LA ESQUINA SUPERIOR DERECHA */}
                        <button className="cerrar"
                            onClick={() => setModalUser({ isOpen: false, type: '', data: null })}
                            title="Cerrar"
                        >
                            <i className="fas fa-times"></i> {/* Usamos icono para que se vea más fino */}
                        </button>

                        {/* TÍTULO EN UNA SOLA LÍNEA Y EN AZUL */}
                        <div>
                            <h2 style={{
                                margin: 0,
                                fontSize: '20px',
                                color: '#1877f2',
                                fontWeight: '700',
                                whiteSpace: 'nowrap' // Evita que se divida en dos líneas
                            }}>
                                Editar {modalUser.type === 'medico' ? 'Médico' : 'Paciente'}
                            </h2>
                        </div>
                        <div className="separator"></div>

                        <form onSubmit={handleSaveUser} noValidate>
                            {/* Email - Campo crítico sincronizado con Firebase */}
                            <div className="field-container">
                                <label className="field-label">Email de acceso</label>
                                <input
                                    type="email"
                                    name="email"
                                    defaultValue={modalUser.data.Email}
                                    className="small-input"
                                    required
                                />
                            </div>

                            {/* Nombre y Apellido en una fila */}
                            <div className="form-row">
                                <div className="field-container">
                                    <label className="field-label">Nombre</label>
                                    <input name="nombre" className="small-input" required defaultValue={modalUser.data.Nombre} />
                                </div>
                                <div className="field-container">
                                    <label className="field-label">Apellido</label>
                                    <input name="apellido" className="small-input" required defaultValue={modalUser.data.Apellido} />
                                </div>
                            </div>

                            {/* Identificación */}
                            <div className="field-container">
                                <label className="field-label">Identificación (Cédula)</label>
                                <input name="identificacion" className="small-input" required defaultValue={modalUser.data.Identificacion} maxLength="10" />
                            </div>

                            {/* Campos Condicionales según el Tipo */}
                            {modalUser.type === 'medico' ? (
                                <div className="medico-extra-box">
                                    <div className="field-container">
                                        <label className="field-label">Especialidad Médica</label>
                                        <input name="especialidad" className="small-input" defaultValue={modalUser.data.Especialidad} />
                                    </div>
                                    <div className="field-container" style={{ marginBottom: 0 }}>
                                        <label className="field-label">Número de Licencia</label>
                                        <input name="licencia" className="small-input" defaultValue={modalUser.data.NumeroLicencia} maxLength="10" />
                                    </div>
                                </div>
                            ) : (
                                <div className="form-row">
                                    <div className="field-container">
                                        <label className="field-label">Fecha Nacimiento</label>
                                        <input
                                            type="date"
                                            name="fechaNacimiento"
                                            className="small-input"
                                            defaultValue={modalUser.data.FechaNacimiento?.split('T')[0]}
                                        />
                                    </div>
                                    <div className="field-container">
                                        <label className="field-label">Teléfono Celular</label>
                                        <input
                                            name="telefono" // <--- Asegúrate de que tenga este name
                                            className="small-input"
                                            defaultValue={modalUser.data.TelefonoContacto}
                                            maxLength="10"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Acciones del Modal */}
                            <div className="modal-actions-inline">
                                <button type="submit" className="btn btn-primary">
                                    Guardar cambios
                                </button>
                                <button
                                    type="button" className="btn btn-danger"
                                    onClick={() => setModalUser({ isOpen: false })}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DashboardAdmin;