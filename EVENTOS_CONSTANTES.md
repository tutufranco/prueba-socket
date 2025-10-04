# 📡 Constantes de Eventos del Socket

## 📂 Archivo: `src/socket/const.ts`

Este archivo centraliza todos los nombres de eventos del sistema de WebSockets, evitando errores de tipeo y facilitando el mantenimiento.

---

## 🎯 Ventajas de Usar Constantes

✅ **Sin errores de tipeo:** TypeScript detecta errores en tiempo de compilación  
✅ **Autocompletado:** Tu IDE sugiere los nombres correctos  
✅ **Refactoring fácil:** Cambia el nombre en un solo lugar  
✅ **Documentación integrada:** Cada constante tiene su comentario JSDoc  
✅ **Type-safe:** Tipos TypeScript para validación estricta  

---

## 📋 Eventos Implementados

### 🟢 Eventos de Pasajero (Passenger)

| Constante | Valor | Dirección | Descripción |
|-----------|-------|-----------|-------------|
| `GET_TRIP_P_ON` | `'get-trip-p-on'` | ⬆️⬇️ Bidireccional | Pasajero solicita y recibe datos del viaje |
| `LOCATION_P_SEND` | `'location-p-send'` | ⬆️ Cliente → Servidor | Pasajero envía su ubicación |
| `TRIP_INCIDENT_P_ON` | `'trip-incident-p-on'` | ⬇️ Servidor → Cliente | Notificación de incidente |
| `TRIP_CANCEL_P_SEND` | `'trip-cancel-p-send'` | ⬆️ Cliente → Servidor | Pasajero cancela viaje |
| `TRIP_CANCEL_P_ON` | `'trip-cancel-p-on'` | ⬇️ Servidor → Cliente | Notificación de cancelación |
| `TRIP_START_AVAILABLE_P_SEND` | `'trip-start-available-p-send'` | ⬆️ Cliente → Servidor | Pasajero listo para iniciar |
| `TRIP_MESSAGE_P_ON` | `'trip-message-p-on'` | ⬇️ Servidor → Cliente | Recibir mensaje del viaje |
| `TRIP_PAYMENT_P_SEND` | `'trip-payment-p-send'` | ⬆️ Cliente → Servidor | Enviar info de pago |
| `TRIP_MESSAGE_P_SEND` | `'trip-message-p-send'` | ⬆️ Cliente → Servidor | Enviar mensaje |

### 🔵 Eventos de Conductor (Driver)

| Constante | Valor | Dirección | Descripción |
|-----------|-------|-----------|-------------|
| `GET_TRIP_D_ON` | `'get-trip-d-on'` | ⬆️⬇️ Bidireccional | Conductor solicita y recibe datos |
| `DRIVER_LOCATION` | `'driver-location'` | ⬆️ Cliente → Servidor | Conductor envía ubicación |
| `DRIVER_LOCATION_UPDATE` | `'driver-location-update'` | ⬇️ Servidor → Clientes | Broadcast de ubicación del conductor |

### 🟣 Eventos Compartidos (Shared)

| Constante | Valor | Dirección | Descripción |
|-----------|-------|-----------|-------------|
| `SEND_CHANGE_TRIP` | `'send-change-trip'` | ⬆️⬇️ Bidireccional | Cambios en el estado del viaje |
| `GLOBAL_EVENT` | `'global.event'` | ⬇️ EventEmitter → Socket | Eventos dinámicos globales |

---

## 💻 Cómo Usar las Constantes

### En el Gateway (Servidor)

```typescript
import { 
  GET_TRIP_P_ON, 
  SEND_CHANGE_TRIP, 
  DRIVER_LOCATION 
} from './const';

// En lugar de strings mágicos:
// @SubscribeMessage('get-trip-p-on')  ❌

// Usar constantes:
@SubscribeMessage(GET_TRIP_P_ON)  ✅
onGetTripPassenger(@ConnectedSocket() client: Socket) {
  const passengerTrip = buildSendTripPassanger({...});
  client.emit(GET_TRIP_P_ON, passengerTrip);
}
```

### En el Cliente (Frontend)

**Opción 1: Copiar constantes al frontend**
```typescript
// frontend/constants/socket-events.ts
export const GET_TRIP_P_ON = 'get-trip-p-on';
export const SEND_CHANGE_TRIP = 'send-change-trip';
export const DRIVER_LOCATION_UPDATE = 'driver-location-update';

// frontend/services/socket.service.ts
import { GET_TRIP_P_ON, SEND_CHANGE_TRIP } from '../constants/socket-events';

socket.emit(GET_TRIP_P_ON);
socket.on(SEND_CHANGE_TRIP, (data) => { ... });
```

**Opción 2: Exportar desde el backend**
```typescript
// Si usas monorepo o compartes código
import { GET_TRIP_P_ON } from '@backend/socket/const';
```

---

## 🔧 Objeto SOCKET_EVENTS

Para un acceso organizado, también existe un objeto agrupado:

```typescript
import { SOCKET_EVENTS } from './const';

// Acceso estructurado
SOCKET_EVENTS.PASSENGER.GET_TRIP         // 'get-trip-p-on'
SOCKET_EVENTS.PASSENGER.LOCATION_SEND    // 'location-p-send'
SOCKET_EVENTS.DRIVER.LOCATION            // 'driver-location'
SOCKET_EVENTS.SHARED.CHANGE_TRIP         // 'send-change-trip'
```

**Uso en el Gateway:**
```typescript
@SubscribeMessage(SOCKET_EVENTS.PASSENGER.GET_TRIP)
onGetTripPassenger(@ConnectedSocket() client: Socket) {
  // ...
}
```

---

## 📘 Tipos TypeScript

El archivo también exporta tipos útiles:

```typescript
import { PassengerEvent, DriverEvent, SocketEvent } from './const';

// Función que solo acepta eventos de pasajero
function handlePassengerEvent(event: PassengerEvent) {
  // event solo puede ser 'get-trip-p-on', 'location-p-send', etc.
}

// Validación de eventos en runtime
function isDriverEvent(event: string): event is DriverEvent {
  return event.startsWith('driver-') || event === 'get-trip-d-on';
}
```

---

## 📦 Ejemplo Completo: Cliente Pasajero

```typescript
import { io, Socket } from 'socket.io-client';

// Constantes (copiadas o importadas del backend)
const GET_TRIP_P_ON = 'get-trip-p-on';
const SEND_CHANGE_TRIP = 'send-change-trip';
const DRIVER_LOCATION_UPDATE = 'driver-location-update';
const TRIP_CANCEL_P_ON = 'trip-cancel-p-on';

class PassengerSocketService {
  private socket: Socket;

  constructor() {
    this.socket = io('http://localhost:3000/events', {
      transports: ['websocket']
    });
    
    this.setupListeners();
  }

  // Solicitar datos del viaje
  getTripData() {
    this.socket.emit(GET_TRIP_P_ON);
  }

  // Configurar listeners
  private setupListeners() {
    // Recibir datos del viaje
    this.socket.on(GET_TRIP_P_ON, (data) => {
      console.log('📦 Datos del viaje:', data);
      this.updateUI(data);
    });

    // Escuchar cambios de estado
    this.socket.on(SEND_CHANGE_TRIP, (tripChange) => {
      console.log('🔄 Estado cambió:', tripChange.tripStatus);
      this.updateTripStatus(tripChange);
    });

    // Escuchar ubicación del conductor
    this.socket.on(DRIVER_LOCATION_UPDATE, (location) => {
      console.log('📍 Nueva ubicación:', location.lat, location.lon);
      this.updateDriverMarker(location);
    });

    // Escuchar cancelación
    this.socket.on(TRIP_CANCEL_P_ON, (data) => {
      console.log('❌ Viaje cancelado:', data);
      this.showCancellationMessage(data);
    });
  }

  // Métodos de UI (implementar según tu framework)
  private updateUI(data: any) { /* ... */ }
  private updateTripStatus(tripChange: any) { /* ... */ }
  private updateDriverMarker(location: any) { /* ... */ }
  private showCancellationMessage(data: any) { /* ... */ }
}

// Uso
const passengerSocket = new PassengerSocketService();
passengerSocket.getTripData();
```

---

## 📦 Ejemplo Completo: Cliente Conductor

```typescript
import { io, Socket } from 'socket.io-client';

// Constantes
const GET_TRIP_D_ON = 'get-trip-d-on';
const DRIVER_LOCATION = 'driver-location';
const SEND_CHANGE_TRIP = 'send-change-trip';

class DriverSocketService {
  private socket: Socket;
  private locationInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.socket = io('http://localhost:3000/events', {
      transports: ['websocket']
    });
    
    this.setupListeners();
  }

  // Solicitar datos del viaje
  getTripData() {
    this.socket.emit(GET_TRIP_D_ON);
  }

  // Iniciar envío de ubicación
  startSendingLocation() {
    if (this.locationInterval) return;
    
    this.locationInterval = setInterval(() => {
      navigator.geolocation.getCurrentPosition((position) => {
        this.socket.emit(DRIVER_LOCATION, {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          timestamp: Date.now()
        });
      });
    }, 3000); // Cada 3 segundos
  }

  // Detener envío de ubicación
  stopSendingLocation() {
    if (this.locationInterval) {
      clearInterval(this.locationInterval);
      this.locationInterval = null;
    }
  }

  private setupListeners() {
    this.socket.on(GET_TRIP_D_ON, (data) => {
      console.log('📦 Datos del viaje:', data);
    });

    this.socket.on(SEND_CHANGE_TRIP, (tripChange) => {
      console.log('🔄 Estado:', tripChange.tripStatus);
      
      // Iniciar envío de ubicación cuando el viaje comienza
      if (tripChange.tripStatus === 3) { // tripStarted
        this.startSendingLocation();
      }
      
      // Detener cuando termina
      if (tripChange.tripStatus === 4) { // tripCompleted
        this.stopSendingLocation();
      }
    });
  }
}

// Uso
const driverSocket = new DriverSocketService();
driverSocket.getTripData();
```

---

## ✅ Cambios Aplicados en el Gateway

El archivo `socket.gateway.ts` ahora usa las constantes:

```typescript
// ❌ Antes
@SubscribeMessage('get-trip-p-on')
client.emit('get-trip-p-on', data);

// ✅ Ahora
import { GET_TRIP_P_ON } from './const';

@SubscribeMessage(GET_TRIP_P_ON)
client.emit(GET_TRIP_P_ON, data);
```

**Constantes en uso:**
- ✅ `GET_TRIP_P_ON` - Conexión de pasajero
- ✅ `SEND_CHANGE_TRIP` - Cambios de estado
- ✅ `DRIVER_LOCATION` - Ubicación del conductor
- ✅ `DRIVER_LOCATION_UPDATE` - Broadcast de ubicación
- ✅ `GLOBAL_EVENT` - Eventos globales

---

## 🔮 Próximos Eventos a Implementar

Estos eventos ya están definidos como constantes, listos para implementarse:

**Pasajero:**
- 🔲 `LOCATION_P_SEND`
- 🔲 `TRIP_INCIDENT_P_ON`
- 🔲 `TRIP_CANCEL_P_SEND`
- 🔲 `TRIP_CANCEL_P_ON`
- 🔲 `TRIP_START_AVAILABLE_P_SEND`
- 🔲 `TRIP_MESSAGE_P_ON`
- 🔲 `TRIP_PAYMENT_P_SEND`
- 🔲 `TRIP_MESSAGE_P_SEND`

**Conductor:**
- 🔲 `GET_TRIP_D_ON`

---

## 📚 Resumen

✅ **Archivo creado:** `src/socket/const.ts`  
✅ **Gateway actualizado:** Usa constantes en lugar de strings  
✅ **Sin errores de lint:** Todo tipado correctamente  
✅ **Documentación:** JSDoc en cada constante  
✅ **Tipos TypeScript:** `PassengerEvent`, `DriverEvent`, `SocketEvent`  
✅ **Objeto agrupado:** `SOCKET_EVENTS` para acceso estructurado  

**Listo para:**
- 🚀 Implementar nuevos eventos sin riesgo de errores de tipeo
- 🔧 Refactorizar nombres de eventos fácilmente
- 📱 Compartir constantes con el frontend
- 🧪 Crear tests con nombres consistentes

