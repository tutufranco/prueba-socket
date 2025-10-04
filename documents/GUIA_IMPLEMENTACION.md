# 🚀 GUÍA DE IMPLEMENTACIÓN - WebSocket Gateway

## 📋 ÍNDICE
1. [Configuración Inicial](#configuración-inicial)
2. [Conexión WebSocket](#conexión-websocket)
3. [Implementación Cliente](#implementación-cliente)
4. [Ejemplos Prácticos](#ejemplos-prácticos)
5. [Testing con Postman](#testing-con-postman)
6. [Manejo de Errores](#manejo-de-errores)
7. [Mejores Prácticas](#mejores-prácticas)

---

## 🔧 CONFIGURACIÓN INICIAL

### Instalación de Dependencias
```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install @nestjs/event-emitter
```

### Configuración del Gateway
```typescript
// src/socket/socket.gateway.ts
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/events',
})
export class ChatGateway {
  @WebSocketServer() server: Server;
  // ... implementación
}
```

### Configuración del Módulo
```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ChatGateway } from './socket/socket.gateway';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    // ... otros imports
  ],
  providers: [ChatGateway],
})
export class AppModule {}
```

---

## 🔌 CONEXIÓN WEBSOCKET

### URL de Conexión
```
ws://localhost:3000/events
```

### Cliente JavaScript (Socket.IO)
```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:3000/events', {
  transports: ['websocket'],
  autoConnect: true
});

// Eventos de conexión
socket.on('connect', () => {
  console.log('✅ Conectado al servidor');
});

socket.on('disconnect', () => {
  console.log('❌ Desconectado del servidor');
});

socket.on('connect_error', (error) => {
  console.error('❌ Error de conexión:', error);
});
```

### Cliente React Native
```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:3000/events', {
  transports: ['websocket'],
  timeout: 20000,
});

// Manejo de reconexión automática
socket.on('reconnect', (attemptNumber) => {
  console.log(`🔄 Reconectado después de ${attemptNumber} intentos`);
});
```

---

## 👤 IMPLEMENTACIÓN CLIENTE - PASAJERO

### Conexión y Datos Iniciales
```javascript
class PassengerClient {
  constructor() {
    this.socket = io('ws://localhost:3000/events');
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Recibir datos iniciales del viaje
    this.socket.on('get-trip-p-on', (tripData) => {
      console.log('📱 Datos del viaje:', tripData);
      this.handleTripData(tripData);
    });

    // Recibir cambios de estado
    this.socket.on('send-change-trip', (tripChange) => {
      console.log('🔄 Estado del viaje:', tripChange);
      this.handleTripChange(tripChange);
    });

    // Recibir ubicación del conductor
    this.socket.on('driver-location-update', (location) => {
      console.log('📍 Ubicación del conductor:', location);
      this.updateDriverLocation(location);
    });

    // Recibir incidentes
    this.socket.on('trip-incident-p-on', (incident) => {
      console.log('⚠️ Incidente reportado:', incident);
      this.handleIncident(incident);
    });

    // Recibir mensajes
    this.socket.on('trip-message-p-on', (message) => {
      console.log('💬 Mensaje recibido:', message);
      this.handleMessage(message);
    });
  }

  // Enviar ubicación
  sendLocation(lat, lon) {
    this.socket.emit('location-p-send', {
      lat: lat,
      lon: lon,
      timestamp: Date.now()
    });
  }

  // Reportar incidente
  reportIncident(message) {
    this.socket.emit('trip-incident-p-send', {
      message: message
    });
  }

  // Enviar mensaje
  sendMessage(message) {
    this.socket.emit('trip-message-p-send', {
      message: message
    });
  }

  // Cancelar viaje
  cancelTrip(reason) {
    this.socket.emit('trip-cancel-p-send', {
      reason: reason
    });
  }
}
```

---

## 🚗 IMPLEMENTACIÓN CLIENTE - CONDUCTOR

### Conexión y Datos Iniciales
```javascript
class DriverClient {
  constructor() {
    this.socket = io('ws://localhost:3000/events');
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Recibir datos iniciales del viaje
    this.socket.on('get-trip-d-on', (tripData) => {
      console.log('🚗 Datos del viaje:', tripData);
      this.handleTripData(tripData);
    });

    // Recibir cambios de estado
    this.socket.on('send-change-trip', (tripChange) => {
      console.log('🔄 Estado del viaje:', tripChange);
      this.handleTripChange(tripChange);
    });

    // Recibir ubicación del pasajero
    this.socket.on('passenger-location-update', (location) => {
      console.log('📍 Ubicación del pasajero:', location);
      this.updatePassengerLocation(location);
    });

    // Recibir incidentes
    this.socket.on('trip-incident-p-on', (incident) => {
      console.log('⚠️ Incidente reportado:', incident);
      this.handleIncident(incident);
    });

    // Recibir mensajes
    this.socket.on('trip-message-p-on', (message) => {
      console.log('💬 Mensaje recibido:', message);
      this.handleMessage(message);
    });
  }

  // Enviar ubicación básica
  sendLocation(lat, lon) {
    this.socket.emit('location-d-send', {
      lat: lat,
      lon: lon,
      timestamp: Date.now()
    });
  }

  // Enviar ubicación con progresión de estado
  sendLocationWithProgress(lat, lon) {
    this.socket.emit('driver-location', {
      lat: lat,
      lon: lon,
      timestamp: Date.now()
    });
  }

  // Reportar incidente
  reportIncident(message) {
    this.socket.emit('trip-incident-d-send', {
      message: message
    });
  }

  // Cancelar viaje
  cancelTrip(reason) {
    this.socket.emit('trip-cancel-d-send', {
      reason: reason
    });
  }
}
```

---

## 📱 EJEMPLOS PRÁCTICOS

### Ejemplo 1: Flujo Completo de Viaje
```javascript
// Pasajero solicita viaje
const passenger = new PassengerClient();

// Conductor se conecta
const driver = new DriverClient();

// Pasajero envía ubicación
passenger.sendLocation(-34.6037, -58.3816);

// Conductor envía ubicación (avanza estado)
driver.sendLocationWithProgress(-34.6037, -58.3816);
// Estado cambia a: driverOnWay

// Conductor continúa enviando ubicación
driver.sendLocationWithProgress(-34.6040, -58.3820);
// Estado cambia a: driverArrived

// Conductor inicia viaje
driver.sendLocationWithProgress(-34.6045, -58.3825);
// Estado cambia a: tripStarted

// Viaje en progreso
driver.sendLocationWithProgress(-34.6050, -58.3830);
// Estado cambia a: tripInProgress

// Finalizar viaje
driver.sendLocationWithProgress(-34.6083, -58.3712);
// Estado cambia a: tripCompleted
```

### Ejemplo 2: Manejo de Incidentes
```javascript
// Pasajero reporta incidente
passenger.reportIncident("El conductor no llegó al punto de encuentro");

// Todos los clientes reciben:
// 1. trip-incident-p-on con el incidente
// 2. send-change-trip con incident_number incrementado

// Conductor responde al incidente
driver.reportIncident("Problema mecánico en el vehículo");

// Nuevamente todos reciben ambos eventos
```

### Ejemplo 3: Cancelación de Viaje
```javascript
// Pasajero cancela
passenger.cancelTrip("Cambio de planes");

// Estado cambia a: tripCancelled
// Todos los clientes reciben: send-change-trip

// O conductor cancela
driver.cancelTrip("Emergencia familiar");

// Estado cambia a: tripCancelledByDriver
```

---

## 🧪 TESTING CON POSTMAN

### Configuración de WebSocket en Postman
1. Abrir Postman
2. Crear nueva WebSocket Request
3. URL: `ws://localhost:3000/events`
4. Conectar

### Eventos para Probar

#### 1. Conexión (Automática)
```json
// Al conectar, recibirás automáticamente:
// - get-trip-p-on (datos para pasajero)
// - get-trip-d-on (datos para conductor)
```

#### 2. Enviar Ubicación (Pasajero)
```json
{
  "event": "location-p-send",
  "data": {
    "lat": -34.6037,
    "lon": -58.3816,
    "timestamp": 1704123456789
  }
}
```

#### 3. Enviar Ubicación (Conductor)
```json
{
  "event": "driver-location",
  "data": {
    "lat": -34.6037,
    "lon": -58.3816,
    "timestamp": 1704123456789
  }
}
```

#### 4. Reportar Incidente
```json
{
  "event": "trip-incident-p-send",
  "data": {
    "message": "Problema con el conductor"
  }
}
```

#### 5. Cancelar Viaje
```json
{
  "event": "trip-cancel-p-send",
  "data": {
    "reason": "Cambio de planes"
  }
}
```

---

## ⚠️ MANEJO DE ERRORES

### Errores de Conexión
```javascript
socket.on('connect_error', (error) => {
  console.error('Error de conexión:', error);
  // Implementar lógica de reconexión
  setTimeout(() => {
    socket.connect();
  }, 5000);
});
```

### Errores de Eventos
```javascript
socket.on('error', (error) => {
  console.error('Error del socket:', error);
});

// Para eventos específicos con callback
socket.emit('location-p-send', data, (response) => {
  if (response.success) {
    console.log('Ubicación enviada correctamente');
  } else {
    console.error('Error al enviar ubicación:', response.message);
  }
});
```

### Validación de Datos
```javascript
function validateLocationData(data) {
  if (!data.lat || !data.lon) {
    throw new Error('Latitud y longitud son requeridas');
  }
  if (data.lat < -90 || data.lat > 90) {
    throw new Error('Latitud inválida');
  }
  if (data.lon < -180 || data.lon > 180) {
    throw new Error('Longitud inválida');
  }
  return true;
}
```

---

## 🎯 MEJORES PRÁCTICAS

### 1. Reconexión Automática
```javascript
class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.connect();
  }

  connect() {
    this.socket = io(this.url);
    
    this.socket.on('connect', () => {
      console.log('Conectado');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      console.log('Desconectado');
      this.handleReconnect();
    });
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reintentando conexión (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, 5000 * this.reconnectAttempts);
    }
  }
}
```

### 2. Manejo de Estado
```javascript
class TripStateManager {
  constructor() {
    this.currentState = null;
    this.listeners = [];
  }

  updateState(newState) {
    this.currentState = newState;
    this.notifyListeners(newState);
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  notifyListeners(state) {
    this.listeners.forEach(callback => callback(state));
  }
}
```

### 3. Logging y Debugging
```javascript
class WebSocketLogger {
  static log(event, data) {
    console.log(`[${new Date().toISOString()}] ${event}:`, data);
  }

  static error(event, error) {
    console.error(`[${new Date().toISOString()}] ERROR ${event}:`, error);
  }
}

// Uso
socket.emit('location-p-send', data);
WebSocketLogger.log('location-p-send', data);
```

### 4. Limpieza de Recursos
```javascript
class WebSocketClient {
  destroy() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// En React
useEffect(() => {
  const client = new WebSocketClient();
  
  return () => {
    client.destroy();
  };
}, []);
```

---

## 📚 RECURSOS ADICIONALES

- **Documentación Socket.IO:** https://socket.io/docs/
- **Documentación NestJS WebSockets:** https://docs.nestjs.com/websockets/gateways
- **Testing WebSocket con Postman:** https://learning.postman.com/docs/sending-requests/websocket/

---

## 🔧 COMANDOS ÚTILES

### Iniciar el servidor
```bash
npm run start:dev
```

### Compilar TypeScript
```bash
npm run build
```

### Ejecutar tests
```bash
npm run test
```

### Linting
```bash
npm run lint
```

---

## 📞 SOPORTE

Para dudas o problemas:
1. Revisar los logs del servidor
2. Verificar la conexión WebSocket
3. Validar el formato de los datos enviados
4. Consultar la documentación de interfaces
