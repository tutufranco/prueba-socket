# 📱 IMPLEMENTACIÓN FLUTTER - APP PASAJERO

## 📋 TABLA DE CONTENIDOS
1. [Configuración Inicial](#configuración-inicial)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Servicio WebSocket](#servicio-websocket)
4. [Servicio de Pasajero](#servicio-de-pasajero)
5. [Modelos de Datos](#modelos-de-datos)
6. [Pantallas y UI](#pantallas-y-ui)
7. [Gestión de Estado](#gestión-de-estado)
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
</manifest>
```

```xml
<!-- ios/Runner/Info.plist -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>Necesitamos tu ubicación para mostrar tu posición en el viaje</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>Necesitamos tu ubicación para rastrear tu viaje</string>
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
│   └── driver_model.dart
├── services/
│   ├── websocket_service.dart
│   ├── passenger_service.dart
│   └── location_service.dart
├── providers/
│   ├── trip_provider.dart
│   └── message_provider.dart
├── screens/
│   ├── trip_screen.dart
│   ├── chat_screen.dart
│   └── incident_screen.dart
└── widgets/
    ├── trip_status_widget.dart
    ├── message_bubble.dart
    └── driver_location_map.dart
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

    _socket!.onReconnectError((error) {
      print('❌ Error de reconexión: $error');
    });

    _socket!.onReconnectFailed((_) {
      print('❌ Falló la reconexión');
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

## 🚶 SERVICIO DE PASAJERO

```dart
// lib/services/passenger_service.dart
import 'dart:async';
import 'websocket_service.dart';
import '../models/trip_model.dart';
import '../models/message_model.dart';
import '../models/incident_model.dart';

class PassengerService {
  static final PassengerService _instance = PassengerService._internal();
  factory PassengerService() => _instance;
  PassengerService._internal();

  final WebSocketService _ws = WebSocketService();

  // Controllers de streams
  final _tripDataController = StreamController<TripModel>.broadcast();
  final _tripStatusController = StreamController<TripStatus>.broadcast();
  final _messageController = StreamController<MessageModel>.broadcast();
  final _incidentController = StreamController<IncidentModel>.broadcast();
  final _driverLocationController = StreamController<DriverLocation>.broadcast();
  final _allMessagesController = StreamController<List<MessageModel>>.broadcast();

  // Streams públicos
  Stream<TripModel> get tripDataStream => _tripDataController.stream;
  Stream<TripStatus> get tripStatusStream => _tripStatusController.stream;
  Stream<MessageModel> get messageStream => _messageController.stream;
  Stream<IncidentModel> get incidentStream => _incidentController.stream;
  Stream<DriverLocation> get driverLocationStream => _driverLocationController.stream;
  Stream<List<MessageModel>> get allMessagesStream => _allMessagesController.stream;

  // Inicializar servicio
  Future<void> initialize() async {
    await _ws.connect();
    _setupEventListeners();
  }

  // Configurar listeners de eventos
  void _setupEventListeners() {
    // Datos iniciales del viaje
    _ws.on('get-trip-p-on', (data) {
      print('📱 Datos del viaje recibidos');
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

    // Ubicación del conductor
    _ws.on('driver-location-update', (data) {
      print('📍 Ubicación del conductor actualizada');
      try {
        final location = DriverLocation.fromJson(data);
        _driverLocationController.add(location);
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
  }

  // =============== MÉTODOS DE ENVÍO ===============

  // Enviar ubicación
  void sendLocation(double lat, double lon) {
    _ws.emit('location-p-send', {
      'lat': lat,
      'lon': lon,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    });
    print('📍 Ubicación enviada: ($lat, $lon)');
  }

  // Enviar mensaje
  void sendMessage(String message) {
    _ws.emit('trip-message-p-send', {
      'message': message,
    });
    print('💬 Mensaje enviado: $message');
  }

  // Reportar incidente
  void reportIncident(String message) {
    _ws.emit('trip-incident-p-send', {
      'message': message,
    });
    print('⚠️ Incidente reportado: $message');
  }

  // Cancelar viaje
  void cancelTrip(String reason) {
    _ws.emit('trip-cancel-p-send', {
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
    _ws.emit('get-trip-p-on', {});
    print('📱 Solicitando datos del viaje');
  }

  // =============== LIMPIEZA ===============

  void dispose() {
    _tripDataController.close();
    _tripStatusController.close();
    _messageController.close();
    _incidentController.close();
    _driverLocationController.close();
    _allMessagesController.close();
    _ws.disconnect();
  }
}
```

---

## 📊 MODELOS DE DATOS

### Trip Model

```dart
// lib/models/trip_model.dart
class TripModel {
  final String serviceId;
  final DriverModel driver;
  final TripStatus tripStatus;
  final List<MessageModel> messages;
  final List<IncidentModel> incidents;

  TripModel({
    required this.serviceId,
    required this.driver,
    required this.tripStatus,
    required this.messages,
    required this.incidents,
  });

  factory TripModel.fromJson(Map<String, dynamic> json) {
    return TripModel(
      serviceId: json['service_id'] ?? '',
      driver: DriverModel.fromJson(json['driverProfile'] ?? {}),
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

### Message Model

```dart
// lib/models/message_model.dart
class MessageModel {
  final String messageId;
  final String messageUser;
  final String messageMessage;
  final DateTime messageTimestamp;

  MessageModel({
    required this.messageId,
    required this.messageUser,
    required this.messageMessage,
    required this.messageTimestamp,
  });

  factory MessageModel.fromJson(Map<String, dynamic> json) {
    return MessageModel(
      messageId: json['message_id'] ?? '',
      messageUser: json['message_user'] ?? '',
      messageMessage: json['message_message'] ?? '',
      messageTimestamp: DateTime.parse(json['message_timestamp']),
    );
  }

  bool get isPassenger => messageUser == 'passenger';
  bool get isDriver => messageUser == 'driver';
}
```

### Incident Model

```dart
// lib/models/incident_model.dart
class IncidentModel {
  final String incidentId;
  final String incidentUser;
  final String incidentMessage;
  final DateTime incidentTimestamp;

  IncidentModel({
    required this.incidentId,
    required this.incidentUser,
    required this.incidentMessage,
    required this.incidentTimestamp,
  });

  factory IncidentModel.fromJson(Map<String, dynamic> json) {
    return IncidentModel(
      incidentId: json['incident_id'] ?? '',
      incidentUser: json['incindent_user'] ?? '',
      incidentMessage: json['incindent_message'] ?? '',
      incidentTimestamp: DateTime.parse(json['incindent_timestamp']),
    );
  }
}
```

### Trip Status

```dart
// lib/models/trip_status.dart
class TripStatus {
  final int tripStatus;
  final String tripStatusText;
  final bool passengerBoarded;
  final bool paymentConfirmed;
  final int messageNumber;
  final int incidentNumber;

  TripStatus({
    required this.tripStatus,
    required this.tripStatusText,
    required this.passengerBoarded,
    required this.paymentConfirmed,
    required this.messageNumber,
    required this.incidentNumber,
  });

  factory TripStatus.fromJson(Map<String, dynamic> json) {
    return TripStatus(
      tripStatus: json['tripStatus'] ?? 0,
      tripStatusText: json['tripStatusText'] ?? 'idle',
      passengerBoarded: json['passenger_boarded'] ?? false,
      paymentConfirmed: json['payment_confirmed'] ?? false,
      messageNumber: json['message_number'] ?? 0,
      incidentNumber: json['incident_number'] ?? 0,
    );
  }

  String get statusDisplay {
    switch (tripStatusText) {
      case 'idle': return 'Inactivo';
      case 'searching': return 'Buscando conductor';
      case 'driverFound': return 'Conductor encontrado';
      case 'driverAccepted': return 'Conductor aceptó';
      case 'driverOnWay': return 'Conductor en camino';
      case 'driverArrived': return 'Conductor llegó';
      case 'tripStarted': return 'Viaje iniciado';
      case 'tripInProgress': return 'Viaje en progreso';
      case 'tripCompleted': return 'Viaje completado';
      case 'tripCancelled': return 'Viaje cancelado';
      case 'tripCancelledByDriver': return 'Cancelado por conductor';
      default: return tripStatusText;
    }
  }
}
```

### Driver Model

```dart
// lib/models/driver_model.dart
class DriverModel {
  final String driverId;
  final String fullName;
  final double qualifications;
  final String selfie;
  final int totalTrips;
  final String carModel;
  final String carColor;
  final String carPlate;
  final String phone;

  DriverModel({
    required this.driverId,
    required this.fullName,
    required this.qualifications,
    required this.selfie,
    required this.totalTrips,
    required this.carModel,
    required this.carColor,
    required this.carPlate,
    required this.phone,
  });

  factory DriverModel.fromJson(Map<String, dynamic> json) {
    return DriverModel(
      driverId: json['driver_id'] ?? '',
      fullName: json['full_name'] ?? '',
      qualifications: (json['qualifications'] ?? 0).toDouble(),
      selfie: json['selfie'] ?? '',
      totalTrips: json['total_trips'] ?? 0,
      carModel: json['car_model'] ?? '',
      carColor: json['car_color'] ?? '',
      carPlate: json['car_plate'] ?? '',
      phone: json['phone'] ?? '',
    );
  }
}

class DriverLocation {
  final double lat;
  final double lon;
  final int timestamp;
  final String driverId;

  DriverLocation({
    required this.lat,
    required this.lon,
    required this.timestamp,
    required this.driverId,
  });

  factory DriverLocation.fromJson(Map<String, dynamic> json) {
    return DriverLocation(
      lat: (json['lat'] ?? 0).toDouble(),
      lon: (json['lon'] ?? 0).toDouble(),
      timestamp: json['timestamp'] ?? 0,
      driverId: json['driver_id'] ?? '',
    );
  }
}
```

---

## 🎨 PANTALLAS Y UI

### Pantalla Principal del Viaje

```dart
// lib/screens/trip_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/passenger_service.dart';
import '../models/trip_status.dart';
import '../providers/trip_provider.dart';

class TripScreen extends StatefulWidget {
  @override
  _TripScreenState createState() => _TripScreenState();
}

class _TripScreenState extends State<TripScreen> {
  final PassengerService _passengerService = PassengerService();

  @override
  void initState() {
    super.initState();
    _initializeService();
  }

  Future<void> _initializeService() async {
    await _passengerService.initialize();
    
    // Escuchar cambios de estado
    _passengerService.tripStatusStream.listen((status) {
      setState(() {});
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Mi Viaje'),
        actions: [
          IconButton(
            icon: Icon(Icons.message),
            onPressed: () => Navigator.pushNamed(context, '/chat'),
          ),
        ],
      ),
      body: StreamBuilder<TripStatus>(
        stream: _passengerService.tripStatusStream,
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return Center(child: CircularProgressIndicator());
          }

          final status = snapshot.data!;

          return Column(
            children: [
              // Estado del viaje
              _buildStatusCard(status),
              
              // Mapa (implementar después)
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
          );
        },
      ),
    );
  }

  Widget _buildStatusCard(TripStatus status) {
    return Card(
      margin: EdgeInsets.all(16),
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            Text(
              status.statusDisplay,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
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
                ),
                _buildStatItem(
                  icon: Icons.warning,
                  label: 'Incidentes',
                  value: '${status.incidentNumber}',
                ),
                _buildStatItem(
                  icon: Icons.check_circle,
                  label: 'Abordado',
                  value: status.passengerBoarded ? 'Sí' : 'No',
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
  }) {
    return Column(
      children: [
        Icon(icon, size: 32),
        SizedBox(height: 4),
        Text(label, style: TextStyle(fontSize: 12)),
        Text(
          value,
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }

  Widget _buildActionButtons() {
    return Container(
      padding: EdgeInsets.all(16),
      child: Row(
        children: [
          Expanded(
            child: ElevatedButton.icon(
              icon: Icon(Icons.location_on),
              label: Text('Enviar Ubicación'),
              onPressed: _sendLocation,
            ),
          ),
          SizedBox(width: 16),
          Expanded(
            child: ElevatedButton.icon(
              icon: Icon(Icons.cancel),
              label: Text('Cancelar Viaje'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
              ),
              onPressed: _cancelTrip,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _sendLocation() async {
    // Implementar con geolocator
    _passengerService.sendLocation(-34.6037, -58.3816);
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Ubicación enviada')),
    );
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
            child: Text('Sí, cancelar'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      _passengerService.cancelTrip('Cambio de planes');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Viaje cancelado')),
      );
    }
  }

  @override
  void dispose() {
    // No cerrar aquí si se usa en toda la app
    super.dispose();
  }
}
```

### Pantalla de Chat

```dart
// lib/screens/chat_screen.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/passenger_service.dart';
import '../models/message_model.dart';

class ChatScreen extends StatefulWidget {
  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final PassengerService _passengerService = PassengerService();
  final TextEditingController _messageController = TextEditingController();
  final List<MessageModel> _messages = [];
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _loadMessages();
    _listenToMessages();
  }

  void _loadMessages() {
    _passengerService.getAllMessages();
    
    _passengerService.allMessagesStream.listen((messages) {
      setState(() {
        _messages.clear();
        _messages.addAll(messages);
      });
      _scrollToBottom();
    });
  }

  void _listenToMessages() {
    _passengerService.messageStream.listen((message) {
      setState(() {
        _messages.add(message);
      });
      _scrollToBottom();
    });
  }

  void _scrollToBottom() {
    Future.delayed(Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Chat con Conductor'),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final message = _messages[index];
                return _buildMessageBubble(message);
              },
            ),
          ),
          _buildMessageInput(),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(MessageModel message) {
    final isMe = message.isPassenger;
    
    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: EdgeInsets.only(bottom: 8),
        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isMe ? Colors.blue : Colors.grey[300],
          borderRadius: BorderRadius.circular(20),
        ),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.7,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              message.messageMessage,
              style: TextStyle(
                color: isMe ? Colors.white : Colors.black87,
                fontSize: 16,
              ),
            ),
            SizedBox(height: 4),
            Text(
              DateFormat('HH:mm').format(message.messageTimestamp),
              style: TextStyle(
                color: isMe ? Colors.white70 : Colors.black54,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageInput() {
    return Container(
      padding: EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            offset: Offset(0, -2),
            blurRadius: 4,
            color: Colors.black12,
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _messageController,
              decoration: InputDecoration(
                hintText: 'Escribe un mensaje...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(25),
                ),
                contentPadding: EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 10,
                ),
              ),
              onSubmitted: (_) => _sendMessage(),
            ),
          ),
          SizedBox(width: 8),
          CircleAvatar(
            backgroundColor: Colors.blue,
            child: IconButton(
              icon: Icon(Icons.send, color: Colors.white),
              onPressed: _sendMessage,
            ),
          ),
        ],
      ),
    );
  }

  void _sendMessage() {
    final text = _messageController.text.trim();
    if (text.isNotEmpty) {
      _passengerService.sendMessage(text);
      _messageController.clear();
    }
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }
}
```

---

## 🚀 EJEMPLO COMPLETO - MAIN.DART

```dart
// lib/main.dart
import 'package:flutter/material.dart';
import 'screens/trip_screen.dart';
import 'screens/chat_screen.dart';
import 'services/passenger_service.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'App Pasajero',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      home: TripScreen(),
      routes: {
        '/chat': (context) => ChatScreen(),
      },
    );
  }
}
```

---

## 📝 NOTAS IMPORTANTES

### 1. **Configuración de URL**
Cambia la URL del servidor en `websocket_service.dart`:
```dart
static const String SERVER_URL = 'http://YOUR_SERVER_IP:3000';
```

### 2. **Permisos de Ubicación**
Implementar solicitud de permisos con `permission_handler`.

### 3. **Manejo de Estado**
Para apps más complejas, considera usar Provider o Riverpod.

### 4. **Persistencia**
Implementar `shared_preferences` o `hive` para guardar datos localmente.

### 5. **Testing**
Probar con emulador usando `10.0.2.2:3000` para Android o `localhost:3000` para iOS.

---

## 🎯 PRÓXIMOS PASOS

1. ✅ Implementar Google Maps para mostrar ubicación
2. ✅ Agregar servicio de ubicación con Geolocator
3. ✅ Implementar pantalla de incidentes
4. ✅ Agregar notificaciones push
5. ✅ Implementar persistencia local
6. ✅ Agregar manejo de errores robusto
7. ✅ Implementar tests unitarios

---

## 📚 RECURSOS

- [socket_io_client](https://pub.dev/packages/socket_io_client)
- [geolocator](https://pub.dev/packages/geolocator)
- [provider](https://pub.dev/packages/provider)
- [Documentación de Eventos](./PASAJERO_EVENTOS.md)
