# 🚗 IMPLEMENTACIÓN FLUTTER - APP CONDUCTOR

## 📋 TABLA DE CONTENIDOS
1. [Configuración Inicial](#configuración-inicial)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Servicio WebSocket](#servicio-websocket)
4. [Servicio de Conductor](#servicio-de-conductor)
5. [Modelos de Datos](#modelos-de-datos)
6. [Pantallas y UI](#pantallas-y-ui)
7. [Servicio de Ubicación](#servicio-de-ubicación)
8. [Ejemplos Completos](#ejemplos-completos)

---

## ⚙️ CONFIGURACIÓN INICIAL

### 1. Agregar Dependencias

```yaml
# pubspec.yaml
dependencies:
  flutter:
    sdk: flutter
  
  # WebSocket
  socket_io_client: ^2.0.3+1
  
  # State Management
  provider: ^6.1.1
  
  # Ubicación
  geolocator: ^10.1.0
  permission_handler: ^11.0.1
  
  # UI
  google_maps_flutter: ^2.5.0
  intl: ^0.18.1
  
  # Background location
  flutter_background_service: ^5.0.5
  
  # Utils
  uuid: ^4.2.1
```

### 2. Configurar Permisos

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<manifest>
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION"/>
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
</manifest>
```

```xml
<!-- ios/Runner/Info.plist -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>Necesitamos tu ubicación para mostrar tu posición al pasajero</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Necesitamos tu ubicación en segundo plano para actualizar tu posición durante el viaje</string>
<key>UIBackgroundModes</key>
<array>
    <string>location</string>
</array>
```

---

## 📁 ESTRUCTURA DEL PROYECTO

```
lib/
├── main.dart
├── models/
│   ├── trip_model.dart
│   ├── message_model.dart
│   ├── incident_model.dart
│   ├── trip_status.dart
│   └── passenger_model.dart
├── services/
│   ├── websocket_service.dart
│   ├── driver_service.dart
│   └── location_service.dart
├── providers/
│   ├── trip_provider.dart
│   └── location_provider.dart
├── screens/
│   ├── driver_screen.dart
│   ├── chat_screen.dart
│   └── trip_progress_screen.dart
└── widgets/
    ├── trip_status_widget.dart
    ├── passenger_info_widget.dart
    └── location_button_widget.dart
```

---

## 🔌 SERVICIO WEBSOCKET

```dart
// lib/services/websocket_service.dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class WebSocketService {
  static final WebSocketService _instance = WebSocketService._internal();
  factory WebSocketService() => _instance;
  WebSocketService._internal();

  IO.Socket? _socket;
  bool _isConnected = false;

  // URL del servidor
  static const String SERVER_URL = 'http://localhost:3000'; // Cambiar en producción
  static const String NAMESPACE = '/events';

  // Getters
  bool get isConnected => _isConnected;
  IO.Socket? get socket => _socket;

  // Conectar al servidor
  Future<void> connect() async {
    try {
      _socket = IO.io(
        '$SERVER_URL$NAMESPACE',
        IO.OptionBuilder()
            .setTransports(['websocket'])
            .disableAutoConnect()
            .setReconnectionAttempts(5)
            .setReconnectionDelay(1000)
            .build(),
      );

      _setupConnectionListeners();
      _socket!.connect();
    } catch (e) {
      print('❌ Error al conectar: $e');
    }
  }

  // Configurar listeners de conexión
  void _setupConnectionListeners() {
    _socket!.onConnect((_) {
      print('✅ Conectado al servidor');
      _isConnected = true;
    });

    _socket!.onDisconnect((_) {
      print('❌ Desconectado del servidor');
      _isConnected = false;
    });

    _socket!.onConnectError((error) {
      print('❌ Error de conexión: $error');
      _isConnected = false;
    });

    _socket!.onError((error) {
      print('❌ Error: $error');
    });

    _socket!.onReconnect((attempt) {
      print('🔄 Reconectando... Intento $attempt');
    });
  }

  // Escuchar evento
  void on(String event, Function(dynamic) callback) {
    _socket?.on(event, callback);
  }

  // Emitir evento
  void emit(String event, dynamic data) {
    if (_isConnected && _socket != null) {
      _socket!.emit(event, data);
    } else {
      print('❌ No se puede emitir: Socket no conectado');
    }
  }

  // Desconectar
  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
  }

  // Remover listener
  void off(String event) {
    _socket?.off(event);
  }
}
```

---

## 🚗 SERVICIO DE CONDUCTOR

```dart
// lib/services/driver_service.dart
import 'dart:async';
import 'websocket_service.dart';
import '../models/trip_model.dart';
import '../models/message_model.dart';
import '../models/incident_model.dart';

class DriverService {
  static final DriverService _instance = DriverService._internal();
  factory DriverService() => _instance;
  DriverService._internal();

  final WebSocketService _ws = WebSocketService();

  // Controllers de streams
  final _tripDataController = StreamController<TripModel>.broadcast();
  final _tripStatusController = StreamController<TripStatus>.broadcast();
  final _messageController = StreamController<MessageModel>.broadcast();
  final _incidentController = StreamController<IncidentModel>.broadcast();
  final _passengerLocationController = StreamController<PassengerLocation>.broadcast();
  final _allMessagesController = StreamController<List<MessageModel>>.broadcast();
  final _tripAvailableController = StreamController<TripAvailable>.broadcast(); // NUEVO

  // Streams públicos
  Stream<TripModel> get tripDataStream => _tripDataController.stream;
  Stream<TripStatus> get tripStatusStream => _tripStatusController.stream;
  Stream<MessageModel> get messageStream => _messageController.stream;
  Stream<IncidentModel> get incidentStream => _incidentController.stream;
  Stream<PassengerLocation> get passengerLocationStream => _passengerLocationController.stream;
  Stream<List<MessageModel>> get allMessagesStream => _allMessagesController.stream;
  Stream<TripAvailable> get tripAvailableStream => _tripAvailableController.stream; // NUEVO

  // Inicializar servicio
  Future<void> initialize() async {
    await _ws.connect();
    _setupEventListeners();
  }

  // Configurar listeners de eventos
  void _setupEventListeners() {
    // Datos iniciales del viaje
    _ws.on('get-trip-d-on', (data) {
      print('🚗 Datos del viaje recibidos');
      try {
        final trip = TripModel.fromJson(data);
        _tripDataController.add(trip);
      } catch (e) {
        print('❌ Error al parsear datos del viaje: $e');
      }
    });

    // Cambios de estado del viaje
    _ws.on('send-change-trip', (data) {
      print('🔄 Estado del viaje actualizado');
      try {
        final status = TripStatus.fromJson(data);
        _tripStatusController.add(status);
      } catch (e) {
        print('❌ Error al parsear estado: $e');
      }
    });

    // Ubicación del pasajero
    _ws.on('passenger-location-update', (data) {
      print('📍 Ubicación del pasajero actualizada');
      try {
        final location = PassengerLocation.fromJson(data);
        _passengerLocationController.add(location);
      } catch (e) {
        print('❌ Error al parsear ubicación: $e');
      }
    });

    // Mensajes
    _ws.on('trip-message-p-on', (data) {
      print('💬 Mensaje recibido');
      try {
        final message = MessageModel.fromJson(data);
        _messageController.add(message);
      } catch (e) {
        print('❌ Error al parsear mensaje: $e');
      }
    });

    // Incidentes
    _ws.on('trip-incident-p-on', (data) {
      print('⚠️ Incidente recibido');
      try {
        final incident = IncidentModel.fromJson(data);
        _incidentController.add(incident);
      } catch (e) {
        print('❌ Error al parsear incidente: $e');
      }
    });

    // Lista completa de mensajes
    _ws.on('all-messages', (data) {
      print('📋 Lista de mensajes recibida');
      try {
        final response = data['data']['data'];
        final messagesList = (response['messages'] as List)
            .map((m) => MessageModel.fromJson(m))
            .toList();
        _allMessagesController.add(messagesList);
      } catch (e) {
        print('❌ Error al parsear lista de mensajes: $e');
      }
    });

    // Viaje disponible (NUEVO)
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

  // =============== MÉTODOS DE ENVÍO ===============

  // Enviar ubicación (básico - no avanza estado)
  void sendLocation(double lat, double lon) {
    _ws.emit('location-d-send', {
      'lat': lat,
      'lon': lon,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    });
    print('📍 Ubicación enviada: ($lat, $lon)');
  }

  // Enviar ubicación (con progresión de estado)
  void sendLocationWithProgress(double lat, double lon) {
    _ws.emit('driver-location', {
      'lat': lat,
      'lon': lon,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    });
    print('📍 Ubicación con progresión enviada: ($lat, $lon)');
  }

  // Enviar mensaje
  void sendMessage(String message) {
    _ws.emit('trip-message-d-send', {
      'message': message,
    });
    print('💬 Mensaje enviado: $message');
  }

  // Reportar incidente
  void reportIncident(String message) {
    _ws.emit('trip-incident-d-send', {
      'message': message,
    });
    print('⚠️ Incidente reportado: $message');
  }

  // Cancelar viaje
  void cancelTrip(String reason) {
    _ws.emit('trip-cancel-d-send', {
      'reason': reason,
    });
    print('🚫 Viaje cancelado: $reason');
  }

  // Obtener todos los mensajes
  void getAllMessages() {
    _ws.emit('get-messages-incidents', {});
    print('📋 Solicitando lista de mensajes');
  }

  // Obtener datos del viaje
  void getTripData() {
    _ws.emit('get-trip-d-on', {});
    print('🚗 Solicitando datos del viaje');
  }

  // Aceptar viaje (NUEVO)
  void acceptTrip(String tripId) {
    _ws.emit('trip-accept', {
      'trip_id': tripId,
    });
    print('✅ Viaje aceptado: $tripId');
  }

  // Rechazar viaje (NUEVO)
  void rejectTrip(String tripId, String reason) {
    _ws.emit('trip-reject', {
      'trip_id': tripId,
      'reason': reason,
    });
    print('❌ Viaje rechazado: $tripId - Razón: $reason');
  }

  // =============== LIMPIEZA ===============

  void dispose() {
    _tripDataController.close();
    _tripStatusController.close();
    _messageController.close();
    _incidentController.close();
    _passengerLocationController.close();
    _allMessagesController.close();
    _tripAvailableController.close(); // NUEVO
    _ws.disconnect();
  }
}
```

---

## 📍 SERVICIO DE UBICACIÓN

```dart
// lib/services/location_service.dart
import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'driver_service.dart';

class LocationService {
  static final LocationService _instance = LocationService._internal();
  factory LocationService() => _instance;
  LocationService._internal();

  final DriverService _driverService = DriverService();
  StreamSubscription<Position>? _positionStreamSubscription;
  Timer? _locationTimer;
  bool _isTracking = false;

  // Solicitar permisos de ubicación
  Future<bool> requestLocationPermission() async {
    // Verificar si el servicio está habilitado
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      print('❌ Servicio de ubicación deshabilitado');
      return false;
    }

    // Solicitar permisos
    LocationPermission permission = await Geolocator.checkPermission();
    
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        print('❌ Permisos de ubicación denegados');
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      print('❌ Permisos de ubicación denegados permanentemente');
      return false;
    }

    print('✅ Permisos de ubicación concedidos');
    return true;
  }

  // Obtener ubicación actual
  Future<Position?> getCurrentLocation() async {
    try {
      final hasPermission = await requestLocationPermission();
      if (!hasPermission) return null;

      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      
      print('📍 Ubicación actual: ${position.latitude}, ${position.longitude}');
      return position;
    } catch (e) {
      print('❌ Error al obtener ubicación: $e');
      return null;
    }
  }

  // Iniciar tracking de ubicación (continuo)
  Future<void> startLocationTracking({
    bool withProgress = false,
    int intervalSeconds = 10,
  }) async {
    if (_isTracking) {
      print('⚠️ Ya está trackeando ubicación');
      return;
    }

    final hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    _isTracking = true;
    print('✅ Iniciando tracking de ubicación (${withProgress ? "con" : "sin"} progresión)');

    // Usar stream de ubicación
    _positionStreamSubscription = Geolocator.getPositionStream(
      locationSettings: LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10, // Actualizar cada 10 metros
      ),
    ).listen((Position position) {
      if (withProgress) {
        _driverService.sendLocationWithProgress(
          position.latitude,
          position.longitude,
        );
      } else {
        _driverService.sendLocation(
          position.latitude,
          position.longitude,
        );
      }
    });
  }

  // Iniciar tracking de ubicación (periódico)
  Future<void> startPeriodicLocationTracking({
    bool withProgress = false,
    int intervalSeconds = 10,
  }) async {
    if (_isTracking) {
      print('⚠️ Ya está trackeando ubicación');
      return;
    }

    final hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    _isTracking = true;
    print('✅ Iniciando tracking periódico (cada ${intervalSeconds}s)');

    // Enviar ubicación cada X segundos
    _locationTimer = Timer.periodic(
      Duration(seconds: intervalSeconds),
      (timer) async {
        final position = await getCurrentLocation();
        if (position != null) {
          if (withProgress) {
            _driverService.sendLocationWithProgress(
              position.latitude,
              position.longitude,
            );
          } else {
            _driverService.sendLocation(
              position.latitude,
              position.longitude,
            );
          }
        }
      },
    );

    // Enviar ubicación inmediatamente
    final position = await getCurrentLocation();
    if (position != null) {
      if (withProgress) {
        _driverService.sendLocationWithProgress(
          position.latitude,
          position.longitude,
        );
      } else {
        _driverService.sendLocation(
          position.latitude,
          position.longitude,
        );
      }
    }
  }

  // Detener tracking de ubicación
  void stopLocationTracking() {
    _positionStreamSubscription?.cancel();
    _positionStreamSubscription = null;
    
    _locationTimer?.cancel();
    _locationTimer = null;
    
    _isTracking = false;
    print('🛑 Tracking de ubicación detenido');
  }

  // Verificar si está trackeando
  bool get isTracking => _isTracking;

  // Limpiar recursos
  void dispose() {
    stopLocationTracking();
  }
}
```

---

## 📊 MODELOS DE DATOS

### Passenger Model

```dart
// lib/models/passenger_model.dart
class PassengerModel {
  final String passengerId;
  final String fullName;
  final double qualifications;
  final String selfie;
  final int totalTrips;
  final String phone;

  PassengerModel({
    required this.passengerId,
    required this.fullName,
    required this.qualifications,
    required this.selfie,
    required this.totalTrips,
    required this.phone,
  });

  factory PassengerModel.fromJson(Map<String, dynamic> json) {
    return PassengerModel(
      passengerId: json['passenger_id'] ?? '',
      fullName: json['full_name'] ?? '',
      qualifications: (json['qualifications'] ?? 0).toDouble(),
      selfie: json['selfie'] ?? '',
      totalTrips: json['total_trips'] ?? 0,
      phone: json['phone'] ?? '',
    );
  }
}

class PassengerLocation {
  final double lat;
  final double lon;
  final int timestamp;
  final String passengerId;

  PassengerLocation({
    required this.lat,
    required this.lon,
    required this.timestamp,
    required this.passengerId,
  });

  factory PassengerLocation.fromJson(Map<String, dynamic> json) {
    return PassengerLocation(
      lat: (json['lat'] ?? 0).toDouble(),
      lon: (json['lon'] ?? 0).toDouble(),
      timestamp: json['timestamp'] ?? 0,
      passengerId: json['passenger_id'] ?? '',
    );
  }
}
```

### Trip Model (para Conductor)

```dart
// lib/models/trip_model.dart
class TripModel {
  final String serviceId;
  final PassengerModel passenger;
  final TripStatus tripStatus;
  final List<MessageModel> messages;
  final List<IncidentModel> incidents;

  TripModel({
    required this.serviceId,
    required this.passenger,
    required this.tripStatus,
    required this.messages,
    required this.incidents,
  });

  factory TripModel.fromJson(Map<String, dynamic> json) {
    return TripModel(
      serviceId: json['service_id'] ?? '',
      passenger: PassengerModel.fromJson(json['passengerProfile'] ?? {}),
      tripStatus: TripStatus.fromJson(json['tripChange'] ?? {}),
      messages: (json['message'] as List? ?? [])
          .map((m) => MessageModel.fromJson(m))
          .toList(),
      incidents: (json['incident'] as List? ?? [])
          .map((i) => IncidentModel.fromJson(i))
          .toList(),
    );
  }
}
```

*Los demás modelos (MessageModel, IncidentModel, TripStatus) son idénticos a la app de pasajero.*

---

## 🎨 PANTALLAS Y UI

### Pantalla Principal del Conductor

```dart
// lib/screens/driver_screen.dart
import 'package:flutter/material.dart';
import '../services/driver_service.dart';
import '../services/location_service.dart';
import '../models/trip_status.dart';

class DriverScreen extends StatefulWidget {
  @override
  _DriverScreenState createState() => _DriverScreenState();
}

class _DriverScreenState extends State<DriverScreen> {
  final DriverService _driverService = DriverService();
  final LocationService _locationService = LocationService();
  TripStatus? _currentStatus;
  bool _isTracking = false;

  @override
  void initState() {
    super.initState();
    _initializeService();
  }

  Future<void> _initializeService() async {
    await _driverService.initialize();
    
    // Escuchar cambios de estado
    _driverService.tripStatusStream.listen((status) {
      setState(() {
        _currentStatus = status;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Conductor - Viaje Activo'),
        actions: [
          IconButton(
            icon: Icon(Icons.message),
            onPressed: () => Navigator.pushNamed(context, '/chat'),
          ),
        ],
      ),
      body: Column(
        children: [
          // Estado del viaje
          if (_currentStatus != null) _buildStatusCard(_currentStatus!),
          
          // Controles de ubicación
          _buildLocationControls(),
          
          // Mapa
          Expanded(
            child: Container(
              color: Colors.grey[200],
              child: Center(
                child: Text('Mapa aquí'),
              ),
            ),
          ),
          
          // Botones de acción
          _buildActionButtons(),
        ],
      ),
    );
  }

  Widget _buildStatusCard(TripStatus status) {
    return Card(
      margin: EdgeInsets.all(16),
      elevation: 4,
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            Text(
              status.statusDisplay,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: _getStatusColor(status.tripStatusText),
              ),
            ),
            SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatItem(
                  icon: Icons.message,
                  label: 'Mensajes',
                  value: '${status.messageNumber}',
                  color: Colors.blue,
                ),
                _buildStatItem(
                  icon: Icons.warning,
                  label: 'Incidentes',
                  value: '${status.incidentNumber}',
                  color: Colors.orange,
                ),
                _buildStatItem(
                  icon: Icons.person,
                  label: 'Pasajero',
                  value: status.passengerBoarded ? '✓' : '✗',
                  color: status.passengerBoarded ? Colors.green : Colors.grey,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Column(
      children: [
        Icon(icon, size: 32, color: color),
        SizedBox(height: 4),
        Text(label, style: TextStyle(fontSize: 12)),
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _buildLocationControls() {
    return Card(
      margin: EdgeInsets.symmetric(horizontal: 16),
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Tracking de Ubicación',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Switch(
                  value: _isTracking,
                  onChanged: (value) {
                    setState(() {
                      _isTracking = value;
                    });
                    
                    if (value) {
                      _startTracking();
                    } else {
                      _stopTracking();
                    }
                  },
                ),
              ],
            ),
            if (_isTracking)
              Text(
                'Enviando ubicación cada 10 segundos',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.green,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons() {
    return Container(
      padding: EdgeInsets.all(16),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  icon: Icon(Icons.my_location),
                  label: Text('Enviar Ubicación Ahora'),
                  onPressed: _sendCurrentLocation,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue,
                    padding: EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              SizedBox(width: 16),
              Expanded(
                child: ElevatedButton.icon(
                  icon: Icon(Icons.navigate_next),
                  label: Text('Avanzar Estado'),
                  onPressed: _sendLocationWithProgress,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    padding: EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
          SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: Icon(Icons.cancel),
              label: Text('Cancelar Viaje'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                padding: EdgeInsets.symmetric(vertical: 12),
              ),
              onPressed: _cancelTrip,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _startTracking() async {
    await _locationService.startPeriodicLocationTracking(
      withProgress: false,
      intervalSeconds: 10,
    );
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('✅ Tracking de ubicación iniciado')),
    );
  }

  void _stopTracking() {
    _locationService.stopLocationTracking();
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('🛑 Tracking de ubicación detenido')),
    );
  }

  Future<void> _sendCurrentLocation() async {
    final position = await _locationService.getCurrentLocation();
    if (position != null) {
      _driverService.sendLocation(
        position.latitude,
        position.longitude,
      );
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('📍 Ubicación enviada')),
      );
    }
  }

  Future<void> _sendLocationWithProgress() async {
    final position = await _locationService.getCurrentLocation();
    if (position != null) {
      _driverService.sendLocationWithProgress(
        position.latitude,
        position.longitude,
      );
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('📍 Ubicación enviada - Estado avanzado')),
      );
    }
  }

  Future<void> _cancelTrip() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Cancelar Viaje'),
        content: Text('¿Estás seguro de cancelar el viaje?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('No'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('Sí, cancelar'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      _driverService.cancelTrip('Emergencia personal');
      _stopTracking();
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('🚫 Viaje cancelado')),
      );
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'driverOnWay': return Colors.orange;
      case 'driverArrived': return Colors.blue;
      case 'tripStarted': return Colors.green;
      case 'tripInProgress': return Colors.green;
      case 'tripCompleted': return Colors.grey;
      case 'tripCancelled': return Colors.red;
      case 'tripCancelledByDriver': return Colors.red;
      default: return Colors.black;
    }
  }

  @override
  void dispose() {
    _locationService.stopLocationTracking();
    super.dispose();
  }
}
```

### Pantalla de Progreso del Viaje

```dart
// lib/screens/trip_progress_screen.dart
import 'package:flutter/material.dart';
import '../services/driver_service.dart';
import '../services/location_service.dart';

class TripProgressScreen extends StatefulWidget {
  @override
  _TripProgressScreenState createState() => _TripProgressScreenState();
}

class _TripProgressScreenState extends State<TripProgressScreen> {
  final DriverService _driverService = DriverService();
  final LocationService _locationService = LocationService();
  
  final List<String> _tripSteps = [
    'En camino al punto de encuentro',
    'Llegué al punto de encuentro',
    'Iniciar viaje',
    'Viaje en progreso',
    'Completar viaje',
  ];
  
  int _currentStep = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Progreso del Viaje'),
      ),
      body: Column(
        children: [
          Expanded(
            child: Stepper(
              currentStep: _currentStep,
              onStepContinue: _currentStep < _tripSteps.length - 1
                  ? _nextStep
                  : null,
              onStepCancel: _currentStep > 0 ? _previousStep : null,
              steps: _tripSteps.asMap().entries.map((entry) {
                return Step(
                  title: Text(entry.value),
                  content: Container(),
                  isActive: _currentStep >= entry.key,
                  state: _currentStep > entry.key
                      ? StepState.complete
                      : StepState.indexed,
                );
              }).toList(),
            ),
          ),
          Padding(
            padding: EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _advanceTrip,
                child: Text('Avanzar al Siguiente Paso'),
                style: ElevatedButton.styleFrom(
                  padding: EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _advanceTrip() async {
    final position = await _locationService.getCurrentLocation();
    if (position != null) {
      _driverService.sendLocationWithProgress(
        position.latitude,
        position.longitude,
      );
      
      if (_currentStep < _tripSteps.length - 1) {
        setState(() {
          _currentStep++;
        });
      }
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('✅ Paso completado')),
      );
    }
  }

  void _nextStep() {
    if (_currentStep < _tripSteps.length - 1) {
      setState(() {
        _currentStep++;
      });
    }
  }

  void _previousStep() {
    if (_currentStep > 0) {
      setState(() {
        _currentStep--;
      });
    }
  }
}
```

---

## 🚀 EJEMPLO COMPLETO - MAIN.DART

```dart
// lib/main.dart
import 'package:flutter/material.dart';
import 'screens/driver_screen.dart';
import 'screens/chat_screen.dart';
import 'screens/trip_progress_screen.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'App Conductor',
      theme: ThemeData(
        primarySwatch: Colors.green,
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      home: DriverScreen(),
      routes: {
        '/chat': (context) => ChatScreen(),
        '/progress': (context) => TripProgressScreen(),
      },
    );
  }
}
```

---

## 📝 DIFERENCIAS CLAVE CON APP PASAJERO

### 1. **Dos Tipos de Ubicación**
```dart
// Ubicación básica (no avanza estado)
_driverService.sendLocation(lat, lon);

// Ubicación con progresión (avanza estado del viaje)
_driverService.sendLocationWithProgress(lat, lon);
```

### 2. **Tracking Automático**
El conductor necesita enviar ubicación continuamente:
```dart
_locationService.startPeriodicLocationTracking(
  withProgress: false,
  intervalSeconds: 10,
);
```

### 3. **Progresión de Estados**
El evento `driver-location` avanza automáticamente por la secuencia:
- driverOnWay → driverArrived → tripStarted → tripInProgress → tripCompleted

### 4. **Eventos Diferentes**
- `get-trip-d-on` en lugar de `get-trip-p-on`
- `trip-cancel-d-send` en lugar de `trip-cancel-p-send`
- Recibe `passenger-location-update` en lugar de `driver-location-update`

---

## 🚕 SISTEMA DE ASIGNACIÓN DE VIAJES (NUEVO)

Para implementar el sistema completo de asignación de viajes (recibir, aceptar y rechazar viajes), consulta:

📄 **[ASIGNACION_VIAJES.md](./ASIGNACION_VIAJES.md)**

Este documento incluye:
- ✅ Modelo `TripAvailable` completo
- ✅ Pantalla de viaje disponible con temporizador
- ✅ Integración en la pantalla principal
- ✅ Manejo de aceptación y rechazo
- ✅ UI completa y funcional

---

## 📚 RECURSOS

- [socket_io_client](https://pub.dev/packages/socket_io_client)
- [geolocator](https://pub.dev/packages/geolocator)
- [flutter_background_service](https://pub.dev/packages/flutter_background_service)
- [Documentación de Eventos](./CONDUCTOR_EVENTOS.md)
- [Sistema de Asignación de Viajes](./ASIGNACION_VIAJES.md)
- [Flujo Completo](./FLUJO_COMPLETO.md)
