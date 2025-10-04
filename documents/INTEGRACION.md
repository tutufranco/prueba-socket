# 🔌 GUÍA DE INTEGRACIÓN - WebSocket Gateway

## 📋 TABLA DE CONTENIDOS
1. [Requisitos Previos](#requisitos-previos)
2. [Instalación](#instalación)
3. [Configuración del Servidor](#configuración-del-servidor)
4. [Integración en Cliente Web](#integración-en-cliente-web)
5. [Integración en React Native](#integración-en-react-native)
6. [Integración en Flutter/Dart](#integración-en-flutterdart)
7. [Manejo de Errores](#manejo-de-errores)
8. [Testing](#testing)
9. [Deployment](#deployment)

---

## ✅ REQUISITOS PREVIOS

### Backend (NestJS)
- Node.js >= 16.x
- npm >= 8.x
- NestJS >= 10.x

### Cliente
- Socket.IO Client >= 4.x
- Navegador moderno o React Native >= 0.70

---

## 📦 INSTALACIÓN

### 1. Backend (Servidor NestJS)

```bash
# Instalar dependencias
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install @nestjs/event-emitter

# Instalar tipos de TypeScript
npm install -D @types/socket.io
```

### 2. Cliente Web (JavaScript/TypeScript)

```bash
# Instalar Socket.IO Client
npm install socket.io-client
```

### 3. Cliente React Native

```bash
# Instalar Socket.IO Client para React Native
npm install socket.io-client
npm install react-native-get-random-values # Para UUID
```

### 4. Cliente Flutter/Dart

```yaml
# En pubspec.yaml
dependencies:
  socket_io_client: ^2.0.0
```

---

## ⚙️ CONFIGURACIÓN DEL SERVIDOR

### 1. Configurar Gateway

```typescript
// src/socket/socket.gateway.ts
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: { 
    origin: '*',  // En producción, especificar dominios permitidos
    credentials: true 
  },
  namespace: '/events',
})
export class ChatGateway {
  @WebSocketServer() server: Server;
  
  // ... implementación
}
```

### 2. Registrar en Módulo

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ChatGateway } from './socket/socket.gateway';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
  ],
  providers: [ChatGateway],
})
export class AppModule {}
```

### 3. Configurar Puerto (Opcional)

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  console.log('🚀 Servidor corriendo en http://localhost:3000');
}
bootstrap();
```

---

## 🌐 INTEGRACIÓN EN CLIENTE WEB

### Implementación Completa (JavaScript/TypeScript)

```javascript
// services/websocket.service.js
import io from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  // Conectar al servidor
  connect(url = 'ws://localhost:3000/events') {
    this.socket = io(url, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupDefaultListeners();
    return this.socket;
  }

  // Configurar listeners por defecto
  setupDefaultListeners() {
    this.socket.on('connect', () => {
      console.log('✅ Conectado al servidor');
      this.emit('connection:success');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Desconectado:', reason);
      this.emit('connection:lost', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión:', error);
      this.emit('connection:error', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconectado (intento ${attemptNumber})`);
      this.emit('connection:reconnect', attemptNumber);
    });
  }

  // Registrar listener de evento
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Emitir evento interno
  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }

  // Enviar evento al servidor
  send(event, data, callback) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data, callback);
    } else {
      console.error('❌ Socket no conectado');
    }
  }

  // Desconectar
  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  // Verificar si está conectado
  isConnected() {
    return this.socket && this.socket.connected;
  }
}

// Exportar instancia singleton
export const wsService = new WebSocketService();
```

### Clase para Pasajero

```javascript
// services/passenger.service.js
import { wsService } from './websocket.service';

class PassengerService {
  constructor() {
    this.tripData = null;
    this.setupListeners();
  }

  setupListeners() {
    // Datos iniciales del viaje
    wsService.on('get-trip-p-on', (data) => {
      console.log('📱 Datos del viaje recibidos:', data);
      this.tripData = data;
      this.onTripDataReceived(data);
    });

    // Cambios de estado
    wsService.on('send-change-trip', (tripChange) => {
      console.log('🔄 Estado del viaje:', tripChange);
      this.onTripStatusChanged(tripChange);
    });

    // Ubicación del conductor
    wsService.on('driver-location-update', (location) => {
      console.log('📍 Ubicación del conductor:', location);
      this.onDriverLocationUpdate(location);
    });

    // Incidentes
    wsService.on('trip-incident-p-on', (incident) => {
      console.log('⚠️ Incidente reportado:', incident);
      this.onIncidentReceived(incident);
    });

    // Mensajes
    wsService.on('trip-message-p-on', (message) => {
      console.log('💬 Mensaje recibido:', message);
      this.onMessageReceived(message);
    });

    // Lista de mensajes
    wsService.on('all-messages', (response) => {
      console.log('📋 Lista de mensajes:', response);
      this.onAllMessagesReceived(response);
    });
  }

  // Enviar ubicación
  sendLocation(lat, lon) {
    wsService.send('location-p-send', {
      lat,
      lon,
      timestamp: Date.now()
    });
  }

  // Reportar incidente
  reportIncident(message) {
    wsService.send('trip-incident-p-send', { message });
  }

  // Enviar mensaje
  sendMessage(message) {
    wsService.send('trip-message-p-send', { message });
  }

  // Obtener todos los mensajes
  getAllMessages() {
    wsService.send('get-messages-incidents', {});
  }

  // Cancelar viaje
  cancelTrip(reason) {
    wsService.send('trip-cancel-p-send', { reason });
  }

  // Callbacks (sobrescribir en implementación)
  onTripDataReceived(data) {}
  onTripStatusChanged(tripChange) {}
  onDriverLocationUpdate(location) {}
  onIncidentReceived(incident) {}
  onMessageReceived(message) {}
  onAllMessagesReceived(response) {}
}

export const passengerService = new PassengerService();
```

### Uso en React

```jsx
// components/TripComponent.jsx
import React, { useEffect, useState } from 'react';
import { wsService } from '../services/websocket.service';
import { passengerService } from '../services/passenger.service';

function TripComponent() {
  const [tripData, setTripData] = useState(null);
  const [tripStatus, setTripStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');

  useEffect(() => {
    // Conectar
    wsService.connect('ws://localhost:3000/events');

    // Configurar callbacks
    passengerService.onTripDataReceived = (data) => {
      setTripData(data);
    };

    passengerService.onTripStatusChanged = (status) => {
      setTripStatus(status);
    };

    passengerService.onMessageReceived = (message) => {
      setMessages(prev => [...prev, message]);
    };

    passengerService.onAllMessagesReceived = (response) => {
      if (response.success) {
        setMessages(response.data.data.messages);
      }
    };

    // Limpiar al desmontar
    return () => {
      wsService.disconnect();
    };
  }, []);

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      passengerService.sendMessage(messageInput);
      setMessageInput('');
    }
  };

  const handleSendLocation = () => {
    navigator.geolocation.getCurrentPosition((position) => {
      passengerService.sendLocation(
        position.coords.latitude,
        position.coords.longitude
      );
    });
  };

  return (
    <div className="trip-container">
      <h2>Estado del Viaje</h2>
      {tripStatus && (
        <div className="status">
          <p>Estado: {tripStatus.tripStatusText}</p>
          <p>Mensajes: {tripStatus.message_number}</p>
          <p>Incidentes: {tripStatus.incident_number}</p>
        </div>
      )}

      <div className="messages">
        <h3>Mensajes</h3>
        {messages.map(msg => (
          <div key={msg.message_id} className={`message ${msg.message_user}`}>
            <strong>{msg.message_user}:</strong> {msg.message_message}
            <small>{new Date(msg.message_timestamp).toLocaleString()}</small>
          </div>
        ))}
      </div>

      <div className="message-input">
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder="Escribe un mensaje..."
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <button onClick={handleSendMessage}>Enviar</button>
      </div>

      <div className="actions">
        <button onClick={handleSendLocation}>Enviar Ubicación</button>
        <button onClick={() => passengerService.getAllMessages()}>
          Cargar Mensajes
        </button>
      </div>
    </div>
  );
}

export default TripComponent;
```

---

## 📱 INTEGRACIÓN EN REACT NATIVE

```javascript
// services/WebSocketService.js
import io from 'socket.io-client';
import 'react-native-get-random-values';

class WebSocketService {
  constructor() {
    this.socket = null;
  }

  connect(url = 'ws://localhost:3000/events') {
    this.socket = io(url, {
      transports: ['websocket'],
      jsonp: false,
    });

    this.socket.on('connect', () => {
      console.log('✅ Conectado');
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error:', error);
    });

    return this.socket;
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export default new WebSocketService();
```

```jsx
// screens/TripScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList } from 'react-native';
import WebSocketService from '../services/WebSocketService';

export default function TripScreen() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    WebSocketService.connect('ws://YOUR_SERVER_IP:3000/events');

    WebSocketService.on('trip-message-p-on', (message) => {
      setMessages(prev => [...prev, message]);
    });

    WebSocketService.on('all-messages', (response) => {
      if (response.success) {
        setMessages(response.data.data.messages);
      }
    });

    return () => {
      WebSocketService.disconnect();
    };
  }, []);

  const sendMessage = () => {
    if (inputText.trim()) {
      WebSocketService.emit('trip-message-p-send', { message: inputText });
      setInputText('');
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Mensajes</Text>
      
      <FlatList
        data={messages}
        keyExtractor={(item) => item.message_id}
        renderItem={({ item }) => (
          <View style={{ padding: 10, backgroundColor: '#f0f0f0', margin: 5 }}>
            <Text style={{ fontWeight: 'bold' }}>{item.message_user}</Text>
            <Text>{item.message_message}</Text>
            <Text style={{ fontSize: 10, color: '#666' }}>
              {new Date(item.message_timestamp).toLocaleString()}
            </Text>
          </View>
        )}
      />

      <View style={{ flexDirection: 'row' }}>
        <TextInput
          style={{ flex: 1, borderWidth: 1, padding: 10 }}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Escribe un mensaje..."
        />
        <Button title="Enviar" onPress={sendMessage} />
      </View>
    </View>
  );
}
```

---

## 🎯 INTEGRACIÓN EN FLUTTER/DART

```dart
// lib/services/websocket_service.dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class WebSocketService {
  IO.Socket? socket;

  void connect(String url) {
    socket = IO.io(url, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': true,
    });

    socket!.onConnect((_) {
      print('✅ Conectado al servidor');
    });

    socket!.onDisconnect((_) {
      print('❌ Desconectado del servidor');
    });

    socket!.onConnectError((error) {
      print('❌ Error de conexión: $error');
    });
  }

  void on(String event, Function(dynamic) callback) {
    socket?.on(event, callback);
  }

  void emit(String event, dynamic data) {
    socket?.emit(event, data);
  }

  void disconnect() {
    socket?.disconnect();
    socket?.dispose();
  }
}
```

```dart
// lib/screens/trip_screen.dart
import 'package:flutter/material.dart';
import '../services/websocket_service.dart';

class TripScreen extends StatefulWidget {
  @override
  _TripScreenState createState() => _TripScreenState();
}

class _TripScreenState extends State<TripScreen> {
  final WebSocketService _ws = WebSocketService();
  List<dynamic> messages = [];
  final TextEditingController _controller = TextEditingController();

  @override
  void initState() {
    super.initState();
    _ws.connect('ws://localhost:3000/events');

    _ws.on('trip-message-p-on', (message) {
      setState(() {
        messages.add(message);
      });
    });

    _ws.on('all-messages', (response) {
      if (response['success']) {
        setState(() {
          messages = response['data']['data']['messages'];
        });
      }
    });
  }

  void _sendMessage() {
    if (_controller.text.isNotEmpty) {
      _ws.emit('trip-message-p-send', {'message': _controller.text});
      _controller.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Mensajes del Viaje')),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              itemCount: messages.length,
              itemBuilder: (context, index) {
                final msg = messages[index];
                return ListTile(
                  title: Text(msg['message_message']),
                  subtitle: Text(msg['message_user']),
                );
              },
            ),
          ),
          Padding(
            padding: EdgeInsets.all(8.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: InputDecoration(hintText: 'Mensaje...'),
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.send),
                  onPressed: _sendMessage,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _ws.disconnect();
    super.dispose();
  }
}
```

---

## ⚠️ MANEJO DE ERRORES

```javascript
// Manejo completo de errores
class ErrorHandler {
  static handleConnectionError(error) {
    console.error('Error de conexión:', error);
    // Mostrar notificación al usuario
    // Intentar reconexión
  }

  static handleEventError(event, error) {
    console.error(`Error en evento ${event}:`, error);
    // Log a servidor de monitoreo
    // Mostrar mensaje al usuario
  }

  static handleTimeout(event) {
    console.warn(`Timeout en evento ${event}`);
    // Reintentar o mostrar mensaje
  }
}

// Uso con timeout
wsService.send('trip-message-p-send', { message: 'Hola' });

setTimeout(() => {
  ErrorHandler.handleTimeout('trip-message-p-send');
}, 5000);
```

---

## 🧪 TESTING

### Testing en Postman
Ver [GUIA_IMPLEMENTACION.md](./GUIA_IMPLEMENTACION.md#testing-con-postman)

### Testing Unitario (Jest)

```javascript
// tests/websocket.test.js
import { wsService } from '../services/websocket.service';

describe('WebSocket Service', () => {
  beforeEach(() => {
    wsService.connect('ws://localhost:3000/events');
  });

  afterEach(() => {
    wsService.disconnect();
  });

  test('debe conectarse correctamente', (done) => {
    wsService.on('connection:success', () => {
      expect(wsService.isConnected()).toBe(true);
      done();
    });
  });

  test('debe enviar mensaje', (done) => {
    wsService.send('trip-message-p-send', { message: 'Test' });
    
    wsService.on('trip-message-p-on', (message) => {
      expect(message.message_message).toBe('Test');
      done();
    });
  });
});
```

---

## 🚀 DEPLOYMENT

### Variables de Entorno

```env
# .env.production
WEBSOCKET_URL=wss://your-domain.com/events
PORT=3000
NODE_ENV=production
```

### Configuración para Producción

```typescript
// src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  });
  
  await app.listen(process.env.PORT || 3000);
}
```

### Cliente para Producción

```javascript
const WEBSOCKET_URL = process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:3000/events';

wsService.connect(WEBSOCKET_URL);
```

---

## 📚 RECURSOS ADICIONALES

- [Documentación de Eventos de Pasajero](./PASAJERO_EVENTOS.md)
- [Documentación de Eventos de Conductor](./CONDUCTOR_EVENTOS.md)
- [Flujo Completo del Sistema](./FLUJO_COMPLETO.md)
- [Interfaces y Tipos](./INTERFACES_TIPOS.md)
