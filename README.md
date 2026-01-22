# HIS Apolo - Sistema de Gestión de Información de Salud

[![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Azure](https://img.shields.io/badge/Azure-Deployed-0078D4?logo=microsoft-azure&logoColor=white)](https://portal.azure.com/)
[![Security](https://img.shields.io/badge/Common_Criteria-FIA_%2F_FDP-red.svg)](#)

**HIS Apolo** es un Sistema de Información de Salud (HIS) simplificado, diseñado bajo el paradigma de microservicios y enfocado en el cumplimiento de los estándares internacionales de seguridad **Common Criteria (ISO/IEC 15408)**, específicamente en las clases **FIA (Identificación y Autenticación)** y **FDP (Protección de Datos)**.

El sistema permite la digitalización, almacenamiento y gestión eficiente de historiales médicos, citas y diagnósticos, garantizando la privacidad mediante cifrado asimétrico y auditoría forense inmutable.

## 🏗️ Arquitectura del Sistema

El sistema utiliza una arquitectura descentralizada de microservicios con el patrón **Database per Service**, implementado mediante el aislamiento de esquemas lógicos en **Azure SQL**.

### Componentes del Backend
- **`api-gateway/`**: Punto único de entrada (Puerto 3000). Gestiona la agregación de servicios, enrutamiento y políticas de CORS.
- **`auth-service/`**: Microservicio de Identidad (Puerto 3001). Implementa Login con MFA, registro de usuarios, re-autenticación y sincronización con Firebase.
- **`core-service/`**: Gestión de Perfiles (Puerto 3002). Administra la ficha base de médicos/pacientes, la transferencia de pacientes y la lógica administrativa.
- **`clinical-service/`**: Gestión de Historia Clínica (Puerto 3003). Maneja consultas y exámenes utilizando cifrado de datos en reposo.
- **`chat-service/`**: Mensajería Privada (Puerto 3004). Comunicación en tiemp
