const express = require('express');
const router = express.Router();
const clinicalController = require('../controllers/clinicalController');
const verifyToken = require('../middleware/authMiddleware');

// Todas las rutas protegidas
router.use(verifyToken);

// Rutas de Consultas
router.post('/consultas', clinicalController.registerConsulta);
router.get('/paciente/:pacienteId/consultas', clinicalController.getHistoria);

// Rutas de Exámenes
router.post('/examenes', clinicalController.registerExamen);
router.get('/paciente/:pacienteId/examenes', clinicalController.getExamenes);

module.exports = router;