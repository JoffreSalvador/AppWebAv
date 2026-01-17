// src/controllers/profileController.js
const profileRepo = require('../repositories/profileRepository');

const createMedicoProfile = async (req, res) => {
    try {
        const { id } = req.user; 
        // CAMBIO AQUÍ: Cambiamos 'licencia' por 'numeroLicencia' para que coincida con el input
        const { nombre, apellido, identificacion, especialidad, numeroLicencia, telefono } = req.body;

        if (!numeroLicencia) {
            return res.status(400).json({ message: "El número de licencia es obligatorio para médicos." });
        }

        // Pasamos numeroLicencia al repositorio (asegúrate que el repo use este nombre o cámbialo allí también)
        await profileRepo.createMedico({ 
            usuarioId: id, 
            nombre, 
            apellido, 
            identificacion, 
            especialidad, 
            licencia: numeroLicencia, 
            telefono 
        });
        
        res.status(201).json({ message: 'Perfil de médico creado' });
    } catch (error) {
        console.error("Error en createMedicoProfile:", error);
        res.status(500).json({ message: 'Error al crear perfil de médico' });
    }
};

const getMyPacientes = async (req, res) => {
    try {
        const { id } = req.user; // ID del Usuario (Medico)
        const pacientes = await profileRepo.getPacientesByMedico(id);
        res.json(pacientes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener pacientes' });
    }
};

const createPacienteProfile = async (req, res) => {
    try {
        const { id } = req.user; // Viene del token
        const { nombre, apellido, fechaNacimiento, identificacion, telefono } = req.body;

        await profileRepo.createPaciente({ 
            usuarioId: id, 
            nombre, 
            apellido, 
            fechaNacimiento, 
            identificacion, 
            telefono 
        });
        res.status(201).json({ message: 'Perfil de paciente creado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al crear perfil de paciente' });
    }
};

const getMyProfile = async (req, res) => {
    try {
        const usuarioId = req.user.id; 
        const rolId = req.user.rol; // Extraído del Token
        
        let perfil;
        if (rolId === 1) {
            perfil = await profileRepo.getMedicoByUsuarioId(usuarioId);
        } else {
            perfil = await profileRepo.getPacienteByUsuarioId(usuarioId);
        }
        
        if (perfil) {
            res.json(perfil);
        } else {
            res.status(404).json({ message: "Perfil no encontrado" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al obtener el perfil" });
    }
};

const getMedicosList = async (req, res) => {
    try {
        const medicos = await profileRepo.getAllMedicos();
        res.json(medicos);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener médicos' });
    }
};

const updatePacienteProfile = async (req, res) => {
    try {
        const { id } = req.params; // ID del paciente a editar
        // data trae: nombre, apellido, medicoId, alergias, etc.
        await profileRepo.updatePaciente(id, req.body);
        res.json({ message: 'Paciente actualizado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar paciente' });
    }
};

const validateRegistryData = async (req, res) => {
    try {
        const { identificacion, licencia, excludeUserId } = req.body;
        
        if (!identificacion) {
            return res.status(400).json({ message: "La identificación es obligatoria." });
        }

        const result = await profileRepo.checkUniqueData(identificacion, licencia, excludeUserId || 0);
        
        if (result.exists) {
            // Devolvemos 409 Conflict para que el frontend detecte el error
            return res.status(409).json({ 
                message: `El ${result.field} ya se encuentra registrado en nuestro sistema.` 
            });
        }

        res.status(200).json({ message: 'Datos disponibles' });
    } catch (error) {
        console.error("Error en validateRegistryData:", error);
        res.status(500).json({ message: 'Error interno al validar los datos.' });
    }
};

module.exports = { createMedicoProfile, getMyPacientes, createPacienteProfile, getMyProfile, getMedicosList, updatePacienteProfile, validateRegistryData };