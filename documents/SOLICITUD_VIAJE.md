# 🚕 SOLICITUD DE VIAJE - Flujo Completo

## 📋 DESCRIPCIÓN

Sistema completo para que un pasajero solicite un viaje, el servidor busque conductores disponibles y envíe la oferta a los conductores para que acepten o rechacen.

---

## 🔄 FLUJO COMPLETO

```
1. PASAJERO SOLICITA VIAJE
   Pasajero → trip-request
   {
     pickup_location: { address, lat, lon },
     dropoff_location: { address, lat, lon }
   }
        ↓
2. SERVIDOR PROCESA SOLICITUD
   - Calcula distancia (Haversine)
   - Calcula duración estimada
   - Calcula tarifa estimada
   - Cambia estado a "searching"
        ↓
3. SERVIDOR BUSCA CONDUCTORES
   - Busca conductores disponibles
   - Broadcast a todos los conductores
        ↓
4. CONDUCTORES RECIBEN OFERTA
   Servidor → trip-available
   {
     trip_id, passenger_info,
     pickup, dropoff,
     estimated_distance, duration, fare
   }
        ↓
5. CONDUCTOR DECIDE (30 segundos)
   ┌─────────┴─────────┐
   ↓                   ↓
ACEPTA            RECHAZA
trip-accept       trip-reject
   ↓                   ↓
Estado:           Buscar otro
driverAccepted    conductor
   ↓
6. VIAJE ASIGNADO
   - Pasajero recibe confirmación
   - Estado cambia a driverAccepted
   - Inicia flujo del viaje
```

---

## 📡 EVENTOS IMPLEMENTADOS

### 1. **`trip-request`** (Pasajero → Servidor)

**Descripción:** El pasajero solicita un viaje.

**Datos a enviar:**
```json
{
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
  "passenger_id": "passenger-123",
  "passenger_name": "María García",
  "passenger_rating": 4.8,
  "payment_method": "credit_card",
  "notes": "Tengo una maleta grande"
}
```

**Respuesta del servidor:**
```json
{
  "success": true,
  "message": "Buscando conductor disponible...",
  "trip_id": "trip-1704123456789",
  "estimated_distance": 2.5,
  "estimated_duration": 8,
  "estimated_fare": 875,
  "tripChange": {
    "tripStatus": 1,
    "tripStatusText": "searching",
    "passenger_boarded": false,
    "payment_confirmed": false,
    "message_number": 0,
    "incident_number": 0
  }
}
```

**Eventos que recibe el pasajero:**
- `send-change-trip` - Estado cambia a "searching"

### 2. **`trip-available`** (Servidor → Conductor)

**Descripción:** El servidor envía el viaje disponible a los conductores.

**Datos enviados:**
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
  "estimated_duration": 8,
  "estimated_fare": 875,
  "request_time": "2024-01-15T10:30:00.000Z",
  "expires_at": "2024-01-15T10:30:30.000Z"
}
```

### 3. **`trip-accept`** (Conductor → Servidor)

**Descripción:** El conductor acepta el viaje.

**Datos a enviar:**
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

**Eventos broadcast:**
- `send-change-trip` → Pasajero y conductor reciben nuevo estado

### 4. **`trip-reject`** (Conductor → Servidor)

**Descripción:** El conductor rechaza el viaje.

**Datos a enviar:**
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

**Nota:** El sistema busca otro conductor disponible.

---

## 💻 IMPLEMENTACIÓN EN SERVIDOR

El handler ya está implementado en el gateway:

```typescript
// src/socket/socket.gateway.ts

@SubscribeMessage(TRIP_REQUEST)
onTripRequest(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
  // 1. Calcular estimaciones
  const estimatedDistance = this.calculateDistance(
    data.pickup_location.lat,
    data.pickup_location.lon,
    data.dropoff_location.lat,
    data.dropoff_location.lon
  );
  
  // 2. Crear viaje
  const tripData = {
    trip_id: `trip-${Date.now()}`,
    passenger_id: data.passenger_id || client.id,
    passenger_name: data.passenger_name || 'Pasajero',
    passenger_rating: data.passenger_rating || 5.0,
    pickup_location: data.pickup_location,
    dropoff_location: data.dropoff_location,
    estimated_distance: estimatedDistance,
    estimated_duration: Math.round(estimatedDistance * 3),
    estimated_fare: Math.round(estimatedDistance * 350),
  };
  
  // 3. Cambiar estado a "searching"
  this.tripChange = buildTripChange({
    tripStatus: TripStatusV2.searching,
  });
  
  // 4. Notificar al pasajero
  client.emit(SEND_CHANGE_TRIP, this.tripChange);
  
  // 5. Buscar conductores y enviar viaje
  this.broadcastTripToDrivers(tripData);
  
  return { success: true, trip_id: tripData.trip_id };
}
```

---

## 📱 IMPLEMENTACIÓN EN FLUTTER (PASAJERO)

### Actualizar PassengerService

```dart
// lib/services/passenger_service.dart

// Método para solicitar viaje
void requestTrip({
  required String pickupAddress,
  required double pickupLat,
  required double pickupLon,
  required String dropoffAddress,
  required double dropoffLat,
  required double dropoffLon,
  String? passengerId,
  String? passengerName,
  double? passengerRating,
  String? paymentMethod,
  String? notes,
}) {
  _ws.emit('trip-request', {
    'pickup_location': {
      'address': pickupAddress,
      'lat': pickupLat,
      'lon': pickupLon,
    },
    'dropoff_location': {
      'address': dropoffAddress,
      'lat': dropoffLat,
      'lon': dropoffLon,
    },
    'passenger_id': passengerId,
    'passenger_name': passengerName,
    'passenger_rating': passengerRating,
    'payment_method': paymentMethod,
    'notes': notes,
  });
  print('🚕 Viaje solicitado');
}
```

### Pantalla de Solicitud de Viaje

```dart
// lib/screens/request_trip_screen.dart
import 'package:flutter/material.dart';
import '../services/passenger_service.dart';

class RequestTripScreen extends StatefulWidget {
  @override
  _RequestTripScreenState createState() => _RequestTripScreenState();
}

class _RequestTripScreenState extends State<RequestTripScreen> {
  final PassengerService _passengerService = PassengerService();
  
  // Controladores
  final TextEditingController _pickupController = TextEditingController();
  final TextEditingController _dropoffController = TextEditingController();
  
  // Ubicaciones (en producción, usar Google Places o similar)
  double? _pickupLat;
  double? _pickupLon;
  double? _dropoffLat;
  double? _dropoffLon;
  
  bool _isSearching = false;

  @override
  void initState() {
    super.initState();
    _listenToTripStatus();
  }

  void _listenToTripStatus() {
    _passengerService.tripStatusStream.listen((status) {
      if (status.tripStatusText == 'searching') {
        setState(() {
          _isSearching = true;
        });
      } else if (status.tripStatusText == 'driverAccepted') {
        setState(() {
          _isSearching = false;
        });
        _showDriverAcceptedDialog();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Solicitar Viaje'),
      ),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            // Origen
            Card(
              child: ListTile(
                leading: Icon(Icons.my_location, color: Colors.green),
                title: TextField(
                  controller: _pickupController,
                  decoration: InputDecoration(
                    hintText: '¿Dónde estás?',
                    border: InputBorder.none,
                  ),
                  onTap: () => _selectLocation(true),
                ),
              ),
            ),
            SizedBox(height: 16),
            
            // Destino
            Card(
              child: ListTile(
                leading: Icon(Icons.location_on, color: Colors.red),
                title: TextField(
                  controller: _dropoffController,
                  decoration: InputDecoration(
                    hintText: '¿A dónde vas?',
                    border: InputBorder.none,
                  ),
                  onTap: () => _selectLocation(false),
                ),
              ),
            ),
            
            Spacer(),
            
            // Botón de solicitar
            if (_isSearching)
              Column(
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text(
                    'Buscando conductor...',
                    style: TextStyle(fontSize: 18),
                  ),
                ],
              )
            else
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _canRequestTrip() ? _requestTrip : null,
                  style: ElevatedButton.styleFrom(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    backgroundColor: Colors.blue,
                  ),
                  child: Text(
                    'SOLICITAR VIAJE',
                    style: TextStyle(fontSize: 18),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  bool _canRequestTrip() {
    return _pickupLat != null &&
           _pickupLon != null &&
           _dropoffLat != null &&
           _dropoffLon != null &&
           !_isSearching;
  }

  void _selectLocation(bool isPickup) {
    // En producción, usar Google Places Autocomplete
    // Por ahora, usar ubicaciones de ejemplo
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(isPickup ? 'Seleccionar Origen' : 'Seleccionar Destino'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: Text('Av. Corrientes 1234'),
              onTap: () {
                if (isPickup) {
                  _pickupController.text = 'Av. Corrientes 1234';
                  _pickupLat = -34.6037;
                  _pickupLon = -58.3816;
                } else {
                  _dropoffController.text = 'Av. Corrientes 1234';
                  _dropoffLat = -34.6037;
                  _dropoffLon = -58.3816;
                }
                Navigator.pop(context);
                setState(() {});
              },
            ),
            ListTile(
              title: Text('Plaza de Mayo'),
              onTap: () {
                if (isPickup) {
                  _pickupController.text = 'Plaza de Mayo';
                  _pickupLat = -34.6083;
                  _pickupLon = -58.3712;
                } else {
                  _dropoffController.text = 'Plaza de Mayo';
                  _dropoffLat = -34.6083;
                  _dropoffLon = -58.3712;
                }
                Navigator.pop(context);
                setState(() {});
              },
            ),
          ],
        ),
      ),
    );
  }

  void _requestTrip() {
    _passengerService.requestTrip(
      pickupAddress: _pickupController.text,
      pickupLat: _pickupLat!,
      pickupLon: _pickupLon!,
      dropoffAddress: _dropoffController.text,
      dropoffLat: _dropoffLat!,
      dropoffLon: _dropoffLon!,
      passengerName: 'María García',
      passengerRating: 4.8,
      paymentMethod: 'credit_card',
    );
  }

  void _showDriverAcceptedDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Text('¡Conductor Encontrado!'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.check_circle, color: Colors.green, size: 64),
            SizedBox(height: 16),
            Text(
              'Un conductor aceptó tu viaje',
              style: TextStyle(fontSize: 18),
              textAlign: TextAlign.center,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pushReplacementNamed(context, '/trip');
            },
            child: Text('VER VIAJE'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _pickupController.dispose();
    _dropoffController.dispose();
    super.dispose();
  }
}
```

---

## 🧪 TESTING CON POSTMAN

### 1. Pasajero solicita viaje

```json
{
  "event": "trip-request",
  "data": {
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
    "passenger_id": "passenger-123",
    "passenger_name": "María García",
    "passenger_rating": 4.8
  }
}
```

### 2. Verificar eventos recibidos

**Pasajero recibe:**
- `send-change-trip` con estado "searching"

**Conductores reciben:**
- `trip-available` con todos los detalles del viaje

### 3. Conductor acepta

```json
{
  "event": "trip-accept",
  "data": {
    "trip_id": "trip-1704123456789"
  }
}
```

**Todos reciben:**
- `send-change-trip` con estado "driverAccepted"

---

## ⚙️ CARACTERÍSTICAS

- ✅ **Cálculo automático de distancia** usando fórmula de Haversine
- ✅ **Estimación de duración** (~3 minutos por km)
- ✅ **Estimación de tarifa** (~$350 por km)
- ✅ **Cambio automático de estado** a "searching"
- ✅ **Broadcast a conductores** disponibles
- ✅ **Sistema de expiración** (30 segundos)
- ✅ **Notificación al pasajero** cuando conductor acepta

---

## 🎯 FLUJO DE ESTADOS

```
idle (0)
  ↓ [Pasajero solicita viaje]
searching (1)
  ↓ [Conductor encontrado]
driverFound (3)
  ↓ [Conductor acepta]
driverAccepted (4)
  ↓ [Conductor en camino]
driverOnWay (5)
  ↓ ... resto del viaje
```

---

## 📊 CÁLCULOS AUTOMÁTICOS

### Distancia (Fórmula de Haversine)
```typescript
private calculateDistance(lat1, lon1, lat2, lon2): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

### Duración Estimada
```
duración = distancia * 3 minutos
```

### Tarifa Estimada
```
tarifa = distancia * $350
```

---

## 🔧 MEJORAS FUTURAS

1. ✅ Integrar con servicio de mapas real (Google Maps API)
2. ✅ Buscar conductores por proximidad geográfica
3. ✅ Considerar tráfico en tiempo real
4. ✅ Múltiples métodos de pago
5. ✅ Historial de viajes
6. ✅ Favoritos (direcciones frecuentes)
7. ✅ Programar viajes futuros
8. ✅ Compartir ubicación en tiempo real

---

## 📚 RECURSOS

- [Documentación de Eventos de Pasajero](./PASAJERO_EVENTOS.md)
- [Sistema de Asignación de Viajes](./ASIGNACION_VIAJES.md)
- [Implementación Flutter Pasajero](./FLUTTER_PASAJERO.md)
- [Flujo Completo](./FLUJO_COMPLETO.md)
