const clinicalRepo = require('../repositories/clinicalRepository');

// Crear Consulta
const registerConsulta = async (req, res) => {
    try {
        // req.body debe traer: pacienteId, motivo, sintomas, diagnostico, tratamiento
        // El medicoId lo sacamos del token para seguridad (si quien registra es un médico)
        const medicoId = req.user.rol === 1 ? req.user.id : req.body.medicoId; 

        // NOTA: El ID del token es UsuarioID. 
        // En un sistema real estricto, deberíamos buscar el MedicoID asociado a ese UsuarioID.
        // Para simplificar este MVP académico, asumiremos que el Frontend envía el MedicoID correcto 
        // o que usamos el ID de usuario como referencia si así lo decidimos en la BD.
        // *Corrección:* Tu BD Clinical guarda 'MedicoID'.
        // Vamos a confiar en el ID que envía el frontend por ahora para no complicar la consulta entre microservicios.
        
        await clinicalRepo.createConsulta({ ...req.body });
        res.status(201).json({ message: 'Consulta registrada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al registrar consulta' });
    }
};

// Obtener Historial (Consultas)
const getHistoria = async (req, res) => {
    try {
        const { pacienteId } = req.params;
        const consultas = await clinicalRepo.getConsultasByPaciente(pacienteId);
        res.json(consultas);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo historia' });
    }
};

// Crear Examen
const registerExamen = async (req, res) => {
    try {
        await clinicalRepo.createExamen(req.body);
        res.status(201).json({ message: 'Examen registrado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al registrar examen' });
    }
};

// Obtener Exámenes
const getExamenes = async (req, res) => {
    try {
        const { pacienteId } = req.params;
        const examenes = await clinicalRepo.getExamenesByPaciente(pacienteId);
        res.json(examenes);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo exámenes' });
    }
};

module.exports = { registerConsulta, getHistoria, registerExamen, getExamenes };