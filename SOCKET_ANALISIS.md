# 📡 Análisis del Sistema de WebSockets

## 🎯 Resumen General

Este proyecto implementa un sistema de WebSockets en **NestJS** usando **Socket.IO** para gestionar un flujo de viajes en tiempo real (estilo Uber/Cabify). El gateway maneja la comunicación bidireccional entre conductores y pasajeros, con estados de viaje progresivos.

---

## 📂 Estructura de Archivos

```
src/socket/
├── socket.gateway.ts       # Gateway principal (WebSocket)
├── helpers.ts              # Builders para estructuras de datos
├── interface.ts            # Definiciones TypeScript
└── socket.gateway.spec.ts  # Tests (no implementado)
```

---

## 🔌 Configuración del Gateway

### `socket.gateway.ts`

**Namespace:** `events`  
**CORS:** Permite todos los orígenes (`*`)  
**Puerto del servidor:** `3000` (configurado en `main.ts`)

### URL de conexión del cliente:
```javascript
// Mismo origen
const socket = io('/events', { transports: ['websocket'] });

// Origen diferente
const socket = io('http://localhost:3000/events', { transports: ['websocket'] });
```

---

## 🔄 Flujo de Estados del Viaje

El sistema maneja una secuencia automática de 5 estados progresivos:

```
1. driverOnWay      → Conductor en camino
2. driverArrived    → Conductor llegó
3. tripStarted      → Viaje iniciado
4. tripInProgress   → Viaje en progreso
5. tripCompleted    → Viaje completado
```

Cada vez que el conductor envía su ubicación (`driver-location`), el sistema avanza automáticamente al siguiente estado.

---

## 📨 Eventos Implementados

### 1️⃣ **Conexión del Cliente** (`handleConnection`)

**Trigger:** Cliente se conecta al namespace `/events`

**Qué hace:**
- Reinicia el contador de actualizaciones (`locationUpdateCount = 0`)
- Resetea `tripChange` a estado `idle`
- Emite al cliente recién conectado: `get-trip-response` con los datos iniciales del viaje

**Datos enviados:**
```typescript
{
  service_id: 'service-456',
  tripStops: { start_address, end_address, stops },
  passengerProfile: { passenger_id, full_name, qualifications, ... },
  tripChange: { tripStatus: 'idle', passenger_boarded: false, payment_confirmed: false },
  filters: { luggage, pets, packages, wheelchair },
  payment: { payment_type: 'cash', amount_passenger: 1500, amount_driver: 1200 }
}
```

---

### 2️⃣ **Envío de Ubicación** (`driver-location`)

**Trigger:** Cliente emite `driver-location` con `{ lat, lon, timestamp? }`

**Qué hace:**
1. Incrementa `locationUpdateCount`
2. Determina el siguiente estado en la secuencia (usando el contador como índice)
3. Construye un nuevo `tripChange` con el estado actualizado
4. **Emite solo al cliente que envió**: `send-change-trip` con el `tripChange`
5. Si completó la secuencia (5 actualizaciones), reinicia el contador

**Respuesta al cliente (ACK):**
```json
{
  "success": true,
  "message": "Ubicación recibida y tripChange enviado",
  "tripStatus": "driverOnWay",
  "updateCount": 1,
  "progress": "1/5"
}
```

---

### 3️⃣ **Cambio de Viaje Manual** (`send-change-trip`)

**Trigger:** Cliente emite `send-change-trip` con datos personalizados

**Qué hace:**
- Loguea el mensaje recibido
- ⚠️ **Actualmente comentado:** No reenvía a otros clientes
- Retorna `true` como ACK

**Estado actual:**
```typescript
// Línea comentada:
// this.server.emit('send-change-trip', { from: client.id, ...data });
```

---

### 4️⃣ **Eventos Globales** (`@OnEvent('global.event')`)

**Trigger:** Se dispara desde otro módulo usando `EventEmitter2`

**Qué hace:**
- Recibe un `GlobalEvent` con `{ event: string, data: any }`
- Emite a **todos los clientes** del namespace el evento dinámico especificado

**Ejemplo de uso:**
```typescript
// Desde app.controller.ts o app.service.ts
this.eventEmitter.emit('global.event', {
  event: 'custom-notification',
  data: { message: 'Nuevo conductor disponible' }
});
```

---

## 📊 Interfaces y Tipos Principales

### `TripStatusV2` (Enum)
```typescript
idle | searching | driverNotFound | driverFound | 
driverAccepted | driverOnWay | driverArrived | 
tripStarted | tripInProgress | tripCompleted | 
tripCancelled | tripCancelledByDriver | error
```

### `sendTripDriver` (DTO para conductor)
Estructura completa del viaje que recibe el conductor:
```typescript
{
  service_id: string;
  tripStops: {
    start_address: { address, lat, lon, status, index },
    end_address: { address, lat, lon, status, index },
    stops: []
  };
  passengerProfile: {
    passenger_id: string;
    full_name: string;
    qualifications: number;
    selfie: string;
    total_trips: number;
    phone: string;
  };
  tripChange: {
    tripStatus: TripStatusV2;
    passenger_boarded: boolean;
    payment_confirmed: boolean;
  };
  filters: {
    luggage: boolean;
    pets: boolean;
    packages: boolean;
    wheelchair: boolean;
  };
  payment: {
    payment_type: string;
    amount_passenger: number;
    amount_driver: number;
  };
}
```

### `sendTripPassanger` (DTO para pasajero)
Estructura completa del viaje que recibe el pasajero:
```typescript
{
  service_id: string;
  tripStops: {
    start_address: { address, lat, lon, status, index },
    end_address: { address, lat, lon, status, index },
    stops: []
  };
  driverProfile: {
    driver_id: string;
    full_name: string;
    qualifications: number;
    selfie: string;
    total_trips: number;
    car_model: string;
    car_color: string;
    car_plate: string;
    phone: string;
  };
  carDriverLocation: {
    lat: number;
    lon: number;
  };
  tripChange: {
    tripStatus: TripStatusV2;
    passenger_boarded: boolean;
    payment_confirmed: boolean;
  };
  filters: {
    luggage: boolean;
    pets: boolean;
    packages: boolean;
    wheelchair: boolean;
  };
  payment: {
    payment_type: string;
    amount_passenger: number;
    amount_driver: number;
  };
}
```

### `tripChange`
Objeto que contiene el estado actual del viaje y flags adicionales:
```typescript
{
  tripStatus: TripStatusV2;
  passenger_boarded: boolean;   // Si el pasajero abordó
  payment_confirmed: boolean;    // Si el pago fue confirmado
}
```

---

## 🛠️ Helpers (Builders)

El archivo `helpers.ts` provee funciones factory para construir estructuras de datos complejas con valores por defecto:

| Función | Retorna | Uso |
|---------|---------|-----|
| `buildSendTripDriver()` | `sendTripDriver` | DTO completo del viaje para conductor |
| `buildSendTripPassanger()` | `sendTripPassanger` | DTO completo del viaje para pasajero |
| `buildTripStops()` | `tripStops` | Origen, destino y paradas |
| `buildTripDriver()` | `tripDriver` | Info del conductor (nombre, calificación, auto) |
| `buildTripPassanger()` | `tripPassanger` | Info del pasajero |
| `buildCarLocation()` | `carLocation` | Coordenadas lat/lon |
| `buildTripChange()` | `tripChange` | Estado del viaje + flags (boarded, payment) |
| `buildFilters()` | `filtersIntravel` | Preferencias del viaje |
| `buildPayment()` | `PaymentInTravel` | Info de pago (tipo, montos) |
| `buildStopInTravel()` | `stopInTravel` | Una parada individual |

---

## ⚠️ Puntos de Atención

### 1. **Broadcast Desactivado**
Actualmente, el evento `send-change-trip` **NO se difunde** a todos los clientes:
- En `onSendChangeTrip`: línea comentada
- En `onDriverLocation`: emite solo al cliente (`client.emit`)
- En `emitGlobalEvent`: línea comentada

**Solución si necesitas broadcast:**
```typescript
// Cambiar de:
client.emit('send-change-trip', this.tripChange);

// A:
this.server.emit('send-change-trip', this.tripChange);
```

### 2. **Estado Compartido**
Las variables `trip`, `tripChange` y `locationUpdateCount` son **privadas del gateway** (singleton). Esto significa:
- ✅ Todos los clientes conectados ven el mismo estado
- ⚠️ Si un cliente se desconecta, el estado NO se resetea (solo el contador se resetea en `handleConnection`)
- ⚠️ No hay gestión de múltiples viajes concurrentes

### 3. **Namespace**
El gateway usa `namespace: 'events'` pero debería ser `namespace: '/events'` para evitar problemas de compatibilidad con algunos clientes Socket.IO.

### 4. **Logs Duplicados**
En `handleConnection` hay 3 logs idénticos consecutivos (líneas 48, 53, 55).

### 5. **Falta Validación**
No hay validación de datos en `onDriverLocation` (ej: verificar que `lat` y `lon` sean números válidos).

---

## 🧪 Ejemplo de Uso Completo

### Cliente (HTML + JavaScript)
```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
</head>
<body>
  <h1>Cliente de Viaje</h1>
  <button onclick="enviarUbicacion()">Enviar Ubicación</button>
  <div id="log"></div>

  <script>
    const socket = io('http://localhost:3000/events', { 
      transports: ['websocket'] 
    });

    const log = (msg) => {
      document.getElementById('log').innerHTML += `<p>${msg}</p>`;
    };

    socket.on('connect', () => {
      log(`✅ Conectado: ${socket.id}`);
    });

    socket.on('get-trip-response', (data) => {
      log(`📦 Viaje inicial: ${JSON.stringify(data, null, 2)}`);
    });

    socket.on('send-change-trip', (data) => {
      log(`🔄 Cambio de estado: ${data.tripStatus}`);
    });

    function enviarUbicacion() {
      const coords = {
        lat: -34.6037 + Math.random() * 0.01,
        lon: -58.3816 + Math.random() * 0.01,
        timestamp: Date.now()
      };
      
      socket.emit('driver-location', coords, (response) => {
        log(`📍 Respuesta: ${JSON.stringify(response)}`);
      });
    }
  </script>
</body>
</html>
```

---

## 📈 Mejoras Sugeridas

1. **Validación de datos:** Usar DTOs con `class-validator`
2. **Gestión de sesiones:** Usar `Map<clientId, TripState>` para múltiples viajes concurrentes
3. **Persistencia:** Guardar estados en base de datos (Redis/PostgreSQL)
4. **Autenticación:** Implementar JWT con `@nestjs/passport`
5. **Rooms:** Usar Socket.IO rooms para separar conductores y pasajeros
6. **Rate limiting:** Limitar frecuencia de actualizaciones de ubicación
7. **Tests:** Implementar tests en `socket.gateway.spec.ts`
8. **Typado estricto:** Cambiar `data: any` por interfaces concretas

---

## 🚀 Comandos Útiles

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod

# Tests
npm run test
npm run test:e2e
```

---

## 📝 Conclusión

Este sistema implementa un flujo de viaje simplificado y funcional para pruebas. La arquitectura es sólida pero necesita ajustes para producción (validación, escalabilidad, seguridad). El uso de helpers y tipos TypeScript facilita el mantenimiento y la extensión del código.

**Estado actual:** ✅ Funcional para desarrollo/pruebas  
**Listo para producción:** ⚠️ Requiere mejoras de seguridad y escalabilidad

