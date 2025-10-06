# Eventos WebSocket en Orden de Flujo

Este documento muestra los eventos WebSocket en el orden en que ocurren durante un viaje completo, desde la solicitud hasta la finalización.

---

## 🔄 FLUJO COMPLETO DE UN VIAJE

### FASE 1: Conexión Inicial
```
┌─────────────────────────────────────────────────────────┐
│ 1. Cliente se conecta al servidor                      │
│    → Namespace: /events                                │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Servidor envía automáticamente (después de 1s):     │
│    📤 get-trip-p-on → Datos iniciales para pasajero    │
│    📤 get-trip-d-on → Datos iniciales para conductor   │
│    Estado inicial: TripStatusV2.idle                   │
└─────────────────────────────────────────────────────────┘
```

**Eventos involucrados:**
- ✅ **Conexión** (automático)
- 📤 `get-trip-p-on` (servidor → cliente)
- 📤 `get-trip-d-on` (servidor → cliente)

**Estado del viaje:** `idle`

---

### FASE 2: Solicitud de Viaje (Pasajero)
```
┌─────────────────────────────────────────────────────────┐
│ 3. Pasajero solicita un viaje                          │
│    📥 trip-request                                      │
│    └─ Incluye: origen, destino, preferencias           │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Servidor procesa la solicitud:                      │
│    • Calcula distancia, duración y tarifa estimada     │
│    • Cambia estado a "searching"                       │
│    • Crea datos del viaje                              │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Servidor notifica cambio de estado                  │
│    📤 send-change-trip → Estado: searching             │
│    (enviado al pasajero)                               │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Servidor busca conductores disponibles              │
│    📤 trip-available → Broadcast a todos los conductores│
│    └─ Incluye: trip_id, datos del pasajero, rutas     │
│    └─ Expira en 30 segundos                            │
└─────────────────────────────────────────────────────────┘
```

**Eventos involucrados:**
- 📥 `trip-request` (pasajero → servidor)
- 📤 `send-change-trip` (servidor → pasajero) - Estado: `searching`
- 📤 `trip-available` (servidor → conductores)

**Estado del viaje:** `searching`

---

### FASE 3: Respuesta del Conductor

#### Opción A: Conductor Acepta
```
┌─────────────────────────────────────────────────────────┐
│ 7a. Conductor acepta el viaje                          │
│     📥 trip-accept                                      │
│     └─ Incluye: trip_id                                │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 8a. Servidor actualiza estado                          │
│     📤 send-change-trip → Estado: driverAccepted       │
│     (broadcast a todos los clientes)                   │
└─────────────────────────────────────────────────────────┘
```

**Eventos involucrados:**
- 📥 `trip-accept` (conductor → servidor)
- 📤 `send-change-trip` (servidor → todos) - Estado: `driverAccepted`

**Estado del viaje:** `driverAccepted`

#### Opción B: Conductor Rechaza
```
┌─────────────────────────────────────────────────────────┐
│ 7b. Conductor rechaza el viaje                         │
│     📥 trip-reject                                      │
│     └─ Incluye: trip_id, reason (opcional)             │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 8b. Servidor busca otro conductor                      │
│     (vuelve a la Fase 2, paso 6)                       │
└─────────────────────────────────────────────────────────┘
```

**Eventos involucrados:**
- 📥 `trip-reject` (conductor → servidor)
- 🔄 Regresa a buscar otro conductor

---

### FASE 4: Conductor en Camino
```
┌─────────────────────────────────────────────────────────┐
│ 9. Conductor envía su ubicación constantemente         │
│    📥 driver-location (o location-d-send)              │
│    └─ Incluye: lat, lon, timestamp                     │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 10. Servidor procesa ubicación y actualiza estado:     │
│     • Update #1 → Estado: driverOnWay                  │
│     • Broadcast ubicación a todos                      │
│     📤 driver-location-update → Todos los clientes     │
│     📤 send-change-trip → Estado actualizado           │
└─────────────────────────────────────────────────────────┘
```

**Eventos involucrados:**
- 📥 `driver-location` o `location-d-send` (conductor → servidor) [continuo]
- 📤 `driver-location-update` (servidor → todos)
- 📤 `send-change-trip` (servidor → todos) - Estado: `driverOnWay`

**Estado del viaje:** `driverOnWay`

---

### FASE 5: Conductor Llega al Punto de Recogida
```
┌─────────────────────────────────────────────────────────┐
│ 11. Conductor sigue enviando ubicación                 │
│     📥 driver-location                                  │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 12. Servidor actualiza estado (Update #2):             │
│     📤 send-change-trip → Estado: driverArrived        │
│     📤 driver-location-update                          │
└─────────────────────────────────────────────────────────┘
```

**Eventos involucrados:**
- 📥 `driver-location` (conductor → servidor) [continuo]
- 📤 `send-change-trip` (servidor → todos) - Estado: `driverArrived`
- 📤 `driver-location-update` (servidor → todos)

**Estado del viaje:** `driverArrived`

---

### FASE 6: Inicio del Viaje
```
┌─────────────────────────────────────────────────────────┐
│ 13. Pasajero indica disponibilidad (opcional)          │
│     📥 trip-start-available-p-send                     │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 14. Conductor continúa enviando ubicación              │
│     📥 driver-location                                  │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 15. Servidor actualiza estado (Update #3):             │
│     📤 send-change-trip → Estado: tripStarted          │
│     • passenger_boarded: true                          │
└─────────────────────────────────────────────────────────┘
```

**Eventos involucrados:**
- 📥 `trip-start-available-p-send` (pasajero → servidor) [opcional]
- 📥 `driver-location` (conductor → servidor)
- 📤 `send-change-trip` (servidor → todos) - Estado: `tripStarted`

**Estado del viaje:** `tripStarted` | `passenger_boarded: true`

---

### FASE 7: Viaje en Progreso
```
┌─────────────────────────────────────────────────────────┐
│ 16. Durante el viaje:                                   │
│     • Conductor envía ubicación continuamente          │
│       📥 driver-location                                │
│     • Pasajero puede enviar ubicación                  │
│       📥 location-p-send                                │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 17. Servidor actualiza estado (Update #4):             │
│     📤 send-change-trip → Estado: tripInProgress       │
│     📤 driver-location-update                          │
└─────────────────────────────────────────────────────────┘
```

**Eventos involucrados:**
- 📥 `driver-location` (conductor → servidor) [continuo]
- 📥 `location-p-send` (pasajero → servidor) [opcional]
- 📤 `send-change-trip` (servidor → todos) - Estado: `tripInProgress`
- 📤 `driver-location-update` (servidor → todos)

**Estado del viaje:** `tripInProgress`

#### Durante el Viaje - Mensajes
```
┌─────────────────────────────────────────────────────────┐
│ Pasajero envía mensaje:                                │
│ 📥 trip-message-p-send                                  │
│ └─ { message: "¿Cuánto falta?" }                       │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ Servidor difunde mensaje:                              │
│ 📤 trip-message-p-on → Todos los clientes             │
│ 📤 send-change-trip → message_number++                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Conductor envía mensaje:                               │
│ 📥 trip-message-d-send                                  │
│ └─ { message: "5 minutos aproximadamente" }            │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ Servidor difunde mensaje:                              │
│ 📤 trip-message-p-on → Todos los clientes             │
│ 📤 send-change-trip → message_number++                │
└─────────────────────────────────────────────────────────┘
```

**Eventos involucrados:**
- 📥 `trip-message-p-send` (pasajero → servidor)
- 📥 `trip-message-d-send` (conductor → servidor)
- 📤 `trip-message-p-on` (servidor → todos)
- 📤 `send-change-trip` (servidor → todos)

#### Durante el Viaje - Incidentes
```
┌─────────────────────────────────────────────────────────┐
│ Pasajero reporta incidente:                            │
│ 📥 trip-incident-p-send                                 │
│ └─ { message: "Hay mucho tráfico" }                    │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ Servidor difunde incidente:                            │
│ 📤 trip-incident-p-on → Todos los clientes            │
│ 📤 send-change-trip → incident_number++               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Conductor reporta incidente:                           │
│ 📥 trip-incident-d-send                                 │
│ └─ { message: "Desvío por obras" }                     │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ Servidor difunde incidente:                            │
│ 📤 trip-incident-p-on → Todos los clientes            │
│ 📤 send-change-trip → incident_number++               │
└─────────────────────────────────────────────────────────┘
```

**Eventos involucrados:**
- 📥 `trip-incident-p-send` (pasajero → servidor)
- 📥 `trip-incident-d-send` (conductor → servidor)
- 📤 `trip-incident-p-on` (servidor → todos)
- 📤 `send-change-trip` (servidor → todos)

#### Consultar Historial
```
┌─────────────────────────────────────────────────────────┐
│ Cliente solicita historial:                            │
│ 📥 get-messages-incidents                               │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ Servidor envía todos los mensajes:                     │
│ 📤 all-messages                                         │
│ └─ { messages: [], tripChange: {...} }                 │
└─────────────────────────────────────────────────────────┘
```

**Eventos involucrados:**
- 📥 `get-messages-incidents` (cliente → servidor)
- 📤 `all-messages` (servidor → cliente)

---

### FASE 8: Finalización del Viaje
```
┌─────────────────────────────────────────────────────────┐
│ 18. Conductor llega al destino                         │
│     📥 driver-location (Update #5)                      │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 19. Servidor actualiza estado:                         │
│     📤 send-change-trip → Estado: tripCompleted        │
│     • passenger_boarded: true                          │
│     • payment_confirmed: true                          │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 20. Pasajero envía información de pago (opcional)      │
│     📥 trip-payment-p-send                              │
│     └─ { payment_type, amount_passenger, amount_driver }│
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 21. Viaje completado ✅                                 │
│     • Estado final: tripCompleted                      │
│     • Secuencia se reinicia si hay más actualizaciones │
└─────────────────────────────────────────────────────────┘
```

**Eventos involucrados:**
- 📥 `driver-location` (conductor → servidor)
- 📤 `send-change-trip` (servidor → todos) - Estado: `tripCompleted`
- 📥 `trip-payment-p-send` (pasajero → servidor) [opcional]

**Estado del viaje:** `tripCompleted` | `payment_confirmed: true`

---

### FASE 9: Cancelación (Flujo Alternativo)

#### Cancelación por Pasajero
```
┌─────────────────────────────────────────────────────────┐
│ Pasajero cancela el viaje:                             │
│ 📥 trip-cancel-p-send                                   │
│ └─ { reason: "Ya no necesito el viaje" }               │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ Servidor actualiza estado:                             │
│ 📤 send-change-trip → Estado: tripCancelled            │
│ 📤 trip-cancel-p-on → Notificación de cancelación     │
│ (broadcast a todos)                                    │
└─────────────────────────────────────────────────────────┘
```

**Eventos involucrados:**
- 📥 `trip-cancel-p-send` (pasajero → servidor)
- 📤 `send-change-trip` (servidor → todos) - Estado: `tripCancelled`
- 📤 `trip-cancel-p-on` (servidor → todos)

**Estado del viaje:** `tripCancelled`

#### Cancelación por Conductor
```
┌─────────────────────────────────────────────────────────┐
│ Conductor cancela el viaje:                            │
│ 📥 trip-cancel-d-send                                   │
│ └─ { reason: "Vehículo con problemas" }                │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ Servidor actualiza estado:                             │
│ 📤 send-change-trip → Estado: tripCancelledByDriver    │
│ (broadcast a todos)                                    │
└─────────────────────────────────────────────────────────┘
```

**Eventos involucrados:**
- 📥 `trip-cancel-d-send` (conductor → servidor)
- 📤 `send-change-trip` (servidor → todos) - Estado: `tripCancelledByDriver`

**Estado del viaje:** `tripCancelledByDriver`

---

## 📊 PROGRESIÓN DE ESTADOS

La progresión automática de estados cuando el conductor envía su ubicación (`driver-location`):

```
Update #1 → driverOnWay         (Conductor en camino)
Update #2 → driverArrived       (Conductor llegó al punto de recogida)
Update #3 → tripStarted         (Viaje iniciado, pasajero a bordo)
Update #4 → tripInProgress      (Viaje en progreso)
Update #5 → tripCompleted       (Viaje completado)
```

---

## 🔄 EVENTOS CONTINUOS

Estos eventos se emiten de forma continua durante el viaje:

### Ubicaciones
- **Conductor:** `driver-location` o `location-d-send` → cada X segundos
- **Pasajero:** `location-p-send` → cada X segundos (opcional)
- **Broadcast:** `driver-location-update` → cada vez que el conductor actualiza

### Estado del Viaje
- **Estado:** `send-change-trip` → cada vez que hay un cambio
- **Sincronización:** Se emite a todos los clientes conectados

---

## 📝 RESUMEN DE ORDEN DE EVENTOS

### Secuencia Exitosa Completa:
1. Conexión inicial
2. `get-trip-p-on` / `get-trip-d-on` (automático)
3. `trip-request` (pasajero solicita viaje)
4. `send-change-trip` (estado: searching)
5. `trip-available` (oferta a conductores)
6. `trip-accept` (conductor acepta)
7. `send-change-trip` (estado: driverAccepted)
8. `driver-location` [continuo]
9. `driver-location-update` [continuo broadcast]
10. `send-change-trip` (estado: driverOnWay)
11. `send-change-trip` (estado: driverArrived)
12. `trip-start-available-p-send` [opcional]
13. `send-change-trip` (estado: tripStarted)
14. `location-p-send` [opcional, continuo]
15. `trip-message-p-send` / `trip-message-d-send` [según necesidad]
16. `trip-message-p-on` [broadcast]
17. `trip-incident-p-send` / `trip-incident-d-send` [según necesidad]
18. `trip-incident-p-on` [broadcast]
19. `get-messages-incidents` [según necesidad]
20. `all-messages` [respuesta]
21. `send-change-trip` (estado: tripInProgress)
22. `send-change-trip` (estado: tripCompleted)
23. `trip-payment-p-send` [opcional]
24. ✅ Viaje finalizado

### Flujos Alternativos:
- **Rechazo:** `trip-reject` → buscar otro conductor
- **Cancelación Pasajero:** `trip-cancel-p-send` → `trip-cancel-p-on`
- **Cancelación Conductor:** `trip-cancel-d-send` → estado tripCancelledByDriver

---

## 🎯 EVENTOS POR ROL

### Pasajero EMITE:
1. `trip-request`
2. `location-p-send`
3. `trip-incident-p-send`
4. `trip-message-p-send`
5. `trip-cancel-p-send`
6. `trip-start-available-p-send`
7. `trip-payment-p-send`
8. `get-messages-incidents`

### Pasajero RECIBE:
1. `get-trip-p-on`
2. `send-change-trip`
3. `trip-incident-p-on`
4. `trip-message-p-on`
5. `trip-cancel-p-on`
6. `driver-location-update`
7. `all-messages`

### Conductor EMITE:
1. `driver-location` / `location-d-send`
2. `trip-accept`
3. `trip-reject`
4. `trip-cancel-d-send`
5. `trip-incident-d-send`
6. `trip-message-d-send`
7. `get-messages-incidents`

### Conductor RECIBE:
1. `get-trip-d-on`
2. `trip-available`
3. `send-change-trip`
4. `trip-incident-p-on`
5. `trip-message-p-on`
6. `all-messages`

### Servidor EMITE (Broadcast):
1. `get-trip-p-on`
2. `get-trip-d-on`
3. `trip-available`
4. `send-change-trip`
5. `driver-location-update`
6. `trip-incident-p-on`
7. `trip-message-p-on`
8. `trip-cancel-p-on`
9. `all-messages`
10. `global.event`

