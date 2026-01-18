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
    const [auditoria, setAuditoria] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Modales de datos
    const [modalUser, setModalUser] = useState({ isOpen: false, type: '', data: null });
    const [modalReassign, setModalReassign] = useState({ isOpen: false, pacientes: [], doctorIdToDelete: null });

    // --- NUEVO ESTADO PARA EL MODAL DE ALERT/CONFIRM ---
    const [alertConfig, setAlertConfig] = useState({
        isOpen: false, title: '', message: '', type: 'info', confirmText: 'Aceptar', onConfirm: null, showCancel: false
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
                // Si el backend envía auditoría, la guardamos
                setAuditoria(Array.isArray(data.auditoria) ? data.auditoria : []); 
            }
        } catch (err) { console.error(err); }
    };

    // --- LÓGICA DE SELECCIÓN DE FUENTE Y FILTRADO ---
    let source = [];
    if (tab === 'medicos') source = medicos;
    else if (tab === 'pacientes') source = pacientes;
    else source = auditoria; // <--- Fuente para auditoría

    const filteredData = source.filter(item => {
        const term = searchTerm.toLowerCase();
        
        // Lógica de filtrado específica para Auditoría
        if (tab === 'auditoria') {
            const accion = (item.Accion || '').toLowerCase();
            const email = (item.Email || '').toLowerCase();
            const nivel = (item.Nivel || '').toLowerCase();
            const servicio = (item.ServicioOrigen || '').toLowerCase();
            return accion.includes(term) || email.includes(term) || nivel.includes(term) || servicio.includes(term);
        }

        // Lógica existente para Médicos y Pacientes
        const nombreCompleto = `${item.Nombre} ${item.Apellido}`.toLowerCase();
        const email = (item.Email || '').toLowerCase();
        const cedula = (item.Identificacion || '').toLowerCase();
        const licencia = item.NumeroLicencia ? item.NumeroLicencia.toLowerCase() : '';

        return nombreCompleto.includes(term) || email.includes(term) || cedula.includes(term) || licencia.includes(term);
    });

    // --- HELPERS VISUALES PARA AUDITORÍA ---
    const formatDetalles = (jsonString) => {
        try {
            const obj = JSON.parse(jsonString);
            // Si es un objeto complejo (edición con antes/después), lo mostramos estructurado
            if (obj.cambios) {
                return (
                    <div style={{fontSize: '11px', lineHeight: '1.2'}}>
                        <div style={{color:'#d9534f'}}><strong>Ant:</strong> {JSON.stringify(obj.cambios.anterior).slice(0, 40)}...</div>
                        <div style={{color:'#28a745'}}><strong>Nue:</strong> {JSON.stringify(obj.cambios.nuevo).slice(0, 40)}...</div>
                    </div>
                );
            }
            // Si es mensaje simple o error
            return obj.mensaje || obj.motivo || obj.error || JSON.stringify(obj);
        } catch (e) {
            return jsonString; // Si no es JSON, mostrar tal cual
        }
    };

    const getNivelBadge = (nivel) => {
        switch (nivel) {
            case 'CRITICAL': return <span className="badge badge-danger">CRÍTICO</span>;
            case 'SECURITY': return <span className="badge" style={{background:'#6610f2', color:'white'}}>SEGURIDAD</span>;
            case 'WARNING': return <span className="badge" style={{background:'#ffc107', color:'black'}}>ALERTA</span>;
            case 'INFO': return <span className="badge" style={{background:'#17a2b8', color:'white'}}>INFO</span>;
            default: return <span className="badge">{nivel}</span>;
        }
    };

    // --- ACCIONES (Tu código original intacto) ---
    const handleDeleteMedico = (id) => {
        showAlert("¿Eliminar Médico?", "Esta acción eliminará el acceso del doctor al sistema de forma permanente.", "danger", async () => {
                const token = sessionStorage.getItem('token');
                const res = await fetch(`${API_URL}/api/core/admin/medicos/${id}`, {
                    method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.status === 409) {
                    const data = await res.json();
                    setModalReassign({ isOpen: true, pacientes: data.pacientes || [], doctorIdToDelete: id });
                } else if (res.ok) {
                    const medico = medicos.find(m => m.MedicoID === id);
                    if (medico) await fetch(`${API_URL}/api/auth/users/${medico.UsuarioID}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                    showAlert("¡Éxito!", "Médico eliminado correctamente.", "success", cargarDatos);
                }
            }, true, "Sí, eliminar");
    };

    const handleDeletePaciente = (p) => {
        showAlert("⚠️ ADVERTENCIA CRÍTICA", `Estás a punto de eliminar a ${p.Nombre} ${p.Apellido}. \n\nEsto borrará permanentemente:\n- Su historial clínico.\n- Todas sus consultas.\n- Sus exámenes y recetas.\n\n¿Estás seguro de continuar?`, "danger", async () => {
                const token = sessionStorage.getItem('token');
                const res = await fetch(`${API_URL}/api/core/admin/pacientes/${p.PacienteID}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                if (res.ok) {
                    await fetch(`${API_URL}/api/auth/users/${p.UsuarioID}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                    showAlert("¡Éxito!", "Paciente y su historial eliminados.", "success", cargarDatos);
                }
            }, true, "Sí, borrar historial y usuario");
    };

    const handleUnlock = (usuarioId) => {
        showAlert("Desbloquear cuenta", "¿Confirmas que deseas restablecer los intentos de esta cuenta?", "warning", async () => {
                const token = sessionStorage.getItem('token');
                const res = await fetch(`${API_URL}/api/core/admin/users/${usuarioId}/unlock`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
                if (res.ok) showAlert("Desbloqueada", "El usuario ya puede intentar loguearse.", "success", cargarDatos);
            }, true);
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
            const resVal = await fetch(`${API_URL}/api/core/validate-registry`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identificacion: data.identificacion, licencia: isMedico ? data.licencia : null, excludeUserId: usuarioId })
            });
            if (!resVal.ok) { const errVal = await resVal.json(); return showAlert("Error de validación", errVal.message, "danger"); }

            if (data.email !== modalUser.data.Email) {
                await fetch(`${API_URL}/api/auth/users/${usuarioId}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ email: data.email })
                });
            }

            const endpoint = isMedico ? `/api/core/admin/medicos/${id}` : `/api/core/pacientes/${id}`;
            const payload = isMedico ? {
                nombre: data.nombre, apellido: data.apellido, identificacion: data.identificacion, especialidad: data.especialidad, licencia: data.licencia, telefono: data.telefono
            } : {
                nombre: data.nombre, apellido: data.apellido, identificacion: data.identificacion, fechaNacimiento: data.fechaNacimiento, telefono: data.telefono, direccion: data.direccion, medicoId: data.medicoId
            };

            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload)
            });

            if (res.ok) {
                setModalUser({ isOpen: false, type: '', data: null });
                showAlert("¡Éxito!", "Los datos se han guardado correctamente.", "success", cargarDatos);
            } else { showAlert("Error", "No se pudo actualizar el perfil.", "danger"); }
        } catch (error) { showAlert("Error Crítico", "No se pudo conectar con el servidor.", "danger"); }
    };

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-brand"><h1 className="logo-text">APOLO</h1><span className="brand-badge">ADMIN</span></div>
                <div className="admin-profile">
                    <div className="avatar-circle"><i className="fas fa-user-shield"></i></div>
                    <div className="profile-info"><h3>Administrador</h3><p>Gestión del Sistema</p></div>
                </div>
                <nav className="admin-nav">
                    <button className={`nav-item ${tab === 'medicos' ? 'active' : ''}`} onClick={() => { setTab('medicos'); setSearchTerm(''); }}>
                        <i className="fas fa-user-md"></i> <span>Médicos</span>
                    </button>
                    <button className={`nav-item ${tab === 'pacientes' ? 'active' : ''}`} onClick={() => { setTab('pacientes'); setSearchTerm(''); }}>
                        <i className="fas fa-user-injured"></i> <span>Pacientes</span>
                    </button>
                    {/* --- NUEVO BOTÓN PARA AUDITORÍA --- */}
                    <button className={`nav-item ${tab === 'auditoria' ? 'active' : ''}`} onClick={() => { setTab('auditoria'); setSearchTerm(''); }}>
                        <i className="fas fa-list-alt"></i> <span>Auditoría</span>
                    </button>
                    
                    <div className="nav-spacer"></div>
                    <button className="nav-item logout" onClick={() => { sessionStorage.clear(); navigate('/'); }}>
                        <i className="fas fa-sign-out-alt"></i> <span>Cerrar Sesión</span>
                    </button>
                </nav>
            </aside>

            <main className="admin-main">
                <header className="admin-header">
                    <div className="header-title">
                        <h1>{tab === 'auditoria' ? 'Registro de Auditoría' : 'Panel de Gestión'}</h1>
                        <p>{tab === 'auditoria' ? 'Monitoreo de seguridad y cambios en el sistema' : `Administración de ${tab}`}</p>
                    </div>
                    <div className="header-search">
                        <i className="fas fa-search"></i>
                        <input type="text" placeholder={tab === 'auditoria' ? "Buscar por acción, usuario o nivel..." : "Buscar por cédula, nombre..."} 
                               value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </header>

                <section className="admin-content">
                    <div className="content-card">
                        <div className="table-wrapper">
                            <table className="modern-table">
                                <thead>
                                    <tr>
                                        {/* --- HEADER DINÁMICO: SI ES AUDITORÍA MUESTRA OTRAS COLUMNAS --- */}
                                        {tab === 'auditoria' ? (
                                            <>
                                                <th>Nivel</th>
                                                <th>Fecha/Hora</th>
                                                <th>Servicio</th>
                                                <th>Usuario</th>
                                                <th>Acción</th>
                                                <th style={{width: '35%'}}>Detalles</th>
                                            </>
                                        ) : (
                                            <>
                                                <th>Estado</th>
                                                <th>Identificación</th>
                                                <th>Nombre Completo</th>
                                                <th>Email</th>
                                                {tab === 'medicos' ? (
                                                    <><th>Especialidad</th><th>Licencia</th><th>Teléfono</th></>
                                                ) : (
                                                    <><th>Médico Asignado</th><th>Dirección</th><th>Teléfono</th></>
                                                )}
                                                <th>Acciones</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData.map((item, index) => (
                                        <tr key={tab === 'auditoria' ? item.LogID : (tab === 'medicos' ? item.MedicoID : item.PacienteID)}>
                                            {/* --- BODY DINÁMICO --- */}
                                            {tab === 'auditoria' ? (
                                                <>
                                                    <td>{getNivelBadge(item.Nivel)}</td>
                                                    <td style={{fontSize:'12px'}}>{new Date(item.FechaHora).toLocaleString()}</td>
                                                    <td style={{fontSize:'12px', fontWeight:'500'}}>{item.ServicioOrigen}</td>
                                                    <td style={{fontSize:'13px'}}>{item.Email || <span style={{color:'#999'}}>Sistema/Anon</span>}</td>
                                                    <td style={{fontWeight:'bold', color:'var(--primary)', fontSize:'13px'}}>{item.Accion}</td>
                                                    <td style={{fontSize:'12px', color:'#555'}}>{formatDetalles(item.Detalles)}</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td>
                                                        <span className={`badge ${item.Activo ? 'badge-success' : 'badge-danger'}`}
                                                            onClick={!item.Activo ? () => handleUnlock(item.UsuarioID) : undefined}
                                                            style={{ cursor: item.Activo ? 'default' : 'pointer' }}
                                                            title={!item.Activo ? "Clic para desbloquear" : ""}>
                                                            {item.Activo ? 'Activo' : 'Bloqueado'}
                                                        </span>
                                                    </td>
                                                    <td>{item.Identificacion}</td>
                                                    <td className="col-name">{item.Nombre} {item.Apellido}</td>
                                                    <td className="col-email">{item.Email}</td>
                                                    {tab === 'medicos' ? (
                                                        <><td>{item.Especialidad}</td><td>{item.NumeroLicencia}</td><td>{item.Telefono}</td></>
                                                    ) : (
                                                        <>
                                                            <td style={{color: '#1877f2', fontWeight: 500}}>
                                                                {item.NombreMedico ? `Dr. ${item.NombreMedico} ${item.ApellidoMedico}` : 'Sin Asignar'}
                                                            </td>
                                                            <td>{item.Direccion || '--'}</td>
                                                            <td>{item.TelefonoContacto}</td>
                                                        </>
                                                    )}
                                                    <td className="col-actions">
                                                        <button className="action-btn edit" title="Editar" onClick={() => setModalUser({ isOpen: true, type: tab === 'medicos' ? 'medico' : 'paciente', data: item })}><i className="fas fa-pen"></i></button>
                                                        <button className="action-btn delete" title="Eliminar" onClick={() => tab === 'medicos' ? handleDeleteMedico(item.MedicoID) : handleDeletePaciente(item)}><i className="fas fa-trash-alt"></i></button>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                    {filteredData.length === 0 && (
                                        <tr>
                                            <td colSpan={tab === 'auditoria' ? 6 : 8} style={{ textAlign: 'center', padding: '40px', color: '#65676b' }}>
                                                No se encontraron resultados para "{searchTerm}"
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </main>

            {/* MODALES SE MANTIENEN IGUALES */}
            {alertConfig.isOpen && (
                <div className="modal-overlay" style={{ zIndex: 3000 }}>
                    <div className="modal-card notification-modal">
                        <div className={`${alertConfig.type}-icon`}>{alertConfig.type === 'success' ? '✓' : alertConfig.type === 'danger' ? '✕' : '!'}</div>
                        <h2 className={alertConfig.type === 'danger' ? 'text-danger' : ''}>{alertConfig.title}</h2>
                        <p style={{whiteSpace: 'pre-line'}}>{alertConfig.message}</p>
                        <div className="modal-actions-inline">
                            <button className="btn btn-primary" onClick={() => { if (alertConfig.onConfirm) alertConfig.onConfirm(); closeAlert(); }}>{alertConfig.confirmText}</button>
                            {alertConfig.showCancel && <button className="btn btn-danger" onClick={closeAlert}>Cancelar</button>}
                        </div>
                    </div>
                </div>
            )}

            {modalUser.isOpen && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <button className="cerrar" onClick={() => setModalUser({ isOpen: false, type: '', data: null })}><i className="fas fa-times"></i></button>
                        <h2 style={{ margin: 0, color: '#1877f2', marginBottom: '15px' }}>Editar {modalUser.type === 'medico' ? 'Médico' : 'Paciente'}</h2>
                        <form onSubmit={handleSaveUser}>
                            <div className="field-container"><label className="field-label">Email de acceso</label><input type="email" name="email" defaultValue={modalUser.data.Email} className="small-input" required /></div>
                            <div className="form-row">
                                <div className="field-container"><label className="field-label">Nombre</label><input name="nombre" className="small-input" required defaultValue={modalUser.data.Nombre} /></div>
                                <div className="field-container"><label className="field-label">Apellido</label><input name="apellido" className="small-input" required defaultValue={modalUser.data.Apellido} /></div>
                            </div>
                            <div className="field-container"><label className="field-label">Identificación (Cédula)</label><input name="identificacion" className="small-input" required defaultValue={modalUser.data.Identificacion} maxLength="10" /></div>
                            {modalUser.type === 'medico' ? (
                                <div className="medico-extra-box">
                                    <div className="field-container"><label className="field-label">Especialidad</label><input name="especialidad" className="small-input" defaultValue={modalUser.data.Especialidad} /></div>
                                    <div className="field-container"><label className="field-label">Licencia</label><input name="licencia" className="small-input" defaultValue={modalUser.data.NumeroLicencia} /></div>
                                    <div className="field-container"><label className="field-label">Teléfono</label><input name="telefono" className="small-input" defaultValue={modalUser.data.Telefono} /></div>
                                </div>
                            ) : (
                                <>
                                    <div className="form-row">
                                        <div className="field-container"><label className="field-label">Fecha Nacimiento</label><input type="date" name="fechaNacimiento" className="small-input" defaultValue={modalUser.data.FechaNacimiento?.split('T')[0]} /></div>
                                        <div className="field-container"><label className="field-label">Teléfono</label><input name="telefono" className="small-input" defaultValue={modalUser.data.TelefonoContacto} /></div>
                                    </div>
                                    <div className="field-container"><label className="field-label">Dirección</label><input name="direccion" className="small-input" defaultValue={modalUser.data.Direccion} /></div>
                                    <div className="field-container" style={{background: '#f0f7ff', padding: '10px', borderRadius: '5px'}}>
                                        <label className="field-label" style={{color: '#1877f2'}}>Médico Asignado</label>
                                        <select name="medicoId" className="small-input" defaultValue={modalUser.data.MedicoID}>
                                            {medicos.map(m => <option key={m.MedicoID} value={m.MedicoID}>Dr. {m.Nombre} {m.Apellido} ({m.Especialidad})</option>)}
                                        </select>
                                    </div>
                                </>
                            )}
                            <div className="modal-actions-inline" style={{marginTop: '20px'}}>
                                <button type="submit" className="btn btn-primary">Guardar cambios</button>
                                <button type="button" className="btn btn-danger" onClick={() => setModalUser({ isOpen: false })}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modalReassign.isOpen && (
                <div className="modal-overlay" style={{ zIndex: 2100 }}>
                    <div className="modal-card">
                        <button className="cerrar" onClick={() => setModalReassign({ isOpen: false })}>×</button>
                        <h2 style={{color: '#dc3545'}}>Acción Requerida</h2>
                        <p>No se puede eliminar a este médico porque tiene los siguientes pacientes asignados:</p>
                        <div style={{maxHeight: '200px', overflowY: 'auto', background: '#f8f9fa', padding: '10px', margin: '10px 0', borderRadius: '5px'}}>
                            <ul style={{listStyle: 'none', padding: 0}}>
                                {modalReassign.pacientes.map(p => (
                                    <li key={p.PacienteID} style={{borderBottom: '1px solid #eee', padding: '5px 0'}}><strong>{p.Nombre} {p.Apellido}</strong> (ID: {p.Identificacion})</li>
                                ))}
                            </ul>
                        </div>
                        <div style={{background: '#fff3cd', padding: '10px', fontSize: '14px', color: '#856404', borderRadius: '4px'}}>
                            <i className="fas fa-exclamation-triangle"></i> Debes ir a la pestaña <strong>Pacientes</strong> y reasignarlos a otro doctor manualmente antes de poder eliminar a este médico.
                        </div>
                        <div className="modal-actions-inline" style={{marginTop: '15px'}}>
                            <button className="btn btn-primary" onClick={() => { setModalReassign({ isOpen: false }); setTab('pacientes'); }}>Ir a Pacientes</button>
                            <button className="btn btn-danger" onClick={() => setModalReassign({ isOpen: false })}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DashboardAdmin;