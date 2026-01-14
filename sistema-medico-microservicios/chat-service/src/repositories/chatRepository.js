const { getConnection, sql } = require('../config/db');

const saveMessage = async (data) => {
    try {
        const pool = await getConnection();
        
        // Ajustamos los inputs a tu tabla real
        await pool.request()
            // Como el frontend aún no manda userId en el socket, 
            // ponemos 0 temporalmente para que no falle el NOT NULL.
            .input('UsuarioID', sql.Int, data.userId || 0) 
            .input('NombreUsuario', sql.NVarChar, data.username)
            .input('Contenido', sql.NVarChar, data.text)
            .input('RolID', sql.Int, data.rol) 
            .query(`
                INSERT INTO Mensajes (UsuarioID, NombreUsuario, Contenido, RolID, FechaEnvio)
                VALUES (@UsuarioID, @NombreUsuario, @Contenido, @RolID, GETDATE())
            `);
    } catch (error) {
        console.error('Error guardando mensaje en SQL:', error);
    }
};

const getRecentMessages = async () => {
    try {
        const pool = await getConnection();
        
        // Seleccionamos las columnas correctas
        const result = await pool.request().query(`
            SELECT TOP 50 NombreUsuario, Contenido, RolID, FechaEnvio
            FROM Mensajes
            ORDER BY FechaEnvio ASC
        `);
        
        // Mapeamos los resultados de la BD (NombreUsuario/Contenido) 
        // a lo que espera el Frontend (username/text)
        return result.recordset.map(row => ({
            username: row.NombreUsuario,
            text: row.Contenido,
            rol: row.RolID,
            timestamp: new Date(row.FechaEnvio).toLocaleTimeString()
        }));
    } catch (error) {
        console.error('Error recuperando historial:', error);
        return [];
    }
};

module.exports = { saveMessage, getRecentMessages };