# 📱 EVENTOS DE PASAJERO - WebSocket Gateway

## 🔌 Conexión
**Namespace:** `/events`  
**URL:** `ws://localhost:3000/events`

---

## 📋 EVENTOS DISPONIBLES

### 1. 🚀 **Conexión Automática**
**Evento:** `get-trip-p-on`  
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
  "driverProfile": {
    "driver_id": "driver-456",
    "full_name": "Juan Pérez",
    "qualifications": 4.8,
    "selfie": "https://example.com/selfie.jpg",
    "total_trips": 150,
    "phone": "+54911234567"
  },
  "carDriverLocation": {
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

### 2. 📍 **Enviar Ubicación**
**Evento:** `location-p-send`  
**Dirección:** `Cliente → Servidor`  
**Propósito:** Enviar ubicación actual del pasajero

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
  "message": "Ubicación del pasajero enviada",
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
- `passenger-location-update` - Otros clientes reciben tu ubicación

### 3. ⚠️ **Reportar Incidente**
**Evento:** `trip-incident-p-send`  
**Dirección:** `Cliente → Servidor`  
**Propósito:** Reportar un incidente durante el viaje

```json
{
  "message": "El conductor no llegó al punto de encuentro"
}
```

**Respuesta del servidor:**
```json
{
  "success": true,
  "message": "Incidente reportado",
  "incident": {
    "incident_id": "incident-1704123456789-client-123",
    "incindent_user": "passenger",
    "incindent_message": "El conductor no llegó al punto de encuentro",
    "incindent_timestamp": "2024-01-15T10:30:00.000Z"
  },
  "tripChange": {
    "tripStatus": 0,
    "tripStatusText": "idle",
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

### 4. 🚫 **Cancelar Viaje**
**Evento:** `trip-cancel-p-send`  
**Dirección:** `Cliente → Servidor`  
**Propósito:** Cancelar el viaje actual

```json
{
  "reason": "Cambio de planes"
}
```

**Respuesta del servidor:**
```json
{
  "success": true,
  "message": "Viaje cancelado por el pasajero",
  "tripChange": {
    "tripStatus": 10,
    "tripStatusText": "tripCancelled",
    "passenger_boarded": true,
    "payment_confirmed": false,
    "message_number": 0,
    "incident_number": 0
  }
}
```

**Eventos que recibe:**
- `send-change-trip` - Estado actualizado a cancelado

### 5. 💬 **Enviar Mensaje**
**Evento:** `trip-message-p-send`  
**Dirección:** `Cliente → Servidor`  
**Propósito:** Enviar mensaje durante el viaje

```json
{
  "message": "¿En cuánto tiempo llegas?"
}
```

**Respuesta del servidor:**
```json
{
  "success": true,
  "message": "Mensaje enviado",
  "message_data": {
    "message_id": "msg-1704123456789-client-123",
    "message_user": "passenger",
    "message_message": "¿En cuánto tiempo llegas?",
    "message_timestamp": "2024-01-15T10:30:00.000Z"
  },
  "tripChange": {
    "tripStatus": 0,
    "tripStatusText": "idle",
    "passenger_boarded": false,
    "payment_confirmed": false,
    "message_number": 1,
    "incident_number": 0
  }
}
```

**Eventos que recibe:**
- `trip-message-p-on` - Solo el mensaje enviado
- `send-change-trip` - Estado actualizado con contador de mensajes

### 6. 💳 **Enviar Pago**
**Evento:** `trip-payment-p-send`  
**Dirección:** `Cliente → Servidor`  
**Propósito:** Confirmar información de pago

```json
{
  "payment_method": "credit_card",
  "amount": 1500,
  "confirmation_code": "PAY123456"
}
```

### 7. 🚀 **Disponible para Iniciar**
**Evento:** `trip-start-available-p-send`  
**Dirección:** `Cliente → Servidor`  
**Propósito:** Indicar que está listo para iniciar el viaje

```json
{
  "ready": true,
  "location": {
    "lat": -34.6037,
    "lon": -58.3816
  }
}
```

---

## 📥 EVENTOS QUE RECIBE EL PASAJERO

### 1. 🔄 **Cambios de Estado del Viaje**
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

### 2. 📍 **Actualización de Ubicación del Conductor**
**Evento:** `driver-location-update`  
**Cuándo:** El conductor envía su ubicación

```json
{
  "lat": -34.6037,
  "lon": -58.3816,
  "timestamp": 1704123456789,
  "driver_id": "driver-456"
}
```

### 3. ⚠️ **Notificación de Incidentes**
**Evento:** `trip-incident-p-on`  
**Cuándo:** Se reporta un incidente (propio o del conductor)

```json
{
  "incident_id": "incident-1704123456789-client-123",
  "incindent_user": "driver",
  "incindent_message": "Problema mecánico en el vehículo",
  "incindent_timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 4. 💬 **Notificación de Mensajes**
**Evento:** `trip-message-p-on`  
**Cuándo:** Se envía un mensaje (propio o del conductor)

```json
{
  "message_id": "msg-1704123456789-client-123",
  "message_user": "driver",
  "message_message": "Llegando en 5 minutos",
  "message_timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 5. 🚫 **Notificación de Cancelación**
**Evento:** `trip-cancel-p-on`  
**Cuándo:** El viaje es cancelado

```json
{
  "cancelled_by": "driver",
  "reason": "Emergencia familiar",
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
socket.on('get-trip-p-on', (tripData) => {
  console.log('Datos del viaje:', tripData);
});

// Escuchar cambios de estado
socket.on('send-change-trip', (tripChange) => {
  console.log('Estado del viaje:', tripChange);
});

// Escuchar ubicación del conductor
socket.on('driver-location-update', (location) => {
  console.log('Ubicación del conductor:', location);
});
```

### Enviar Ubicación
```javascript
socket.emit('location-p-send', {
  lat: -34.6037,
  lon: -58.3816,
  timestamp: Date.now()
});
```

### Reportar Incidente
```javascript
socket.emit('trip-incident-p-send', {
  message: 'El conductor no llegó al punto de encuentro'
});
```

### Cancelar Viaje
```javascript
socket.emit('trip-cancel-p-send', {
  reason: 'Cambio de planes'
});
```

---

## 📝 NOTAS IMPORTANTES

1. **Reconexión:** Al reconectarse, recibirás automáticamente todos los datos del viaje incluyendo incidentes y mensajes acumulados.

2. **Contadores:** Los contadores `message_number` e `incident_number` se incrementan globalmente y se mantienen entre reconexiones.

3. **Broadcast:** Al enviar ubicación, otros clientes (conductores) reciben tu ubicación via `passenger-location-update`.

4. **Estado Global:** El estado del viaje (`tripChange`) es compartido entre todos los clientes conectados.

5. **Timestamps:** Todos los timestamps están en formato ISO 8601 UTC.
