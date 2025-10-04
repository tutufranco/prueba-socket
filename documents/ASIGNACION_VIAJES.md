# 🚕 SISTEMA DE ASIGNACIÓN DE VIAJES

## 📋 DESCRIPCIÓN

Sistema para enviar viajes disponibles a conductores y permitirles aceptar o rechazar la solicitud.

---

## 🔄 FLUJO COMPLETO

```
Pasajero solicita viaje
        ↓
Sistema busca conductores disponibles
        ↓
Servidor envía "trip-available" a conductor(es)
        ↓
Conductor recibe notificación (30 segundos para responder)
        ↓
    ┌───┴───┐
    ↓       ↓
ACEPTA   RECHAZA
    ↓       ↓
trip-accept  trip-reject
    ↓       ↓
Estado:     Buscar otro
driverAccepted  conductor
```

---

## 📡 EVENTOS IMPLEMENTADOS

### 1. **`trip-available`** (Servidor → Conductor)

**Descripción:** El servidor envía un viaje disponible a un conductor específico o a todos los conductores.

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
  "estimated_duration": 15,
  "estimated_fare": 850,
  "request_time": "2024-01-15T10:30:00.000Z",
  "expires_at": "2024-01-15T10:30:30.000Z"
}
```

### 2. **`trip-accept`** (Conductor → Servidor)

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
- `send-change-trip` → Todos los clientes reciben el nuevo estado

### 3. **`trip-reject`** (Conductor → Servidor)

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

---

## 💻 IMPLEMENTACIÓN EN SERVIDOR

### Enviar viaje a conductor específico

```typescript
// En tu controlador o servicio
import { ChatGateway } from './socket/socket.gateway';

@Injectable()
export class TripService {
  constructor(private readonly chatGateway: ChatGateway) {}

  async assignTripToDriver(driverSocketId: string) {
    const tripData = {
      passenger_id: 'passenger-123',
      passenger_name: 'María García',
      passenger_rating: 4.8,
      pickup_location: {
        address: 'Av. Corrientes 1234, Buenos Aires',
        lat: -34.6037,
        lon: -58.3816
      },
      dropoff_location: {
        address: 'Plaza de Mayo, Buenos Aires',
        lat: -34.6083,
        lon: -58.3712
      },
      estimated_distance: 2.5,
      estimated_duration: 15,
      estimated_fare: 850
    };

    const trip = this.chatGateway.sendTripToDriver(driverSocketId, tripData);
    return trip;
  }
}
```

### Enviar viaje a todos los conductores

```typescript
async broadcastTrip() {
  const tripData = {
    passenger_id: 'passenger-123',
    passenger_name: 'María García',
    passenger_rating: 4.8,
    pickup_location: {
      address: 'Av. Corrientes 1234',
      lat: -34.6037,
      lon: -58.3816
    },
    dropoff_location: {
      address: 'Plaza de Mayo',
      lat: -34.6083,
      lon: -58.3712
    },
    estimated_distance: 2.5,
    estimated_duration: 15,
    estimated_fare: 850
  };

  const trip = this.chatGateway.broadcastTripToDrivers(tripData);
  return trip;
}
```

---

## 📱 IMPLEMENTACIÓN EN CLIENTE FLUTTER (CONDUCTOR)

### Actualizar DriverService

```dart
// lib/services/driver_service.dart

// Agregar stream para viajes disponibles
final _tripAvailableController = StreamController<TripAvailable>.broadcast();
Stream<TripAvailable> get tripAvailableStream => _tripAvailableController.stream;

// En setupEventListeners()
void _setupEventListeners() {
  // ... otros listeners ...
  
  // Viaje disponible
  _ws.on('trip-available', (data) {
    print('🚕 Viaje disponible recibido');
    try {
      final trip = TripAvailable.fromJson(data);
      _tripAvailableController.add(trip);
    } catch (e) {
      print('❌ Error al parsear viaje disponible: $e');
    }
  });
}

// Método para aceptar viaje
void acceptTrip(String tripId) {
  _ws.emit('trip-accept', {
    'trip_id': tripId,
  });
  print('✅ Viaje aceptado: $tripId');
}

// Método para rechazar viaje
void rejectTrip(String tripId, String reason) {
  _ws.emit('trip-reject', {
    'trip_id': tripId,
    'reason': reason,
  });
  print('❌ Viaje rechazado: $tripId');
}
```

### Modelo TripAvailable

```dart
// lib/models/trip_available.dart
class TripAvailable {
  final String tripId;
  final String passengerId;
  final String passengerName;
  final double passengerRating;
  final TripLocation pickupLocation;
  final TripLocation dropoffLocation;
  final double estimatedDistance;
  final int estimatedDuration;
  final double estimatedFare;
  final DateTime requestTime;
  final DateTime expiresAt;

  TripAvailable({
    required this.tripId,
    required this.passengerId,
    required this.passengerName,
    required this.passengerRating,
    required this.pickupLocation,
    required this.dropoffLocation,
    required this.estimatedDistance,
    required this.estimatedDuration,
    required this.estimatedFare,
    required this.requestTime,
    required this.expiresAt,
  });

  factory TripAvailable.fromJson(Map<String, dynamic> json) {
    return TripAvailable(
      tripId: json['trip_id'] ?? '',
      passengerId: json['passenger_id'] ?? '',
      passengerName: json['passenger_name'] ?? '',
      passengerRating: (json['passenger_rating'] ?? 0).toDouble(),
      pickupLocation: TripLocation.fromJson(json['pickup_location'] ?? {}),
      dropoffLocation: TripLocation.fromJson(json['dropoff_location'] ?? {}),
      estimatedDistance: (json['estimated_distance'] ?? 0).toDouble(),
      estimatedDuration: json['estimated_duration'] ?? 0,
      estimatedFare: (json['estimated_fare'] ?? 0).toDouble(),
      requestTime: DateTime.parse(json['request_time']),
      expiresAt: DateTime.parse(json['expires_at']),
    );
  }

  // Calcular tiempo restante
  Duration get timeRemaining {
    return expiresAt.difference(DateTime.now());
  }

  bool get isExpired => DateTime.now().isAfter(expiresAt);
}

class TripLocation {
  final String address;
  final double lat;
  final double lon;

  TripLocation({
    required this.address,
    required this.lat,
    required this.lon,
  });

  factory TripLocation.fromJson(Map<String, dynamic> json) {
    return TripLocation(
      address: json['address'] ?? '',
      lat: (json['lat'] ?? 0).toDouble(),
      lon: (json['lon'] ?? 0).toDouble(),
    );
  }
}
```

### Pantalla de Viaje Disponible

```dart
// lib/screens/trip_available_screen.dart
import 'package:flutter/material.dart';
import 'dart:async';
import '../services/driver_service.dart';
import '../models/trip_available.dart';

class TripAvailableScreen extends StatefulWidget {
  final TripAvailable trip;

  TripAvailableScreen({required this.trip});

  @override
  _TripAvailableScreenState createState() => _TripAvailableScreenState();
}

class _TripAvailableScreenState extends State<TripAvailableScreen> {
  final DriverService _driverService = DriverService();
  late Timer _timer;
  int _secondsRemaining = 30;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(Duration(seconds: 1), (timer) {
      setState(() {
        _secondsRemaining--;
      });

      if (_secondsRemaining <= 0) {
        _timer.cancel();
        _autoReject();
      }
    });
  }

  void _autoReject() {
    _driverService.rejectTrip(widget.trip.tripId, 'Tiempo expirado');
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Nuevo Viaje Disponible'),
        backgroundColor: Colors.green,
      ),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Temporizador
            Center(
              child: Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _secondsRemaining > 10 ? Colors.green : Colors.red,
                ),
                child: Center(
                  child: Text(
                    '$_secondsRemaining',
                    style: TextStyle(
                      fontSize: 48,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ),
            SizedBox(height: 24),

            // Información del pasajero
            Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Pasajero',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey,
                      ),
                    ),
                    SizedBox(height: 8),
                    Row(
                      children: [
                        CircleAvatar(
                          child: Icon(Icons.person),
                        ),
                        SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.trip.passengerName,
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Row(
                              children: [
                                Icon(Icons.star, size: 16, color: Colors.amber),
                                SizedBox(width: 4),
                                Text('${widget.trip.passengerRating}'),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            SizedBox(height: 16),

            // Detalles del viaje
            Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  children: [
                    _buildLocationRow(
                      icon: Icons.my_location,
                      label: 'Origen',
                      address: widget.trip.pickupLocation.address,
                      color: Colors.green,
                    ),
                    Divider(height: 24),
                    _buildLocationRow(
                      icon: Icons.location_on,
                      label: 'Destino',
                      address: widget.trip.dropoffLocation.address,
                      color: Colors.red,
                    ),
                  ],
                ),
              ),
            ),
            SizedBox(height: 16),

            // Información del viaje
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildInfoCard(
                  icon: Icons.straighten,
                  label: 'Distancia',
                  value: '${widget.trip.estimatedDistance} km',
                ),
                _buildInfoCard(
                  icon: Icons.timer,
                  label: 'Duración',
                  value: '${widget.trip.estimatedDuration} min',
                ),
                _buildInfoCard(
                  icon: Icons.attach_money,
                  label: 'Tarifa',
                  value: '\$${widget.trip.estimatedFare.toStringAsFixed(0)}',
                ),
              ],
            ),
            Spacer(),

            // Botones de acción
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: _rejectTrip,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      padding: EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: Text(
                      'RECHAZAR',
                      style: TextStyle(fontSize: 18),
                    ),
                  ),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _acceptTrip,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      padding: EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: Text(
                      'ACEPTAR',
                      style: TextStyle(fontSize: 18),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLocationRow({
    required IconData icon,
    required String label,
    required String address,
    required Color color,
  }) {
    return Row(
      children: [
        Icon(icon, color: color),
        SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey,
                ),
              ),
              Text(
                address,
                style: TextStyle(fontSize: 16),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildInfoCard({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Column(
      children: [
        Icon(icon, size: 32),
        SizedBox(height: 4),
        Text(label, style: TextStyle(fontSize: 12)),
        Text(
          value,
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }

  void _acceptTrip() {
    _timer.cancel();
    _driverService.acceptTrip(widget.trip.tripId);
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('✅ Viaje aceptado')),
    );
    
    Navigator.pop(context);
  }

  void _rejectTrip() {
    _timer.cancel();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Rechazar Viaje'),
        content: Text('¿Por qué rechazas este viaje?'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _driverService.rejectTrip(
                widget.trip.tripId,
                'Muy lejos de mi ubicación'
              );
              Navigator.pop(context);
            },
            child: Text('Muy lejos'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _driverService.rejectTrip(
                widget.trip.tripId,
                'No voy en esa dirección'
              );
              Navigator.pop(context);
            },
            child: Text('Dirección incorrecta'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }
}
```

### Integrar en Pantalla Principal

```dart
// En driver_screen.dart
@override
void initState() {
  super.initState();
  _initializeService();
  _listenToTripAvailable();
}

void _listenToTripAvailable() {
  _driverService.tripAvailableStream.listen((trip) {
    // Mostrar pantalla de viaje disponible
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => TripAvailableScreen(trip: trip),
      ),
    );
  });
}
```

---

## 🧪 TESTING CON POSTMAN

### 1. Simular envío de viaje

Desde tu backend, llama al método:
```typescript
chatGateway.sendTripToDriver('SOCKET_ID_DEL_CONDUCTOR', tripData);
```

### 2. Aceptar viaje desde Postman

```json
{
  "event": "trip-accept",
  "data": {
    "trip_id": "trip-1704123456789"
  }
}
```

### 3. Rechazar viaje desde Postman

```json
{
  "event": "trip-reject",
  "data": {
    "trip_id": "trip-1704123456789",
    "reason": "Muy lejos"
  }
}
```

---

## ⚙️ CARACTERÍSTICAS

- ✅ Envío de viaje a conductor específico
- ✅ Broadcast de viaje a todos los conductores
- ✅ Expiración automática (30 segundos)
- ✅ Aceptación de viaje
- ✅ Rechazo de viaje con razón
- ✅ Actualización automática de estado
- ✅ Tracking de viajes pendientes

---

## 🎯 PRÓXIMAS MEJORAS

1. ✅ Sistema de prioridad de conductores
2. ✅ Algoritmo de asignación inteligente
3. ✅ Notificaciones push
4. ✅ Historial de rechazos
5. ✅ Penalizaciones por rechazos frecuentes
6. ✅ Cálculo de distancia en tiempo real
