# Eventos WebSocket por Categoría

Este documento lista todos los eventos WebSocket organizados por categoría (Pasajero, Conductor, Servidor) con sus DTOs correspondientes.

---

## 📱 EVENTOS DE PASAJERO (Passenger Events)

### 1. `get-trip-p-on`
**Descripción:** Pasajero solicita datos iniciales del viaje  
**Dirección:** Cliente emite → Servidor responde con el mismo evento  
**DTO Request:** Ninguno (solo conexión)  
**DTO Response:**
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

---

### 2. `location-p-send`
**Descripción:** Pasajero envía su ubicación  
**Dirección:** Cliente emite → Servidor procesa  
**DTO Request:**
```typescript
interface LocationData {
  lat: number;
  lon: number;
  timestamp?: number;
}
```
**DTO Response:**
```typescript
{
  success: boolean;
  message: string;
  location: { lat: number; lon: number };
  tripChange: tripChange;
}
```

---

### 3. `trip-incident-p-on`
**Descripción:** Notificación de incidente en el viaje (pasajero recibe)  
**Dirección:** Servidor emite → Cliente recibe  
**DTO:**
```typescript
interface tripIncident {
  incident_id: string;
  incindent_user: "driver" | "passenger";
  incindent_message: string;
  incindent_timestamp: string;
}
```

---

### 4. `trip-incident-p-send`
**Descripción:** Pasajero envía incidente  
**Dirección:** Cliente emite → Servidor procesa y difunde  
**DTO Request:**
```typescript
{
  message: string;  // Mensaje del incidente
}
```
**DTO Response:**
```typescript
{
  success: boolean;
  message: string;
  incident: tripIncident;
  tripChange: tripChange;
}
```

---

### 5. `trip-message-p-send`
**Descripción:** Pasajero envía mensaje  
**Dirección:** Cliente emite → Servidor procesa y difunde  
**DTO Request:**
```typescript
{
  message: string;  // Contenido del mensaje
}
```
**DTO Response:**
```typescript
{
  success: boolean;
  message: string;
  message_data: tripMessage;
  tripChange: tripChange;
}
```

---

### 6. `trip-message-p-on`
**Descripción:** Notificación de mensaje del viaje (pasajero recibe)  
**Dirección:** Servidor emite → Cliente recibe  
**DTO:**
```typescript
interface tripMessage {
  message_id: string;
  message_user: "driver" | "passenger";
  message_message: string;
  message_timestamp: string;
}
```

---

### 7. `trip-cancel-p-send`
**Descripción:** Pasajero solicita cancelar el viaje  
**Dirección:** Cliente emite → Servidor procesa  
**DTO Request:**
```typescript
{
  reason?: string;  // Razón de cancelación (opcional)
}
```
**DTO Response:**
```typescript
{
  success: boolean;
  message: string;
  tripChange: tripChange;
}
```

---

### 8. `trip-cancel-p-on`
**Descripción:** Notificación de cancelación de viaje (pasajero recibe)  
**Dirección:** Servidor emite → Cliente recibe  
**DTO:**
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

---

### 9. `trip-start-available-p-send`
**Descripción:** Pasajero indica que está disponible para iniciar viaje  
**Dirección:** Cliente emite → Servidor procesa  
**DTO Request:**
```typescript
{
  available: boolean;
}
```

---

### 10. `trip-payment-p-send`
**Descripción:** Pasajero envía información de pago  
**Dirección:** Cliente emite → Servidor procesa  
**DTO Request:**
```typescript
interface PaymentInTravel {
  payment_type: string;
  amount_passenger: number;
  amount_driver: number;
}
```

---

### 11. `trip-request`
**Descripción:** Pasajero solicita un viaje  
**Dirección:** Cliente emite → Servidor busca conductores disponibles  
**DTO Request:**
```typescript
interface tripRequest {
  pickup_location: {
    address: string;
    lat: number;
    lon: number;
  };
  dropoff_location: {
    address: string;
    lat: number;
    lon: number;
  };
  passenger_id?: string;
  passenger_name?: string;
  passenger_rating?: number;
  payment_method?: string;
  notes?: string;
}
```
**DTO Response:**
```typescript
{
  success: boolean;
  message: string;
  trip_id: string;
  estimated_distance: number;
  estimated_duration: number;
  estimated_fare: number;
  tripChange: tripChange;
}
```

---

## 🚗 EVENTOS DE CONDUCTOR (Driver Events)

### 1. `get-trip-d-on`
**Descripción:** Conductor solicita datos iniciales del viaje  
**Dirección:** Cliente emite → Servidor responde  
**DTO Request:** Ninguno (solo conexión)  
**DTO Response:**
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

### 2. `driver-location`
**Descripción:** Conductor envía su ubicación (con progresión automática de estados)  
**Dirección:** Cliente emite → Servidor procesa y difunde  
**DTO Request:**
```typescript
interface LocationData {
  lat: number;
  lon: number;
  timestamp?: number;
}
```
**DTO Response:**
```typescript
{
  success: boolean;
  message: string;
  tripStatus: TripStatusV2;
  updateCount: number;
  progress: string;
  tripChange: tripChange;
}
```

---

### 3. `location-d-send`
**Descripción:** Conductor envía su ubicación (alternativo)  
**Dirección:** Cliente emite → Servidor procesa y difunde  
**DTO Request:**
```typescript
interface LocationData {
  lat: number;
  lon: number;
  timestamp?: number;
}
```
**DTO Response:**
```typescript
{
  success: boolean;
  message: string;
  location: { lat: number; lon: number };
  tripChange: tripChange;
}
```

---

### 4. `driver-location-update`
**Descripción:** Actualización de ubicación del conductor (todos reciben)  
**Dirección:** Servidor emite → Todos los clientes reciben  
**DTO:**
```typescript
{
  lat: number;
  lon: number;
  timestamp: number;
  driver_id: string;
}
```

---

### 5. `trip-cancel-d-send`
**Descripción:** Conductor cancela el viaje  
**Dirección:** Cliente emite → Servidor procesa y notifica  
**DTO Request:**
```typescript
{
  reason?: string;  // Razón de cancelación (opcional)
}
```
**DTO Response:**
```typescript
{
  success: boolean;
  message: string;
  tripChange: tripChange;
}
```

---

### 6. `trip-available`
**Descripción:** Viaje disponible para conductor  
**Dirección:** Servidor emite → Conductor recibe oferta de viaje  
**DTO:**
```typescript
interface tripAvailable {
  trip_id: string;
  passenger_id: string;
  passenger_name: string;
  passenger_rating: number;
  pickup_location: {
    address: string;
    lat: number;
    lon: number;
  };
  dropoff_location: {
    address: string;
    lat: number;
    lon: number;
  };
  estimated_distance: number; // en kilómetros
  estimated_duration: number; // en minutos
  estimated_fare: number; // precio estimado
  request_time: string; // timestamp ISO
  expires_at: string; // timestamp ISO cuando expira la oferta
}
```

---

### 7. `trip-accept`
**Descripción:** Conductor acepta el viaje  
**Dirección:** Cliente emite → Servidor procesa y asigna viaje  
**DTO Request:**
```typescript
{
  trip_id: string;
}
```
**DTO Response:**
```typescript
{
  success: boolean;
  message: string;
  trip_id: string;
  tripChange: tripChange;
}
```

---

### 8. `trip-reject`
**Descripción:** Conductor rechaza el viaje  
**Dirección:** Cliente emite → Servidor procesa y busca otro conductor  
**DTO Request:**
```typescript
{
  trip_id: string;
  reason?: string;
}
```
**DTO Response:**
```typescript
{
  success: boolean;
  message: string;
  trip_id: string;
  reason: string;
}
```

---

### 9. `trip-incident-d-send`
**Descripción:** Conductor envía incidente  
**Dirección:** Cliente emite → Servidor procesa y difunde  
**DTO Request:**
```typescript
{
  message: string;  // Mensaje del incidente
}
```
**DTO Response:**
```typescript
{
  success: boolean;
  message: string;
  incident: tripIncident;
  tripChange: tripChange;
}
```

---

### 10. `trip-message-d-send`
**Descripción:** Conductor envía mensaje  
**Dirección:** Cliente emite → Servidor procesa y difunde  
**DTO Request:**
```typescript
{
  message: string;  // Contenido del mensaje
}
```
**DTO Response:**
```typescript
{
  success: boolean;
  message: string;
  message_data: tripMessage;
  tripChange: tripChange;
}
```

---

## 🌐 EVENTOS COMPARTIDOS (Shared Events)

### 1. `send-change-trip`
**Descripción:** Cambio en el estado del viaje  
**Dirección:** Bidireccional: Cliente envía cambios O Servidor notifica cambios  
**DTO:**
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

---

### 2. `get-messages-incidents`
**Descripción:** Solicitar lista de mensajes e incidentes  
**Dirección:** Cliente emite → Servidor responde con listas completas  
**DTO Request:** Ninguno  
**DTO Response:** Se envía mediante el evento `all-messages`

---

### 3. `all-messages`
**Descripción:** Respuesta con todos los mensajes e incidentes  
**Dirección:** Servidor emite → Cliente recibe listas completas  
**DTO:**
```typescript
{
  success: boolean;
  message: string;
  data: {
    messages: tripMessage[];
    counts: {
      message_number: number;
    };
    tripChange: tripChange;
  };
}
```

---

### 4. `global.event`
**Descripción:** Evento global genérico (desde EventEmitter)  
**Dirección:** Servidor emite eventos dinámicos  
**DTO:**
```typescript
interface GlobalEvent {
  event: string;
  data: any;
}
```

---

## 📊 INTERFACES Y TIPOS AUXILIARES

### TripStatusV2 (Enum)
```typescript
enum TripStatusV2 {
  idle = 0,
  searching = 1,
  driverNotFound = 2,
  driverFound = 3,
  driverAccepted = 4,
  driverOnWay = 5,
  driverArrived = 6,
  tripStarted = 7,
  tripInProgress = 8,
  tripCompleted = 9,
  tripCancelled = 10,
  tripCancelledByDriver = 11,
  error = 12,
}
```

### tripStops
```typescript
interface tripStops {
  start_address: stopInTravel;
  end_address: stopInTravel;
  stops: stopInTravel[];
}

interface stopInTravel {
  address: string;
  lat: number;
  lon: number;
  status: boolean;
  index: number;
}
```

### tripDriver
```typescript
interface tripDriver {
  driver_id: string;
  full_name: string;
  qualifications: number;
  selfie: string;
  total_trips: number;
  car_model: string;
  car_color: string;
  car_plate: string;
  phone: string;
}
```

### tripPassanger
```typescript
interface tripPassanger {
  passenger_id: string;
  full_name: string;
  qualifications: number;
  selfie: string;
  total_trips: number;
  phone: string;
}
```

### filtersIntravel
```typescript
interface filtersIntravel {
  luggage: boolean;
  pets: boolean;
  packages: boolean;
  wheelchair: boolean;
}
```

### carLocation
```typescript
interface carLocation {
  lat: number;
  lon: number;
}
```

---

## 📝 Notas Importantes

1. **Namespace:** Todos los eventos se emiten en el namespace `/events`
2. **CORS:** El servidor acepta conexiones de cualquier origen (`*`)
3. **Broadcasts:** Muchos eventos se difunden a todos los clientes conectados
4. **Estado Global:** El servidor mantiene un estado compartido del viaje (`tripChange`)
5. **Timeout:** Las ofertas de viaje (`trip-available`) expiran después de 30 segundos

