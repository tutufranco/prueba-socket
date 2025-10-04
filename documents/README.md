# 📚 DOCUMENTACIÓN COMPLETA - WebSocket Gateway

## 🎯 DESCRIPCIÓN GENERAL

Este sistema de WebSocket Gateway está diseñado para manejar la comunicación en tiempo real entre pasajeros y conductores en una aplicación de viajes compartidos. Utiliza NestJS con Socket.IO para proporcionar una API robusta y escalable.

---

## 📋 DOCUMENTOS DISPONIBLES

### 1. 📱 [PASAJERO_EVENTOS.md](./PASAJERO_EVENTOS.md)
**Documentación completa de eventos para pasajeros**
- Eventos de conexión y datos iniciales
- Envío de ubicación
- Reporte de incidentes
- Cancelación de viajes
- Envío de mensajes
- Obtener lista de mensajes
- Estados del viaje
- Ejemplos de implementación

### 2. 🚗 [CONDUCTOR_EVENTOS.md](./CONDUCTOR_EVENTOS.md)
**Documentación completa de eventos para conductores**
- Eventos de conexión y datos iniciales
- Envío de ubicación (básico y con progresión)
- Reporte de incidentes
- Envío de mensajes
- Cancelación de viajes
- Diferencias entre tipos de eventos de ubicación
- Flujo típico de un viaje

### 3. 📋 [INTERFACES_TIPOS.md](./INTERFACES_TIPOS.md)
**Documentación de interfaces y tipos de datos**
- Estructura de datos principal
- Estados del viaje (TripStatusV2)
- Perfiles de usuario
- Ubicación y paradas
- Pago y filtros
- Incidentes y mensajes
- Eventos de WebSocket
- Funciones helper

### 4. 🚀 [GUIA_IMPLEMENTACION.md](./GUIA_IMPLEMENTACION.md)
**Guía completa de implementación**
- Configuración inicial
- Conexión WebSocket
- Implementación de cliente (JavaScript/React Native)
- Ejemplos prácticos
- Testing con Postman
- Manejo de errores
- Mejores prácticas

### 5. 🔌 [INTEGRACION.md](./INTEGRACION.md)
**Guía de integración para diferentes plataformas**
- Requisitos previos
- Instalación y configuración
- Integración en Web (React, Vue, Angular)
- Integración en React Native
- Integración en Flutter/Dart
- Manejo de errores y testing
- Deployment en producción

### 6. 🔄 [FLUJO_COMPLETO.md](./FLUJO_COMPLETO.md)
**Documentación del flujo completo del sistema**
- Arquitectura general del sistema
- Flujo de conexión y autenticación
- Flujo completo de viaje
- Flujo de mensajes e incidentes
- Flujo de ubicación
- Diagramas de secuencia
- Casos de uso detallados

### 7. 📱 [FLUTTER_PASAJERO.md](./FLUTTER_PASAJERO.md)
**Implementación completa para app Flutter de pasajero**
- Configuración inicial y dependencias
- Servicio WebSocket y servicio de pasajero
- Modelos de datos completos
- Pantallas y UI (Viaje, Chat)
- Ejemplos de código funcionales
- Gestión de estado y streams

### 8. 🚗 [FLUTTER_CONDUCTOR.md](./FLUTTER_CONDUCTOR.md)
**Implementación completa para app Flutter de conductor**
- Configuración inicial y dependencias
- Servicio WebSocket y servicio de conductor
- Servicio de ubicación con tracking automático
- Modelos de datos completos
- Pantallas y UI (Conductor, Progreso)
- Diferencias clave con app de pasajero
- Manejo de dos tipos de ubicación

### 9. 🚕 [ASIGNACION_VIAJES.md](./ASIGNACION_VIAJES.md)
**Sistema de asignación de viajes**
- Flujo completo de asignación
- Eventos: trip-available, trip-accept, trip-reject
- Implementación en servidor (envío a conductor específico o broadcast)
- Implementación completa en Flutter con UI
- Sistema de expiración automática (30 segundos)
- Pantalla de viaje disponible con temporizador
- Testing y ejemplos de uso

---

## 🔌 CONEXIÓN RÁPIDA

### URL de Conexión
```
ws://localhost:3000/events
```

### Eventos Principales
- **Pasajero:** `get-trip-p-on`, `location-p-send`, `trip-incident-p-send`, `trip-message-p-send`, `get-messages-incidents`
- **Conductor:** `get-trip-d-on`, `driver-location`, `trip-incident-d-send`, `trip-message-d-send`, `trip-available`, `trip-accept`, `trip-reject`
- **Compartidos:** `send-change-trip`, `trip-incident-p-on`, `trip-message-p-on`, `all-messages`

---

## 🚀 INICIO RÁPIDO

### 1. Instalar Dependencias
```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io @nestjs/event-emitter
```

### 2. Iniciar Servidor
```bash
npm run start:dev
```

### 3. Conectar Cliente
```javascript
import io from 'socket.io-client';
const socket = io('ws://localhost:3000/events');
```

### 4. Escuchar Eventos
```javascript
socket.on('get-trip-p-on', (data) => {
  console.log('Datos del viaje:', data);
});
```

---

## 📊 CARACTERÍSTICAS PRINCIPALES

### ✅ **Funcionalidades Implementadas**
- ✅ Conexión automática con datos iniciales
- ✅ Envío de ubicación para pasajeros y conductores
- ✅ Progresión automática de estados del viaje
- ✅ Reporte de incidentes con contadores
- ✅ Sistema de mensajería completo con contadores
- ✅ Obtener lista completa de mensajes (`all-messages`)
- ✅ **Sistema de asignación de viajes** (nuevo)
- ✅ **Envío de viajes disponibles a conductores** (nuevo)
- ✅ **Aceptación/Rechazo de viajes** (nuevo)
- ✅ **Expiración automática de ofertas** (30 segundos) (nuevo)
- ✅ Cancelación de viajes
- ✅ Reconexión automática con datos acumulados
- ✅ Estados del viaje con representación textual
- ✅ Broadcast de ubicaciones en tiempo real

### 🔄 **Flujo de Estados del Viaje**
```
idle → searching → driverFound → driverAccepted → 
driverOnWay → driverArrived → tripStarted → 
tripInProgress → tripCompleted
```

### 📱 **Eventos por Rol**

#### Pasajero
- `get-trip-p-on` - Datos iniciales
- `location-p-send` - Enviar ubicación
- `trip-incident-p-send` - Reportar incidente
- `trip-message-p-send` - Enviar mensaje
- `trip-cancel-p-send` - Cancelar viaje

#### Conductor
- `get-trip-d-on` - Datos iniciales
- `driver-location` - Ubicación con progresión
- `location-d-send` - Ubicación básica
- `trip-incident-d-send` - Reportar incidente
- `trip-cancel-d-send` - Cancelar viaje

---

## 🧪 TESTING

### Con Postman
1. Abrir Postman
2. Crear WebSocket Request
3. URL: `ws://localhost:3000/events`
4. Enviar eventos según la documentación

### Con Cliente JavaScript
```javascript
// Ver ejemplos en GUIA_IMPLEMENTACION.md
const passenger = new PassengerClient();
const driver = new DriverClient();
```

---

## 📁 ESTRUCTURA DEL PROYECTO

```
src/socket/
├── socket.gateway.ts    # Gateway principal
├── const.ts            # Constantes de eventos
├── interface.ts        # Interfaces y tipos
└── helpers.ts          # Funciones helper

documents/
├── README.md                    # Este archivo
├── PASAJERO_EVENTOS.md         # Eventos de pasajero
├── CONDUCTOR_EVENTOS.md        # Eventos de conductor
├── INTERFACES_TIPOS.md         # Interfaces y tipos
└── GUIA_IMPLEMENTACION.md      # Guía de implementación
```

---

## 🔧 CONFIGURACIÓN

### Variables de Entorno
```env
PORT=3000
NODE_ENV=development
```

### Dependencias Principales
```json
{
  "@nestjs/websockets": "^10.0.0",
  "@nestjs/platform-socket.io": "^10.0.0",
  "socket.io": "^4.7.0",
  "@nestjs/event-emitter": "^2.0.0"
}
```

---

## 📞 SOPORTE

### Problemas Comunes
1. **Error de conexión:** Verificar que el servidor esté ejecutándose
2. **Eventos no llegan:** Verificar el namespace `/events`
3. **Datos incorrectos:** Revisar el formato de los payloads

### Logs del Servidor
```bash
npm run start:dev
# Los logs aparecerán en la consola
```

---

## 🎯 PRÓXIMOS PASOS

1. **Revisar la documentación específica** según tu rol (pasajero/conductor)
2. **Implementar el cliente** siguiendo los ejemplos
3. **Probar la conectividad** con Postman
4. **Integrar en tu aplicación** usando las mejores prácticas

---

## 📚 REFERENCIAS

- [Documentación NestJS WebSockets](https://docs.nestjs.com/websockets/gateways)
- [Documentación Socket.IO](https://socket.io/docs/)
- [Testing WebSocket con Postman](https://learning.postman.com/docs/sending-requests/websocket/)

---

**¡Listo para implementar! 🚀**

Revisa la documentación específica según tus necesidades y comienza a integrar el sistema de WebSocket en tu aplicación.
