const { getConnection, sql } = require('../config/db');

// --- CONSULTAS ---
const createConsulta = async (data) => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('PacienteID', sql.Int, data.pacienteId)
        .input('MedicoID', sql.Int, data.medicoId)
        .input('MotivoConsulta', sql.NVarChar, data.motivo)
        .input('Sintomas', sql.NVarChar, data.sintomas)
        .input('Diagnostico', sql.NVarChar, data.diagnostico)
        .input('Tratamiento', sql.NVarChar, data.tratamiento)
        .query(`
            INSERT INTO Consultas (PacienteID, MedicoID, MotivoConsulta, Sintomas, Diagnostico, Tratamiento)
            VALUES (@PacienteID, @MedicoID, @MotivoConsulta, @Sintomas, @Diagnostico, @Tratamiento)
        `);
    return result;
};

const getConsultasByPaciente = async (pacienteId) => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('PacienteID', sql.Int, pacienteId)
        .query('SELECT * FROM Consultas WHERE PacienteID = @PacienteID ORDER BY FechaConsulta DESC');
    return result.recordset;
};

// --- EXÁMENES ---
const createExamen = async (data) => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('ConsultaID', sql.Int, data.consultaId || null)
        .input('PacienteID', sql.Int, data.pacienteId)
        .input('TipoExamen', sql.NVarChar, data.tipo)
        .input('FechaRealizacion', sql.Date, data.fecha)
        .input('RutaArchivo', sql.NVarChar, data.rutaArchivo) // Por ahora guardaremos string (URL simulada)
        .input('Observaciones', sql.NVarChar, data.observaciones)
        .query(`
            INSERT INTO Examenes (ConsultaID, PacienteID, TipoExamen, FechaRealizacion, RutaArchivo, ObservacionesResultados)
            VALUES (@ConsultaID, @PacienteID, @TipoExamen, @FechaRealizacion, @RutaArchivo, @Observaciones)
        `);
    return result;
};

const getExamenesByPaciente = async (pacienteId) => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('PacienteID', sql.Int, pacienteId)
        .query('SELECT * FROM Examenes WHERE PacienteID = @PacienteID ORDER BY FechaRealizacion DESC');
    return result.recordset;
};

module.exports = { createConsulta, getConsultasByPaciente, createExamen, getExamenesByPaciente };