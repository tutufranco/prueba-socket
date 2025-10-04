# 🚗 EVENTOS DE CONDUCTOR - WebSocket Gateway

## 🔌 Conexión
**Namespace:** `/events`  
**URL:** `ws://localhost:3000/events`

---

## 📋 EVENTOS DISPONIBLES

### 1. 🚀 **Conexión Automática**
**Evento:** `get-trip-d-on`  
**Dirección:** `Servidor → Cliente`  
**Cuándo:** Al conectarse automáticamente

```json
{
  "service_id": "trip-123",
  "tripStops": {
    "start_address": {
      "address": "Av. Corrientes 1234",
      "lat": -34.6037,
      "lon": -58.3816,
      "status": true,
      "index": 0
    },
    "end_address": {
      "address": "Plaza de Mayo",
      "lat": -34.6083,
      "lon": -58.3712,
      "status": true,
      "index": 1
    },
    "stops": []
  },
  "passengerProfile": {
    "passenger_id": "passenger-789",
    "full_name": "María García",
    "qualifications": 4.9,
    "selfie": "https://example.com/passenger.jpg",
    "total_trips": 75,
    "phone": "+54911987654"
  },
  "tripChange": {
    "tripStatus": 0,
    "tripStatusText": "idle",
    "passenger_boarded": false,
    "payment_confirmed": false,
    "message_number": 0,
    "incident_number": 0
  },
  "filters": {
    "luggage": false,
    "pets": false,
    "packages": false,
    "wheelchair": false
  },
  "payment": {
    "payment_type": "credit_card",
    "amount_passenger": 1500,
    "amount_driver": 1200
  },
  "incident": [],
  "message": []
}
```

### 2. 📍 **Enviar Ubicación (Básico)**
**Evento:** `location-d-send`  
**Dirección:** `Cliente → Servidor`  
**Propósito:** Enviar ubicación actual del conductor

```json
{
  "lat": -34.6037,
  "lon": -58.3816,
  "timestamp": 1704123456789
}
```

**Respuesta del servidor:**
```json
{
  "success": true,
  "message": "Ubicación del conductor enviada",
  "location": {
    "lat": -34.6037,
    "lon": -58.3816
  },
  "tripChange": {
    "tripStatus": 0,
    "tripStatusText": "idle",
    "passenger_boarded": false,
    "payment_confirmed": false,
    "message_number": 0,
    "incident_number": 0
  }
}
```

**Eventos que recibe:**
- `driver-location-update` - Otros clientes reciben tu ubicación

### 3. 📍 **Enviar Ubicación (Con Progresión de Estado)**
**Evento:** `driver-location`  
**Dirección:** `Cliente → Servidor`  
**Propósito:** Enviar ubicación y avanzar automáticamente el estado del viaje

```json
{
  "lat": -34.6037,
  "lon": -58.3816,
  "timestamp": 1704123456789
}
```

**Respuesta del servidor:**
```json
{
  "success": true,
  "message": "Ubicación del conductor recibida y tripChange enviado",
  "tripStatus": 5,
  "updateCount": 1,
  "progress": "1/5",
  "tripChange": {
    "tripStatus": 5,
    "tripStatusText": "driverOnWay",
    "passenger_boarded": false,
    "payment_confirmed": false,
    "message_number": 0,
    "incident_number": 0
  }
}
```

**Secuencia automática de estados:**
1. `driverOnWay` (5) - Conductor en camino
2. `driverArrived` (6) - Conductor llegó
3. `tripStarted` (7) - Viaje iniciado
4. `tripInProgress` (8) - Viaje en progreso
5. `tripCompleted` (9) - Viaje completado

**Eventos que recibe:**
- `send-change-trip` - Estado actualizado del viaje
- `driver-location-update` - Otros clientes reciben tu ubicación

### 4. ⚠️ **Reportar Incidente**
**Evento:** `trip-incident-d-send`  
**Dirección:** `Cliente → Servidor`  
**Propósito:** Reportar un incidente durante el viaje

```json
{
  "message": "Problema mecánico en el vehículo"
}
```

**Respuesta del servidor:**
```json
{
  "success": true,
  "message": "Incidente reportado",
  "incident": {
    "incident_id": "incident-1704123456789-client-123",
    "incindent_user": "driver",
    "incindent_message": "Problema mecánico en el vehículo",
    "incindent_timestamp": "2024-01-15T10:30:00.000Z"
  },
  "tripChange": {
    "tripStatus": 5,
    "tripStatusText": "driverOnWay",
    "passenger_boarded": false,
    "payment_confirmed": false,
    "message_number": 0,
    "incident_number": 1
  }
}
```

**Eventos que recibe:**
- `trip-incident-p-on` - Solo el incidente reportado
- `send-change-trip` - Estado actualizado con contador de incidentes

### 5. 🚫 **Cancelar Viaje**
**Evento:** `trip-cancel-d-send`  
**Dirección:** `Cliente → Servidor`  
**Propósito:** Cancelar el viaje actual

```json
{
  "reason": "Emergencia familiar"
}
```

**Respuesta del servidor:**
```json
{
  "success": true,
  "message": "Viaje cancelado por el conductor",
  "tripChange": {
    "tripStatus": 11,
    "tripStatusText": "tripCancelledByDriver",
    "passenger_boarded": true,
    "payment_confirmed": false,
    "message_number": 0,
    "incident_number": 0
  }
}
```

**Eventos que recibe:**
- `send-change-trip` - Estado actualizado a cancelado por conductor

### 6. 🚕 **Recibir Viaje Disponible** (NUEVO)
**Evento:** `trip-available`  
**Dirección:** `Servidor → Cliente`  
**Propósito:** Recibir oferta de viaje disponible

```json
{
  "trip_id": "trip-1704123456789",
  "passenger_id": "passenger-123",
  "passenger_name": "María García",
  "passenger_rating": 4.8,
  "pickup_location": {
    "address": "Av. Corrientes 1234, Buenos Aires",
    "lat": -34.6037,
    "lon": -58.3816
  },
  "dropoff_location": {
    "address": "Plaza de Mayo, Buenos Aires",
    "lat": -34.6083,
    "lon": -58.3712
  },
  "estimated_distance": 2.5,
  "estimated_duration": 15,
  "estimated_fare": 850,
  "request_time": "2024-01-15T10:30:00.000Z",
  "expires_at": "2024-01-15T10:30:30.000Z"
}
```

**Nota:** El conductor tiene 30 segundos para aceptar o rechazar el viaje.

### 7. ✅ **Aceptar Viaje** (NUEVO)
**Evento:** `trip-accept`  
**Dirección:** `Cliente → Servidor`  
**Propósito:** Aceptar el viaje ofrecido

```json
{
  "trip_id": "trip-1704123456789"
}
```

**Respuesta del servidor:**
```json
{
  "success": true,
  "message": "Viaje aceptado correctamente",
  "trip_id": "trip-1704123456789",
  "tripChange": {
    "tripStatus": 4,
    "tripStatusText": "driverAccepted",
    "passenger_boarded": false,
    "payment_confirmed": false,
    "message_number": 0,
    "incident_number": 0
  }
}
```

**Eventos que recibe:**
- `send-change-trip` - Estado actualizado a `driverAccepted`

### 8. ❌ **Rechazar Viaje** (NUEVO)
**Evento:** `trip-reject`  
**Dirección:** `Cliente → Servidor`  
**Propósito:** Rechazar el viaje ofrecido

```json
{
  "trip_id": "trip-1704123456789",
  "reason": "Muy lejos de mi ubicación"
}
```

**Respuesta del servidor:**
```json
{
  "success": true,
  "message": "Viaje rechazado",
  "trip_id": "trip-1704123456789",
  "reason": "Muy lejos de mi ubicación"
}
```

**Nota:** El sistema buscará otro conductor disponible.

---

## 📥 EVENTOS QUE RECIBE EL CONDUCTOR

### 1. 🚕 **Viaje Disponible** (NUEVO)
**Evento:** `trip-available`  
**Cuándo:** El servidor le asigna un viaje disponible

```json
{
  "trip_id": "trip-1704123456789",
  "passenger_id": "passenger-123",
  "passenger_name": "María García",
  "passenger_rating": 4.8,
  "pickup_location": {
    "address": "Av. Corrientes 1234",
    "lat": -34.6037,
    "lon": -58.3816
  },
  "dropoff_location": {
    "address": "Plaza de Mayo",
    "lat": -34.6083,
    "lon": -58.3712
  },
  "estimated_distance": 2.5,
  "estimated_duration": 15,
  "estimated_fare": 850,
  "request_time": "2024-01-15T10:30:00.000Z",
  "expires_at": "2024-01-15T10:30:30.000Z"
}
```

### 2. 🔄 **Cambios de Estado del Viaje**
**Evento:** `send-change-trip`  
**Cuándo:** Cualquier cambio en el estado del viaje

```json
{
  "tripStatus": 5,
  "tripStatusText": "driverOnWay",
  "passenger_boarded": false,
  "payment_confirmed": false,
  "message_number": 0,
  "incident_number": 0
}
```

### 3. 📍 **Actualización de Ubicación del Pasajero**
**Evento:** `passenger-location-update`  
**Cuándo:** El pasajero envía su ubicación

```json
{
  "lat": -34.6037,
  "lon": -58.3816,
  "timestamp": 1704123456789,
  "passenger_id": "passenger-789"
}
```

### 4. ⚠️ **Notificación de Incidentes**
**Evento:** `trip-incident-p-on`  
**Cuándo:** Se reporta un incidente (propio o del pasajero)

```json
{
  "incident_id": "incident-1704123456789-client-123",
  "incindent_user": "passenger",
  "incindent_message": "El conductor no llegó al punto de encuentro",
  "incindent_timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 5. 💬 **Notificación de Mensajes**
**Evento:** `trip-message-p-on`  
**Cuándo:** Se envía un mensaje (propio o del pasajero)

```json
{
  "message_id": "msg-1704123456789-client-123",
  "message_user": "passenger",
  "message_message": "¿En cuánto tiempo llegas?",
  "message_timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 6. 🚫 **Notificación de Cancelación**
**Evento:** `trip-cancel-p-on`  
**Cuándo:** El viaje es cancelado por el pasajero

```json
{
  "cancelled_by": "passenger",
  "reason": "Cambio de planes",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 🔄 ESTADOS DEL VIAJE (TripStatusV2)

| Valor | Texto | Descripción |
|-------|-------|-------------|
| 0 | `idle` | Inactivo |
| 1 | `searching` | Buscando conductor |
| 2 | `driverNotFound` | Conductor no encontrado |
| 3 | `driverFound` | Conductor encontrado |
| 4 | `driverAccepted` | Conductor aceptó |
| 5 | `driverOnWay` | Conductor en camino |
| 6 | `driverArrived` | Conductor llegó |
| 7 | `tripStarted` | Viaje iniciado |
| 8 | `tripInProgress` | Viaje en progreso |
| 9 | `tripCompleted` | Viaje completado |
| 10 | `tripCancelled` | Viaje cancelado |
| 11 | `tripCancelledByDriver` | Viaje cancelado por conductor |
| 12 | `error` | Error |

---

## 🛠️ IMPLEMENTACIÓN EN CLIENTE

### Conexión WebSocket
```javascript
const socket = io('ws://localhost:3000/events');

// Escuchar datos iniciales del viaje
socket.on('get-trip-d-on', (tripData) => {
  console.log('Datos del viaje:', tripData);
});

// Escuchar cambios de estado
socket.on('send-change-trip', (tripChange) => {
  console.log('Estado del viaje:', tripChange);
});

// Escuchar ubicación del pasajero
socket.on('passenger-location-update', (location) => {
  console.log('Ubicación del pasajero:', location);
});
```

### Enviar Ubicación Básica
```javascript
socket.emit('location-d-send', {
  lat: -34.6037,
  lon: -58.3816,
  timestamp: Date.now()
});
```

### Enviar Ubicación con Progresión de Estado
```javascript
socket.emit('driver-location', {
  lat: -34.6037,
  lon: -58.3816,
  timestamp: Date.now()
});
```

### Reportar Incidente
```javascript
socket.emit('trip-incident-d-send', {
  message: 'Problema mecánico en el vehículo'
});
```

### Cancelar Viaje
```javascript
socket.emit('trip-cancel-d-send', {
  reason: 'Emergencia familiar'
});
```

---

## 🔄 DIFERENCIAS ENTRE EVENTOS DE UBICACIÓN

### `location-d-send`
- **Propósito:** Solo envía ubicación
- **Estado:** No modifica el estado del viaje
- **Uso:** Para actualizaciones frecuentes de ubicación

### `driver-location`
- **Propósito:** Envía ubicación + avanza estado del viaje
- **Estado:** Modifica automáticamente el estado del viaje
- **Uso:** Para marcar hitos importantes del viaje
- **Secuencia:** Sigue una secuencia predefinida de estados

---

## 📝 NOTAS IMPORTANTES

1. **Reconexión:** Al reconectarse, recibirás automáticamente todos los datos del viaje incluyendo incidentes y mensajes acumulados.

2. **Contadores:** Los contadores `message_number` e `incident_number` se incrementan globalmente y se mantienen entre reconexiones.

3. **Broadcast:** Al enviar ubicación, otros clientes (pasajeros) reciben tu ubicación via `driver-location-update`.

4. **Estado Global:** El estado del viaje (`tripChange`) es compartido entre todos los clientes conectados.

5. **Progresión Automática:** El evento `driver-location` avanza automáticamente por la secuencia de estados del viaje.

6. **Timestamps:** Todos los timestamps están en formato ISO 8601 UTC.

7. **Secuencia de Estados:** La secuencia se reinicia automáticamente cuando llega al final (`tripCompleted`).

---

## 🎯 FLUJO TÍPICO DE UN VIAJE

1. **Conexión:** Recibe datos iniciales del viaje
2. **En camino:** Usa `driver-location` para avanzar a `driverOnWay`
3. **Llegada:** Usa `driver-location` para avanzar a `driverArrived`
4. **Inicio:** Usa `driver-location` para avanzar a `tripStarted`
5. **En progreso:** Usa `driver-location` para avanzar a `tripInProgress`
6. **Finalización:** Usa `driver-location` para avanzar a `tripCompleted`
7. **Actualizaciones:** Usa `location-d-send` para actualizaciones frecuentes de ubicación
