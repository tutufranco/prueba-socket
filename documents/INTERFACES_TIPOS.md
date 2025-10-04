# 📋 INTERFACES Y TIPOS DE DATOS - WebSocket Gateway

## 🏗️ ESTRUCTURA DE DATOS PRINCIPAL

### 📱 Datos del Viaje para Pasajero
```typescript
interface sendTripPassanger {
  service_id: string;
  tripStops: tripStops;
  driverProfile: tripDriver;
  carDriverLocation: carLocation;
  tripChange: tripChange;
  filters: filtersIntravel;
  payment: PaymentInTravel;
  incident: tripIncident[];
  message: tripMessage[];
}
```

### 🚗 Datos del Viaje para Conductor
```typescript
interface sendTripDriver {
  service_id: string;
  tripStops: tripStops;
  passengerProfile: tripPassanger;
  tripChange: tripChange;
  filters: filtersIntravel;
  payment: PaymentInTravel;
  incident: tripIncident[];
  message: tripMessage[];
}
```

---

## 🚦 ESTADO DEL VIAJE

### Cambio de Estado del Viaje
```typescript
interface tripChange {
  tripStatus: TripStatusV2;
  tripStatusText: string;
  passenger_boarded: boolean;
  payment_confirmed: boolean;
  message_number: number;
  incident_number: number;
}
```

### Enum de Estados del Viaje
```typescript
enum TripStatusV2 {
  idle = 0,                    // Inactivo
  searching = 1,               // Buscando conductor
  driverNotFound = 2,          // Conductor no encontrado
  driverFound = 3,             // Conductor encontrado
  driverAccepted = 4,          // Conductor aceptó
  driverOnWay = 5,             // Conductor en camino
  driverArrived = 6,           // Conductor llegó
  tripStarted = 7,             // Viaje iniciado
  tripInProgress = 8,          // Viaje en progreso
  tripCompleted = 9,           // Viaje completado
  tripCancelled = 10,          // Viaje cancelado
  tripCancelledByDriver = 11,  // Viaje cancelado por conductor
  error = 12,                  // Error
}
```

### Función de Conversión de Estado
```typescript
function getTripStatusText(status: TripStatusV2): string {
  switch (status) {
    case TripStatusV2.idle: return 'idle';
    case TripStatusV2.searching: return 'searching';
    case TripStatusV2.driverNotFound: return 'driverNotFound';
    case TripStatusV2.driverFound: return 'driverFound';
    case TripStatusV2.driverAccepted: return 'driverAccepted';
    case TripStatusV2.driverOnWay: return 'driverOnWay';
    case TripStatusV2.driverArrived: return 'driverArrived';
    case TripStatusV2.tripStarted: return 'tripStarted';
    case TripStatusV2.tripInProgress: return 'tripInProgress';
    case TripStatusV2.tripCompleted: return 'tripCompleted';
    case TripStatusV2.tripCancelled: return 'tripCancelled';
    case TripStatusV2.tripCancelledByDriver: return 'tripCancelledByDriver';
    case TripStatusV2.error: return 'error';
  }
}
```

---

## 👥 PERFILES DE USUARIO

### Perfil del Conductor
```typescript
interface tripDriver {
  driver_id: string;
  full_name: string;
  qualifications: number;      // Calificación de 0 a 5
  selfie: string;              // URL de la foto
  total_trips: number;         // Total de viajes realizados
  car_model: string;           // Modelo del vehículo
  car_color: string;           // Color del vehículo
  car_plate: string;           // Patente del vehículo
  phone: string;               // Teléfono de contacto
}
```

### Perfil del Pasajero
```typescript
interface tripPassanger {
  passenger_id: string;
  full_name: string;
  qualifications: number;      // Calificación de 0 a 5
  selfie: string;              // URL de la foto
  total_trips: number;         // Total de viajes realizados
  phone: string;               // Teléfono de contacto
}
```

---

## 🗺️ UBICACIÓN Y PARADAS

### Ubicación del Vehículo
```typescript
interface carLocation {
  lat: number;                 // Latitud
  lon: number;                 // Longitud
}
```

### Datos de Ubicación (para eventos)
```typescript
interface LocationData {
  lat: number;
  lon: number;
  timestamp?: number;          // Timestamp opcional
}
```

### Paradas del Viaje
```typescript
interface tripStops {
  start_address: stopInTravel; // Dirección de inicio
  end_address: stopInTravel;   // Dirección de destino
  stops: stopInTravel[];       // Paradas intermedias
}
```

### Parada Individual
```typescript
interface stopInTravel {
  address: string;             // Dirección textual
  lat: number;                 // Latitud
  lon: number;                 // Longitud
  status: boolean;             // Estado de la parada
  index: number;               // Índice en la secuencia
}
```

---

## 💰 PAGO Y FILTROS

### Información de Pago
```typescript
interface PaymentInTravel {
  payment_type: string;        // Tipo de pago (ej: "credit_card")
  amount_passenger: number;    // Monto para el pasajero
  amount_driver: number;       // Monto para el conductor
}
```

### Filtros del Viaje
```typescript
interface filtersIntravel {
  luggage: boolean;            // Equipaje
  pets: boolean;               // Mascotas
  packages: boolean;           // Paquetes
  wheelchair: boolean;         // Silla de ruedas
}
```

---

## 📝 INCIDENTES Y MENSAJES

### Incidente del Viaje
```typescript
interface tripIncident {
  incident_id: string;         // ID único del incidente
  incindent_user: "driver" | "passenger";  // Usuario que reportó
  incindent_message: string;   // Mensaje del incidente
  incindent_timestamp: string; // Timestamp en formato ISO
}
```

### Mensaje del Viaje
```typescript
interface tripMessage {
  message_id: string;          // ID único del mensaje
  message_user: "driver" | "passenger";  // Usuario que envió
  message_message: string;     // Contenido del mensaje
  message_timestamp: string;   // Timestamp en formato ISO
}
```

---

## 🔌 EVENTOS DE WEBSOCKET

### Eventos de Pasajero
```typescript
type PassengerEvent = 
  | "get-trip-p-on"           // Solicitar datos del viaje
  | "location-p-send"         // Enviar ubicación
  | "trip-incident-p-on"      // Recibir notificación de incidente
  | "trip-cancel-p-send"      // Cancelar viaje
  | "trip-cancel-p-on"        // Recibir notificación de cancelación
  | "trip-start-available-p-send"  // Disponible para iniciar
  | "trip-message-p-on"       // Recibir notificación de mensaje
  | "trip-payment-p-send"     // Enviar información de pago
  | "trip-message-p-send";    // Enviar mensaje
```

### Eventos de Conductor
```typescript
type DriverEvent = 
  | "get-trip-d-on"           // Solicitar datos del viaje
  | "driver-location"         // Enviar ubicación con progresión
  | "location-d-send"         // Enviar ubicación básica
  | "driver-location-update"  // Recibir actualización de ubicación
  | "trip-cancel-d-send";     // Cancelar viaje
```

### Eventos Compartidos
```typescript
type SharedEvent = 
  | "send-change-trip"        // Cambio de estado del viaje
  | "global.event";           // Evento global genérico
```

### Todos los Eventos
```typescript
type SocketEvent = PassengerEvent | DriverEvent | SharedEvent;
```

---

## 📦 OBJETO DE EVENTOS ORGANIZADO

```typescript
const SOCKET_EVENTS = {
  // Eventos de Pasajero
  PASSENGER: {
    GET_TRIP: "get-trip-p-on",
    LOCATION_SEND: "location-p-send",
    INCIDENT_ON: "trip-incident-p-on",
    CANCEL_SEND: "trip-cancel-p-send",
    CANCEL_ON: "trip-cancel-p-on",
    START_AVAILABLE: "trip-start-available-p-send",
    MESSAGE_ON: "trip-message-p-on",
    PAYMENT_SEND: "trip-payment-p-send",
    MESSAGE_SEND: "trip-message-p-send",
  },
  
  // Eventos de Conductor
  DRIVER: {
    GET_TRIP: "get-trip-d-on",
    LOCATION: "driver-location",
    LOCATION_SEND: "location-d-send",
    LOCATION_UPDATE: "driver-location-update",
    CANCEL_SEND: "trip-cancel-d-send",
  },
  
  // Eventos Compartidos
  SHARED: {
    CHANGE_TRIP: "send-change-trip",
    GLOBAL_EVENT: "global.event",
  }
} as const;
```

---

## 🛠️ FUNCIONES HELPER

### Construir Datos del Viaje para Pasajero
```typescript
function buildSendTripPassanger(options: {
  trip_status: TripStatusV2;
  service_id?: string;
  // ... otros parámetros opcionales
}): sendTripPassanger
```

### Construir Datos del Viaje para Conductor
```typescript
function buildSendTripDriver(options: {
  trip_status: TripStatusV2;
  service_id?: string;
  // ... otros parámetros opcionales
}): sendTripDriver
```

### Construir Cambio de Estado
```typescript
function buildTripChange(options: {
  tripStatus: TripStatusV2;
  passenger_boarded?: boolean;
  payment_confirmed?: boolean;
  message_number?: number;
  incident_number?: number;
}): tripChange
```

---

## 📝 EJEMPLOS DE USO

### Crear un Incidente
```typescript
const incident: tripIncident = {
  incident_id: `incident-${Date.now()}-${clientId}`,
  incindent_user: "passenger",
  incindent_message: "El conductor no llegó al punto de encuentro",
  incindent_timestamp: new Date().toISOString()
};
```

### Crear un Mensaje
```typescript
const message: tripMessage = {
  message_id: `msg-${Date.now()}-${clientId}`,
  message_user: "driver",
  message_message: "Llegando en 5 minutos",
  message_timestamp: new Date().toISOString()
};
```

### Crear un Cambio de Estado
```typescript
const tripChange: tripChange = {
  tripStatus: TripStatusV2.driverOnWay,
  tripStatusText: "driverOnWay",
  passenger_boarded: false,
  payment_confirmed: false,
  message_number: 0,
  incident_number: 0
};
```

### Crear Datos de Ubicación
```typescript
const location: LocationData = {
  lat: -34.6037,
  lon: -58.3816,
  timestamp: Date.now()
};
```

---

## 🔍 VALIDACIONES IMPORTANTES

1. **IDs Únicos:** Todos los IDs deben ser únicos (usar timestamp + clientId)
2. **Timestamps:** Usar formato ISO 8601 para timestamps
3. **Coordenadas:** Latitud y longitud deben ser números válidos
4. **Estados:** Usar solo valores del enum `TripStatusV2`
5. **Arrays:** `incident` y `message` son arrays que se acumulan
6. **Contadores:** `message_number` e `incident_number` se incrementan globalmente

---

## 📚 REFERENCIAS

- **Archivo de Interfaces:** `src/socket/interface.ts`
- **Archivo de Constantes:** `src/socket/const.ts`
- **Archivo de Helpers:** `src/socket/helpers.ts`
- **Gateway Principal:** `src/socket/socket.gateway.ts`
