# 🔄 FLUJO COMPLETO DEL SISTEMA - WebSocket Gateway

## 📋 ÍNDICE
1. [Arquitectura General](#arquitectura-general)
2. [Flujo de Conexión](#flujo-de-conexión)
3. [Flujo de Viaje Completo](#flujo-de-viaje-completo)
4. [Flujo de Mensajes](#flujo-de-mensajes)
5. [Flujo de Incidentes](#flujo-de-incidentes)
6. [Flujo de Ubicación](#flujo-de-ubicación)
7. [Flujo de Cancelación](#flujo-de-cancelación)
8. [Diagrama de Secuencia](#diagrama-de-secuencia)
9. [Casos de Uso](#casos-de-uso)

---

## 🏗️ ARQUITECTURA GENERAL

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│  Cliente        │◄───────►│  WebSocket      │◄───────►│  Cliente        │
│  Pasajero       │  WS     │  Gateway        │  WS     │  Conductor      │
│                 │         │  (NestJS)       │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
        │                           │                           │
        │                           │                           │
        ▼                           ▼                           ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  UI/UX          │         │  Estado Global  │         │  UI/UX          │
│  Pasajero       │         │  - tripChange   │         │  Conductor      │
│                 │         │  - messages[]   │         │                 │
│                 │         │  - incidents[]  │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

### **Componentes del Sistema**

1. **Cliente Pasajero**: Aplicación móvil/web del pasajero
2. **Cliente Conductor**: Aplicación móvil/web del conductor
3. **WebSocket Gateway**: Servidor NestJS que maneja las conexiones
4. **Estado Global**: Datos compartidos entre todos los clientes
5. **Base de Datos** (opcional): Persistencia de datos

---

## 🔌 FLUJO DE CONEXIÓN

### **1. Conexión Inicial**

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│Pasajero │                    │ Gateway │                    │Conductor│
└────┬────┘                    └────┬────┘                    └────┬────┘
     │                              │                              │
     │ 1. connect()                 │                              │
     ├─────────────────────────────►│                              │
     │                              │                              │
     │ 2. get-trip-p-on             │                              │
     │◄─────────────────────────────┤                              │
     │   (datos iniciales)          │                              │
     │                              │                              │
     │                              │  3. connect()                │
     │                              │◄─────────────────────────────┤
     │                              │                              │
     │                              │  4. get-trip-d-on            │
     │                              ├─────────────────────────────►│
     │                              │     (datos iniciales)        │
     │                              │                              │
```

### **2. Datos Enviados en la Conexión**

**Al Pasajero (`get-trip-p-on`):**
```json
{
  "service_id": "trip-123",
  "driverProfile": { ... },
  "carDriverLocation": { lat, lon },
  "tripChange": { 
    "tripStatus": 0,
    "tripStatusText": "idle",
    "message_number": 0,
    "incident_number": 0
  },
  "messages": [],
  "incidents": []
}
```

**Al Conductor (`get-trip-d-on`):**
```json
{
  "service_id": "trip-123",
  "passengerProfile": { ... },
  "tripChange": { ... },
  "messages": [],
  "incidents": []
}
```

---

## 🚗 FLUJO DE VIAJE COMPLETO

### **Secuencia Completa de Estados**

```
 IDLE (0)
    ↓
 SEARCHING (1) ─────────────────► DRIVER_NOT_FOUND (2)
    ↓                                      ↓
 DRIVER_FOUND (3)                      [Reintentar]
    ↓
 DRIVER_ACCEPTED (4)
    ↓
 DRIVER_ON_WAY (5) ◄────────┐
    ↓                        │
 DRIVER_ARRIVED (6)          │ Actualización de
    ↓                        │ ubicación del
 TRIP_STARTED (7)            │ conductor
    ↓                        │ (driver-location)
 TRIP_IN_PROGRESS (8) ◄──────┘
    ↓
 TRIP_COMPLETED (9)
```

### **Flujo con Eventos**

```
1. BÚSQUEDA DE CONDUCTOR
   Cliente: solicita viaje
   ↓
   Servidor: tripStatus = searching (1)
   ↓
   Broadcast: send-change-trip a todos

2. CONDUCTOR ENCONTRADO
   Sistema: encuentra conductor disponible
   ↓
   Servidor: tripStatus = driverFound (3)
   ↓
   Broadcast: send-change-trip

3. CONDUCTOR ACEPTA
   Conductor: acepta viaje
   ↓
   Servidor: tripStatus = driverAccepted (4)
   ↓
   Broadcast: send-change-trip

4. CONDUCTOR EN CAMINO
   Conductor: emit('driver-location', { lat, lon })
   ↓
   Servidor: tripStatus = driverOnWay (5)
   ↓
   Broadcast: send-change-trip + driver-location-update

5. CONDUCTOR LLEGA
   Conductor: emit('driver-location', { lat, lon })
   ↓
   Servidor: tripStatus = driverArrived (6)
   ↓
   Broadcast: send-change-trip + driver-location-update

6. VIAJE INICIA
   Conductor: emit('driver-location', { lat, lon })
   ↓
   Servidor: tripStatus = tripStarted (7)
            passenger_boarded = true
   ↓
   Broadcast: send-change-trip

7. VIAJE EN PROGRESO
   Conductor: emit('driver-location', { lat, lon })
   ↓
   Servidor: tripStatus = tripInProgress (8)
   ↓
   Broadcast: send-change-trip + driver-location-update

8. VIAJE COMPLETADO
   Conductor: emit('driver-location', { lat, lon })
   ↓
   Servidor: tripStatus = tripCompleted (9)
            payment_confirmed = true
   ↓
   Broadcast: send-change-trip
```

---

## 💬 FLUJO DE MENSAJES

### **Envío de Mensaje**

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│Pasajero │                    │ Gateway │                    │Conductor│
└────┬────┘                    └────┬────┘                    └────┬────┘
     │                              │                              │
     │ 1. trip-message-p-send       │                              │
     │      { message: "Hola" }     │                              │
     ├─────────────────────────────►│                              │
     │                              │                              │
     │                              │ 2. Crear mensaje             │
     │                              │    message_number++          │
     │                              │    messages.push()           │
     │                              │                              │
     │ 3. ACK                       │                              │
     │◄─────────────────────────────┤                              │
     │   { success: true,           │                              │
     │     message_data,            │                              │
     │     tripChange }             │                              │
     │                              │                              │
     │ 4. trip-message-p-on         │  4. trip-message-p-on        │
     │◄─────────────────────────────┼─────────────────────────────►│
     │   (solo mensaje)             │     (solo mensaje)           │
     │                              │                              │
     │ 5. send-change-trip          │  5. send-change-trip         │
     │◄─────────────────────────────┼─────────────────────────────►│
     │   (con contador actualizado) │  (con contador actualizado)  │
     │                              │                              │
```

### **Obtener Lista de Mensajes**

```
┌─────────┐                    ┌─────────┐
│ Cliente │                    │ Gateway │
└────┬────┘                    └────┬────┘
     │                              │
     │ 1. get-messages-incidents    │
     ├─────────────────────────────►│
     │                              │
     │ 2. ACK                       │
     │◄─────────────────────────────┤
     │   { success: true }          │
     │                              │
     │ 3. all-messages              │
     │◄─────────────────────────────┤
     │   {                          │
     │     messages: [...],         │
     │     counts: { ... },         │
     │     tripChange: { ... }      │
     │   }                          │
     │                              │
```

### **Estructura de Mensaje**

```json
{
  "message_id": "msg-1704123456789-client-123",
  "message_user": "passenger" | "driver",
  "message_message": "Texto del mensaje",
  "message_timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## ⚠️ FLUJO DE INCIDENTES

### **Reporte de Incidente**

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│Pasajero │                    │ Gateway │                    │Conductor│
└────┬────┘                    └────┬────┘                    └────┬────┘
     │                              │                              │
     │ 1. trip-incident-p-send      │                              │
     │      { message: "Problema" } │                              │
     ├─────────────────────────────►│                              │
     │                              │                              │
     │                              │ 2. Crear incidente           │
     │                              │    incident_number++         │
     │                              │    incidents.push()          │
     │                              │                              │
     │ 3. ACK                       │                              │
     │◄─────────────────────────────┤                              │
     │   { success: true,           │                              │
     │     incident,                │                              │
     │     tripChange }             │                              │
     │                              │                              │
     │ 4. trip-incident-p-on        │  4. trip-incident-p-on       │
     │◄─────────────────────────────┼─────────────────────────────►│
     │   (solo incidente)           │     (solo incidente)         │
     │                              │                              │
     │ 5. send-change-trip          │  5. send-change-trip         │
     │◄─────────────────────────────┼─────────────────────────────►│
     │   (incident_number: 1)       │  (incident_number: 1)        │
     │                              │                              │
```

### **Estructura de Incidente**

```json
{
  "incident_id": "incident-1704123456789-client-123",
  "incindent_user": "passenger" | "driver",
  "incindent_message": "Descripción del incidente",
  "incindent_timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 📍 FLUJO DE UBICACIÓN

### **Actualización de Ubicación (Pasajero)**

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│Pasajero │                    │ Gateway │                    │Conductor│
└────┬────┘                    └────┬────┘                    └────┬────┘
     │                              │                              │
     │ 1. location-p-send           │                              │
     │      { lat, lon }            │                              │
     ├─────────────────────────────►│                              │
     │                              │                              │
     │ 2. send-change-trip          │                              │
     │◄─────────────────────────────┤                              │
     │   (estado actual)            │                              │
     │                              │                              │
     │                              │  3. passenger-location-update│
     │                              ├─────────────────────────────►│
     │                              │     { lat, lon, timestamp,   │
     │                              │       passenger_id }         │
     │                              │                              │
```

### **Actualización de Ubicación (Conductor - Básico)**

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│Pasajero │                    │ Gateway │                    │Conductor│
└────┬────┘                    └────┬────┘                    └────┬────┘
     │                              │                              │
     │                              │  1. location-d-send          │
     │                              │◄─────────────────────────────┤
     │                              │     { lat, lon }             │
     │                              │                              │
     │                              │  2. send-change-trip         │
     │                              ├─────────────────────────────►│
     │                              │     (estado actual)          │
     │                              │                              │
     │ 3. driver-location-update    │                              │
     │◄─────────────────────────────┤                              │
     │   { lat, lon, timestamp,     │                              │
     │     driver_id }              │                              │
     │                              │                              │
```

### **Actualización de Ubicación (Conductor - Con Progresión)**

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│Pasajero │                    │ Gateway │                    │Conductor│
└────┬────┘                    └────┬────┘                    └────┬────┘
     │                              │                              │
     │                              │  1. driver-location          │
     │                              │◄─────────────────────────────┤
     │                              │     { lat, lon }             │
     │                              │                              │
     │                              │  2. Actualizar estado        │
     │                              │     tripStatus++             │
     │                              │     (secuencia automática)   │
     │                              │                              │
     │ 3. send-change-trip          │  3. send-change-trip         │
     │◄─────────────────────────────┼─────────────────────────────►│
     │   (estado avanzado)          │     (estado avanzado)        │
     │                              │                              │
     │ 4. driver-location-update    │                              │
     │◄─────────────────────────────┤                              │
     │   { lat, lon, timestamp,     │                              │
     │     driver_id }              │                              │
     │                              │                              │
```

---

## 🚫 FLUJO DE CANCELACIÓN

### **Cancelación por Pasajero**

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│Pasajero │                    │ Gateway │                    │Conductor│
└────┬────┘                    └────┬────┘                    └────┬────┘
     │                              │                              │
     │ 1. trip-cancel-p-send        │                              │
     │      { reason: "..." }       │                              │
     ├─────────────────────────────►│                              │
     │                              │                              │
     │                              │ 2. tripStatus =              │
     │                              │    tripCancelled (10)        │
     │                              │                              │
     │ 3. ACK                       │                              │
     │◄─────────────────────────────┤                              │
     │   { success: true,           │                              │
     │     tripChange }             │                              │
     │                              │                              │
     │ 4. send-change-trip          │  4. send-change-trip         │
     │◄─────────────────────────────┼─────────────────────────────►│
     │   (tripCancelled)            │     (tripCancelled)          │
     │                              │                              │
```

### **Cancelación por Conductor**

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│Pasajero │                    │ Gateway │                    │Conductor│
└────┬────┘                    └────┬────┘                    └────┬────┘
     │                              │                              │
     │                              │  1. trip-cancel-d-send       │
     │                              │◄─────────────────────────────┤
     │                              │     { reason: "..." }        │
     │                              │                              │
     │                              │  2. tripStatus =             │
     │                              │     tripCancelledByDriver(11)│
     │                              │                              │
     │                              │  3. ACK                      │
     │                              ├─────────────────────────────►│
     │                              │     { success: true,         │
     │                              │       tripChange }           │
     │                              │                              │
     │ 4. send-change-trip          │  4. send-change-trip         │
     │◄─────────────────────────────┼─────────────────────────────►│
     │   (tripCancelledByDriver)    │  (tripCancelledByDriver)     │
     │                              │                              │
```

---

## 📊 DIAGRAMA DE SECUENCIA COMPLETO

### **Viaje de Inicio a Fin**

```
Pasajero          Gateway           Conductor
   │                 │                  │
   ├──connect()─────►│                  │
   │◄get-trip-p-on───┤                  │
   │                 │◄────connect()────┤
   │                 ├──get-trip-d-on──►│
   │                 │                  │
   │                 │                  │
   │ BÚSQUEDA DE CONDUCTOR              │
   │                 │                  │
   │                 │◄driver-location──┤ (1)
   │◄send-change-trip┼──────────────────┤
   │  (driverOnWay)  │                  │
   │                 │                  │
   │                 │◄driver-location──┤ (2)
   │◄send-change-trip┼──────────────────┤
   │  (driverArrived)│                  │
   │                 │                  │
   │                 │                  │
   │ COMUNICACIÓN DURANTE ESPERA        │
   │                 │                  │
   ├trip-message-p───►│                  │
   │  "¿Dónde estás?"│                  │
   │◄trip-message-p──┼─trip-message-p──►│
   │◄send-change-trip┼──────────────────┤
   │  (msg_num: 1)   │                  │
   │                 │                  │
   │                 │◄trip-message-d───┤
   │                 │  "Llegando en 2min"
   │◄trip-message-p──┼─trip-message-p──►│
   │◄send-change-trip┼──────────────────┤
   │  (msg_num: 2)   │                  │
   │                 │                  │
   │                 │                  │
   │ INICIO DEL VIAJE                   │
   │                 │                  │
   │                 │◄driver-location──┤ (3)
   │◄send-change-trip┼──────────────────┤
   │  (tripStarted)  │                  │
   │                 │                  │
   │                 │                  │
   │ VIAJE EN PROGRESO                  │
   │                 │                  │
   ├location-p-send──►│                  │
   │◄send-change-trip┤                  │
   │                 ├passenger-loc────►│
   │                 │                  │
   │                 │◄driver-location──┤ (4)
   │◄send-change-trip┼──────────────────┤
   │  (tripInProgress)│                 │
   │                 │                  │
   │                 │                  │
   │ FINALIZACIÓN                       │
   │                 │                  │
   │                 │◄driver-location──┤ (5)
   │◄send-change-trip┼──────────────────┤
   │  (tripCompleted)│                  │
   │                 │                  │
   │──disconnect()───►│                  │
   │                 │◄───disconnect()──┤
```

---

## 🎯 CASOS DE USO

### **Caso de Uso 1: Viaje Normal Exitoso**

1. Pasajero se conecta y solicita viaje
2. Sistema busca conductor disponible
3. Conductor acepta y se dirige al punto de encuentro
4. Conductor actualiza ubicación periódicamente
5. Pasajero y conductor intercambian mensajes
6. Conductor llega, pasajero aborda
7. Viaje se completa sin incidentes
8. Ambos desconectan

### **Caso de Uso 2: Viaje con Incidente**

1. Viaje en progreso
2. Pasajero reporta incidente: "Conductor tomó ruta incorrecta"
3. Sistema incrementa contador de incidentes
4. Ambos reciben notificación del incidente
5. Conductor responde con mensaje
6. Viaje continúa normalmente
7. Viaje se completa
8. Incidente queda registrado en el historial

### **Caso de Uso 3: Cancelación de Viaje**

1. Viaje en estado "driverOnWay"
2. Pasajero decide cancelar (cambio de planes)
3. Sistema cambia estado a "tripCancelled"
4. Conductor recibe notificación de cancelación
5. Sistema procesa reembolso/penalización
6. Ambos desconectan

### **Caso de Uso 4: Reconexión del Cliente**

1. Cliente pierde conexión durante viaje
2. Cliente se reconecta
3. Sistema envía datos completos del viaje:
   - Estado actual (tripChange)
   - Todos los mensajes acumulados
   - Todos los incidentes registrados
4. Cliente continúa desde donde quedó

### **Caso de Uso 5: Chat entre Pasajero y Conductor**

1. Pasajero envía: "¿En cuánto llegas?"
2. Conductor recibe notificación de mensaje
3. Conductor responde: "5 minutos"
4. Pasajero recibe respuesta
5. Pasajero solicita historial completo de mensajes
6. Sistema envía todos los mensajes via `all-messages`
7. Conversación continúa

---

## 📈 MÉTRICAS Y MONITOREO

### **Eventos Importantes a Monitorear**

1. **Conexiones**: Total de conexiones activas
2. **Mensajes**: Total enviados/recibidos
3. **Incidentes**: Número por viaje
4. **Latencia**: Tiempo de respuesta promedio
5. **Errores**: Conexiones fallidas, timeouts
6. **Estados**: Distribución de estados de viaje

### **KPIs del Sistema**

- Tiempo promedio de viaje
- Tasa de cancelación
- Mensajes promedio por viaje
- Incidentes por 100 viajes
- Tiempo de respuesta del servidor

---

## 🔒 SEGURIDAD

### **Consideraciones de Seguridad**

1. **Autenticación**: Validar identidad del cliente
2. **Autorización**: Verificar permisos por evento
3. **Encriptación**: Usar WSS en producción
4. **Rate Limiting**: Limitar eventos por cliente
5. **Validación**: Validar payloads de entrada
6. **Logging**: Registrar eventos críticos

---

## 📚 RESUMEN

Este sistema WebSocket proporciona:

- ✅ Comunicación en tiempo real bidireccional
- ✅ Estado global compartido entre clientes
- ✅ Sistema de mensajería con persistencia
- ✅ Reporte y tracking de incidentes
- ✅ Tracking de ubicación en tiempo real
- ✅ Progresión automática de estados de viaje
- ✅ Manejo de reconexión con sincronización
- ✅ Sistema de contadores globales
- ✅ Broadcast de eventos a todos los clientes

**Para más detalles, consulta:**
- [Guía de Integración](./INTEGRACION.md)
- [Eventos de Pasajero](./PASAJERO_EVENTOS.md)
- [Eventos de Conductor](./CONDUCTOR_EVENTOS.md)
