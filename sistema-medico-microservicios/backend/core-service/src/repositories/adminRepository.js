// core-service/src/repositories/adminRepository.js
const { getConnection, sql } = require('../config/db');

const getAllMedicos = async () => {
    const pool = await getConnection();
    const result = await pool.request().query(`
        SELECT 
            m.*, 
            u.Email,
            u.Activo 
        FROM core.Medicos m
        INNER JOIN auth.Usuarios u ON m.UsuarioID = u.UsuarioID
    `);
    return result.recordset; 
};

const getAllPacientes = async () => {
    const pool = await getConnection();
    const result = await pool.request().query(`
        SELECT 
            p.*, 
            u.Email,
            u.Activo,
            m.Nombre as NombreMedico, 
            m.Apellido as ApellidoMedico
        FROM core.Pacientes p
        INNER JOIN auth.Usuarios u ON p.UsuarioID = u.UsuarioID
        LEFT JOIN core.Medicos m ON p.MedicoID = m.MedicoID
    `);
    return result.recordset; 
};

// Validar si la licencia ya existe en OTRO médico
const checkLicense = async (licencia, excludeId) => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('Licencia', sql.NVarChar, licencia)
        .input('ExcludeID', sql.Int, excludeId)
        .query('SELECT COUNT(*) as Count FROM core.Medicos WHERE NumeroLicencia = @Licencia AND MedicoID != @ExcludeID');
    return result.recordset[0].Count > 0;
};

const updateMedico = async (id, data) => {
    const pool = await getConnection();
    await pool.request()
        .input('ID', sql.Int, id)
        .input('Nombre', sql.NVarChar, data.nombre)
        .input('Apellido', sql.NVarChar, data.apellido)
        .input('Identificacion', sql.NVarChar, data.identificacion)
        .input('Especialidad', sql.NVarChar, data.especialidad)
        .input('Licencia', sql.NVarChar, data.licencia)
        .input('Telefono', sql.NVarChar, data.telefono)
        .query('UPDATE core.Medicos SET Nombre=@Nombre, Apellido=@Apellido, Identificacion=@Identificacion, Especialidad=@Especialidad, NumeroLicencia=@Licencia, Telefono=@Telefono WHERE MedicoID=@ID');
};

const getPatientsByMedico = async (medicoId) => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('MedicoID', sql.Int, medicoId)
        .query('SELECT * FROM core.Pacientes WHERE MedicoID = @MedicoID');
    return result.recordset;
};

const deleteMedico = async (id) => {
    const pool = await getConnection();
    await pool.request().input('ID', sql.Int, id).query('DELETE FROM core.Medicos WHERE MedicoID = @ID');
};

const deletePaciente = async (id) => {
    const pool = await getConnection();
    
    // 1. Obtenemos el UsuarioID antes de borrar el perfil, 
    // lo necesitamos para borrar también sus mensajes de chat.
    const userRes = await pool.request()
        .input('ID', sql.Int, id)
        .query('SELECT UsuarioID FROM core.Pacientes WHERE PacienteID = @ID');
        
    // Si el paciente ya no existe, salimos
    if (userRes.recordset.length === 0) return;
    
    const usuarioId = userRes.recordset[0].UsuarioID;

    // 2. Iniciamos una TRANSACCIÓN. 
    // Esto asegura que se borre TODO o NADA. Si falla algo, no deja datos a medias.
    const transaction = new sql.Transaction(pool);
    
    try {
        await transaction.begin();
        const request = new sql.Request(transaction);
        
        request.input('PacienteID', sql.Int, id);
        request.input('UsuarioID', sql.Int, usuarioId);

        // --- PASO A: Limpiar DB_Clinical ---
        // Primero Exámenes (por si tienen FK a Consultas)
        await request.query(`
            DELETE FROM clinical.Examenes 
            WHERE PacienteID = @PacienteID
        `);

        // Luego Consultas (Diagnósticos, Tratamientos)
        await request.query(`
            DELETE FROM clinical.Consultas 
            WHERE PacienteID = @PacienteID
        `);

        // --- PASO B: Limpiar DB_Chat ---
        // Borramos mensajes enviados POR él o PARA él
        await request.query(`
            DELETE FROM chat.Mensajes 
            WHERE UsuarioID = @UsuarioID OR ReceptorID = @UsuarioID
        `);

        // --- PASO C: Limpiar DB_Core ---
        // Finalmente borramos el perfil del paciente
        await request.query(`
            DELETE FROM core.Pacientes 
            WHERE PacienteID = @PacienteID
        `);

        // Si todo salió bien, aplicamos los cambios
        await transaction.commit();

    } catch (error) {
        // Si algo falló, deshacemos todo
        await transaction.rollback();
        throw error; // Lanzamos el error para que el controller lo detecte
    }
};

const unlockUser = async (usuarioId) => {
    const pool = await getConnection();
    await pool.request()
        .input('ID', sql.Int, usuarioId)
        .query(`
            UPDATE auth.Usuarios 
            SET Activo = 1, IntentosFallidos = 0 
            WHERE UsuarioID = @ID
        `);
};

const getAuditLogs = async () => {
    const pool = await getConnection();
    // Traemos los últimos 100 eventos para no saturar la vista
    // Hacemos LEFT JOIN con Usuarios para ver el Email en vez de solo el ID
    const result = await pool.request().query(`
        SELECT TOP 100 
            L.LogID,
            L.FechaHora,
            L.ServicioOrigen,
            L.Nivel,
            L.IPOrigen,
            L.Accion,
            L.Detalles,
            L.UsuarioID,
            U.Email
        FROM logs.Auditoria L
        LEFT JOIN auth.Usuarios U ON L.UsuarioID = U.UsuarioID
        ORDER BY L.FechaHora DESC
    `);
    return result.recordset;
};

module.exports = { getAllMedicos, getAllPacientes, checkLicense, updateMedico, getPatientsByMedico, deleteMedico, deletePaciente, unlockUser, getAuditLogs };