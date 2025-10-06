import { Logger} from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { buildSendTripPassanger, buildSendTripDriver, buildTripChange } from './helpers';
import { TripStatusV2, getTripStatusText } from './interface';
import { OnEvent } from '@nestjs/event-emitter';
import { GlobalEvent } from 'src/global-event.dto';
import { 
  GET_TRIP_P_ON, 
  GET_TRIP_D_ON,
  LOCATION_P_SEND,
  LOCATION_D_SEND,
  DRIVER_LOCATION,
  TRIP_CANCEL_P_SEND,
  TRIP_CANCEL_D_SEND,
  TRIP_INCIDENT_P_SEND,
  TRIP_INCIDENT_D_SEND,
  TRIP_MESSAGE_P_SEND,
  TRIP_MESSAGE_D_SEND,
  GET_MESSAGES_INCIDENTS,
  ALL_MESSAGES,
  TRIP_REQUEST,
  TRIP_AVAILABLE,
  TRIP_ACCEPT,
  TRIP_REJECT,
  SEND_CHANGE_TRIP, 
  DRIVER_LOCATION_UPDATE,
  GLOBAL_EVENT
} from './const';


// Interface para datos de ubicación
interface LocationData {
  lat: number;
  lon: number;
  timestamp?: number;
}
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/events', // namespace con barra inicial
})
export class ChatGateway {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);
  
  // Estado global compartido para todas las conexiones
  private tripChange = buildTripChange({tripStatus: TripStatusV2.idle});
  
  // Contador para seguir el progreso del viaje
  private locationUpdateCount = 0;
  
  // Arrays para almacenar incidentes y mensajes
  private incidents: any[] = [];
  private messages: any[] = [];
  
  // Map para rastrear viajes pendientes por conductor
  private pendingTrips: Map<string, any> = new Map();
  
  // Secuencia de estados del viaje
  private readonly tripStateSequence = [
    TripStatusV2.driverOnWay,
    TripStatusV2.driverArrived,
    TripStatusV2.tripStarted,
    TripStatusV2.tripInProgress,
    TripStatusV2.tripCompleted
  ];
   

  handleConnection(client: Socket) {
    this.logger.log(`✅ Cliente conectado: ${client.id}`);
    
    // Usar setTimeout para asegurar que el cliente esté completamente conectado
    setTimeout(() => {
      // Enviar datos del viaje automáticamente al conectar
      // Enviar tanto para pasajero como conductor para simular el comportamiento
      const passengerTrip = buildSendTripPassanger({ 
        trip_status: this.tripChange.tripStatus 
      });
      const driverTrip = buildSendTripDriver({ 
        trip_status: this.tripChange.tripStatus 
      });
      
      // Incluir incidentes y mensajes acumulados
      passengerTrip.incident = this.incidents;
      passengerTrip.message = this.messages;
      passengerTrip.tripChange = this.tripChange;
      
      driverTrip.incident = this.incidents;
      driverTrip.message = this.messages;
      driverTrip.tripChange = this.tripChange;
      
      // Enviar datos para pasajero
      client.emit(GET_TRIP_P_ON, passengerTrip);
      this.logger.log(`📤 Enviado get-trip-p-on a ${client.id}`);
      
      // Enviar datos para conductor
      client.emit(GET_TRIP_D_ON, driverTrip);
      this.logger.log(`📤 Enviado get-trip-d-on a ${client.id}`);
    }, 1000);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`❌ Cliente desconectado: ${client.id}`);
  }

  // Evento para solicitar viaje (pasajero)
  @SubscribeMessage(TRIP_REQUEST)
  onTripRequest(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.logger.log(`🚕 Pasajero ${client.id} solicita viaje: ${JSON.stringify(data)}`);
    
    // Calcular estimaciones (en producción, usar un servicio real)
    const estimatedDistance = this.calculateDistance(
      data.pickup_location.lat,
      data.pickup_location.lon,
      data.dropoff_location.lat,
      data.dropoff_location.lon
    );
    const estimatedDuration = Math.round(estimatedDistance * 3); // ~3 min por km
    const estimatedFare = Math.round(estimatedDistance * 350); // $350 por km
    
    // Crear viaje
    const tripData = {
      trip_id: `trip-${Date.now()}`,
      passenger_id: data.passenger_id || client.id,
      passenger_name: data.passenger_name || 'Pasajero',
      passenger_rating: data.passenger_rating || 5.0,
      pickup_location: data.pickup_location,
      dropoff_location: data.dropoff_location,
      estimated_distance: estimatedDistance,
      estimated_duration: estimatedDuration,
      estimated_fare: estimatedFare,
    };
    
    // Cambiar estado a "searching"
    this.tripChange = buildTripChange({
      tripStatus: TripStatusV2.searching,
      passenger_boarded: false,
      payment_confirmed: false
    });
    
    // Notificar al pasajero que se está buscando conductor
    client.emit(SEND_CHANGE_TRIP, this.tripChange);
    this.logger.log(`📤 Estado cambiado a "searching" para pasajero ${client.id}`);
    
    // Buscar conductores disponibles y enviar viaje
    // En producción, aquí buscarías conductores cercanos en tu base de datos
    // Por ahora, broadcast a todos los conductores conectados
    this.broadcastTripToDrivers(tripData);
    
    return {
      success: true,
      message: 'Buscando conductor disponible...',
      trip_id: tripData.trip_id,
      estimated_distance: estimatedDistance,
      estimated_duration: estimatedDuration,
      estimated_fare: estimatedFare,
      tripChange: this.tripChange
    };
  }

  // Evento de conexión para pasajero
  @SubscribeMessage(GET_TRIP_P_ON)
  onGetTripPassenger(@ConnectedSocket() client: Socket) {
    this.logger.log(`👤 Pasajero ${client.id} solicita datos del viaje`);
    
    // Construir datos del viaje para pasajero con estado actual
    const passengerTrip = buildSendTripPassanger({ 
      trip_status: this.tripChange.tripStatus 
    });
    
    this.logger.log(`👤 Pasajero ${client.id} datos del viaje: ${JSON.stringify(passengerTrip)}`);
    // Enviar respuesta al pasajero
    client.emit(GET_TRIP_P_ON, passengerTrip);
    
    return { success: true };
  }

  // Evento de conexión para conductor
  @SubscribeMessage(GET_TRIP_D_ON)
  onGetTripDriver(@ConnectedSocket() client: Socket) {
    this.logger.log(`🚗 Conductor ${client.id} solicita datos del viaje`);
    
    // Construir datos del viaje para conductor con estado actual
    const driverTrip = buildSendTripDriver({ 
      trip_status: this.tripChange.tripStatus 
    });
    
    // Enviar respuesta al conductor
    client.emit(GET_TRIP_D_ON, driverTrip);
    
    return { success: true };
  }

  // Evento para ubicación del pasajero
  @SubscribeMessage(LOCATION_P_SEND)
  onPassengerLocation(@MessageBody() data: LocationData, @ConnectedSocket() client: Socket) {
    this.logger.log(`📍 Ubicación del pasajero ${client.id}: lat=${data.lat}, lon=${data.lon}`);
    
    // Broadcast de la ubicación del pasajero a todos los conductores
    client.broadcast.emit('passenger-location-update', {
      lat: data.lat,
      lon: data.lon,
      timestamp: data.timestamp || Date.now(),
      passenger_id: client.id
    });
    
    // Responder con el estado actual del viaje
    client.emit(SEND_CHANGE_TRIP, this.tripChange);
    this.logger.log(`📤 Enviado tripChange al pasajero ${client.id}: ${JSON.stringify(this.tripChange)}`);
    
    return { 
      success: true, 
      message: 'Ubicación del pasajero enviada',
      location: { lat: data.lat, lon: data.lon },
      tripChange: this.tripChange
    };
  }

  // Evento para ubicación del conductor (location-d-send)
  @SubscribeMessage(LOCATION_D_SEND)
  onDriverLocationSend(@MessageBody() data: LocationData, @ConnectedSocket() client: Socket) {
    this.logger.log(`📍 Ubicación del conductor ${client.id}: lat=${data.lat}, lon=${data.lon}`);
    
    // Broadcast de la ubicación del conductor a todos los pasajeros
    client.broadcast.emit(DRIVER_LOCATION_UPDATE, {
      lat: data.lat,
      lon: data.lon,
      timestamp: data.timestamp || Date.now(),
      driver_id: client.id
    });
    
    // Responder con el estado actual del viaje
    client.emit(SEND_CHANGE_TRIP, this.tripChange);
    this.logger.log(`📤 Enviado tripChange al conductor ${client.id}: ${JSON.stringify(this.tripChange)}`);
    
    return { 
      success: true, 
      message: 'Ubicación del conductor enviada',
      location: { lat: data.lat, lon: data.lon },
      tripChange: this.tripChange
    };
  }

  // Evento para ubicación del conductor (ya existía, pero lo mantengo)
  @SubscribeMessage(DRIVER_LOCATION)
  onDriverLocation(@MessageBody() data: LocationData, @ConnectedSocket() client: Socket) {
    this.logger.log(`📍 Ubicación del conductor ${client.id}: lat=${data.lat}, lon=${data.lon}`);
    
    // Incrementar contador global de actualizaciones
    this.locationUpdateCount++;
    
    // Obtener el siguiente estado en la secuencia
    const currentStateIndex = Math.min(this.locationUpdateCount - 1, this.tripStateSequence.length - 1);
    const nextState = this.tripStateSequence[currentStateIndex];
    
    this.logger.log(`🔄 Update #${this.locationUpdateCount} → ${nextState}`);
    
    // Actualizar el estado global del viaje
    this.tripChange = buildTripChange({ 
      tripStatus: nextState,
      passenger_boarded: nextState >= TripStatusV2.tripStarted,
      payment_confirmed: nextState === TripStatusV2.tripCompleted
    });
    
    // Broadcast a TODOS los clientes (pasajeros y conductores)
    this.server.emit(SEND_CHANGE_TRIP, this.tripChange);
    
    // También emitir la ubicación actualizada del conductor
    this.server.emit(DRIVER_LOCATION_UPDATE, {
      lat: data.lat,
      lon: data.lon,
      timestamp: data.timestamp || Date.now(),
      driver_id: client.id
    });
    
    // Responder directamente al conductor con el estado actualizado
    client.emit(SEND_CHANGE_TRIP, this.tripChange);
    this.logger.log(`📤 Enviado tripChange al conductor ${client.id}: ${JSON.stringify(this.tripChange)}`);
    
    // Si llegamos al final de la secuencia, reiniciar
    if (this.locationUpdateCount >= this.tripStateSequence.length) {
      this.logger.log('🎉 Viaje completado! Reiniciando secuencia...');
      this.locationUpdateCount = 0;
    }
    
    return { 
      success: true, 
      message: 'Ubicación del conductor recibida y tripChange enviado',
      tripStatus: this.tripChange.tripStatus,
      updateCount: this.locationUpdateCount,
      progress: `${currentStateIndex + 1}/${this.tripStateSequence.length}`,
      tripChange: this.tripChange
    };
  }

  @SubscribeMessage(SEND_CHANGE_TRIP)
  onSendChangeTrip(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.logger.log(`📨 Cambio manual de ${client.id}: ${JSON.stringify(data)}`);
    
    // Actualizar estado global
    if (data.tripStatus !== undefined) {
      this.tripChange.tripStatus = data.tripStatus;
      this.tripChange.tripStatusText = getTripStatusText(data.tripStatus);
    }
    if (data.passenger_boarded !== undefined) {
      this.tripChange.passenger_boarded = data.passenger_boarded;
    }
    if (data.payment_confirmed !== undefined) {
      this.tripChange.payment_confirmed = data.payment_confirmed;
    }
    
    // Broadcast a TODOS los clientes conectados
    this.server.emit(SEND_CHANGE_TRIP, this.tripChange);
    
    return { success: true, tripChange: this.tripChange };
  }

  // Evento para cancelar viaje (pasajero)
  @SubscribeMessage(TRIP_CANCEL_P_SEND)
  onPassengerCancelTrip(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.logger.log(`🚫 Pasajero ${client.id} cancela el viaje: ${JSON.stringify(data)}`);
    
    // Actualizar estado global a cancelado
    this.tripChange = buildTripChange({
      tripStatus: TripStatusV2.tripCancelled,
      passenger_boarded: true,
      payment_confirmed: false
    });
    
    // Broadcast a TODOS los clientes conectados
    this.server.emit(SEND_CHANGE_TRIP, this.tripChange);
    this.logger.log(`📤 Enviado tripChange cancelado: ${JSON.stringify(this.tripChange)}`);
    
    return { 
      success: true, 
      message: 'Viaje cancelado por el pasajero',
      tripChange: this.tripChange
    };
  }

  // Evento para cancelar viaje (conductor)
  @SubscribeMessage(TRIP_CANCEL_D_SEND)
  onDriverCancelTrip(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.logger.log(`🚫 Conductor ${client.id} cancela el viaje: ${JSON.stringify(data)}`);
    
    // Actualizar estado global a cancelado por conductor
    this.tripChange = buildTripChange({
      tripStatus: TripStatusV2.tripCancelledByDriver,
      passenger_boarded: true,
      payment_confirmed: false
    });
    
    // Broadcast a TODOS los clientes conectados
    this.server.emit(SEND_CHANGE_TRIP, this.tripChange);
    this.logger.log(`📤 Enviado tripChange cancelado por conductor: ${JSON.stringify(this.tripChange)}`);
    
    return { 
      success: true, 
      message: 'Viaje cancelado por el conductor',
      tripChange: this.tripChange
    };
  }

  // Evento para incidente (pasajero)
  @SubscribeMessage(TRIP_INCIDENT_P_SEND)
  onPassengerIncident(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.logger.log(`⚠️ Incidente del pasajero ${client.id}: ${JSON.stringify(data)}`);
    
    // Crear incidente
    const incident = {
      incident_id: `incident-${Date.now()}-${client.id}`,
      incindent_user: 'passenger' as const,
      incindent_message: data.message || 'Incidente reportado por el pasajero',
      incindent_timestamp: new Date().toISOString()
    };
    
    // Agregar incidente al array global
    this.incidents.push(incident);
    
    // Incrementar contador de incidentes
    this.tripChange.incident_number++;
    
    // Enviar incidente y tripChange a todos los clientes
    this.server.emit('trip-incident-p-on', incident);
    this.server.emit(SEND_CHANGE_TRIP, this.tripChange);
    this.logger.log(`📤 Enviado incidente del pasajero: ${JSON.stringify(incident)}`);
    this.logger.log(`📤 Enviado tripChange con incident_number: ${this.tripChange.incident_number}`);
    
    return { 
      success: true, 
      message: 'Incidente reportado',
      incident: incident,
      tripChange: this.tripChange
    };
  }

  // Evento para incidente (conductor)
  @SubscribeMessage(TRIP_INCIDENT_D_SEND)
  onDriverIncident(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.logger.log(`⚠️ Incidente del conductor ${client.id}: ${JSON.stringify(data)}`);
    
    // Crear incidente
    const incident = {
      incident_id: `incident-${Date.now()}-${client.id}`,
      incindent_user: 'driver' as const,
      incindent_message: data.message || 'Incidente reportado por el conductor',
      incindent_timestamp: new Date().toISOString()
    };
    
    // Agregar incidente al array global
    this.incidents.push(incident);
    
    // Incrementar contador de incidentes
    this.tripChange.incident_number++;
    
    // Enviar incidente y tripChange a todos los clientes
    this.server.emit('trip-incident-p-on', incident);
    this.server.emit(SEND_CHANGE_TRIP, this.tripChange);
    this.logger.log(`📤 Enviado incidente del conductor: ${JSON.stringify(incident)}`);
    this.logger.log(`📤 Enviado tripChange con incident_number: ${this.tripChange.incident_number}`);
    
    return { 
      success: true, 
      message: 'Incidente reportado',
      incident: incident,
      tripChange: this.tripChange
    };
  }

  // Evento para mensaje (pasajero)
  @SubscribeMessage(TRIP_MESSAGE_P_SEND)
  onPassengerMessage(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.logger.log(`💬 Mensaje del pasajero ${client.id}: ${JSON.stringify(data)}`);
    
    // Crear mensaje
    const message = {
      message_id: `msg-${Date.now()}-${client.id}`,
      message_user: 'passenger' as const,
      message_message: data.message || 'Mensaje del pasajero',
      message_timestamp: new Date().toISOString()
    };
    
    // Agregar mensaje al array global
    this.messages.push(message);
    
    // Incrementar contador de mensajes
    this.tripChange.message_number++;
    
    // Enviar mensaje y tripChange a todos los clientes
    this.server.emit('trip-message-p-on', message);
    this.server.emit(SEND_CHANGE_TRIP, this.tripChange);
    this.logger.log(`📤 Enviado mensaje del pasajero: ${JSON.stringify(message)}`);
    this.logger.log(`📤 Enviado tripChange con message_number: ${this.tripChange.message_number}`);
    
    return { 
      success: true, 
      message: 'Mensaje enviado',
      message_data: message,
      tripChange: this.tripChange
    };
  }

  // Evento para mensaje (conductor)
  @SubscribeMessage(TRIP_MESSAGE_D_SEND)
  onDriverMessage(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.logger.log(`💬 Mensaje del conductor ${client.id}: ${JSON.stringify(data)}`);
    
    // Crear mensaje
    const message = {
      message_id: `msg-${Date.now()}-${client.id}`,
      message_user: 'driver' as const,
      message_message: data.message || 'Mensaje del conductor',
      message_timestamp: new Date().toISOString()
    };
    
    // Agregar mensaje al array global
    this.messages.push(message);
    
    // Incrementar contador de mensajes
    this.tripChange.message_number++;
    
    // Enviar mensaje y tripChange a todos los clientes
    this.server.emit('trip-message-p-on', message);
    this.server.emit(SEND_CHANGE_TRIP, this.tripChange);
    this.logger.log(`📤 Enviado mensaje del conductor: ${JSON.stringify(message)}`);
    this.logger.log(`📤 Enviado tripChange con message_number: ${this.tripChange.message_number}`);
    
    return { 
      success: true, 
      message: 'Mensaje enviado',
      message_data: message,
      tripChange: this.tripChange
    };
  }

  // Evento para aceptar viaje (conductor)
  @SubscribeMessage(TRIP_ACCEPT)
  onTripAccept(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.logger.log(`✅ Conductor ${client.id} acepta viaje: ${JSON.stringify(data)}`);
    
    const tripId = data.trip_id;
    
    // Actualizar estado del viaje a driverAccepted
    this.tripChange = buildTripChange({
      tripStatus: TripStatusV2.driverAccepted,
      passenger_boarded: false,
      payment_confirmed: false
    });
    
    // Broadcast del cambio de estado a todos los clientes
    this.server.emit(SEND_CHANGE_TRIP, this.tripChange);
    this.logger.log(`📤 Viaje ${tripId} aceptado por conductor ${client.id}`);
    
    return {
      success: true,
      message: 'Viaje aceptado correctamente',
      trip_id: tripId,
      tripChange: this.tripChange
    };
  }

  // Evento para rechazar viaje (conductor)
  @SubscribeMessage(TRIP_REJECT)
  onTripReject(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.logger.log(`❌ Conductor ${client.id} rechaza viaje: ${JSON.stringify(data)}`);
    
    const tripId = data.trip_id;
    const reason = data.reason || 'Sin razón especificada';
    
    this.logger.log(`📤 Viaje ${tripId} rechazado por conductor ${client.id}. Razón: ${reason}`);
    
    // Aquí podrías buscar otro conductor disponible
    // O notificar al pasajero que el conductor rechazó
    
    return {
      success: true,
      message: 'Viaje rechazado',
      trip_id: tripId,
      reason: reason
    };
  }

  // Evento para obtener lista de mensajes e incidentes
  @SubscribeMessage(GET_MESSAGES_INCIDENTS)
  onGetMessagesIncidents(@ConnectedSocket() client: Socket) {
    this.logger.log(`📋 Cliente ${client.id} solicita lista de mensajes e incidentes`);
    
    const responseData = {
      success: true,
      message: 'Lista de mensajes obtenida',
      data: {
        messages: this.messages,
        counts: {
          message_number: this.tripChange.message_number
        },
        tripChange: this.tripChange
      }
    };
    
    // Enviar respuesta via evento all-messages (solo mensajes)
    client.emit(ALL_MESSAGES, responseData);
    this.logger.log(`📤 Enviado all-messages con ${this.messages.length} mensajes a ${client.id}`);
    
    return { success: true, message: 'Solicitud procesada' };
  }


 @OnEvent(GLOBAL_EVENT)
  async emitGlobalEvent(data: GlobalEvent) {
    this.logger.debug(`🌐 Emitting global event: ${data.event}`);
    this.logger.debug(`📦 Data: ${JSON.stringify(data.data, null, 4)}`);
    this.server.emit(data.event, data.data);
  }

  // =============== MÉTODOS PRIVADOS ===============

  /**
   * Calcular distancia entre dos puntos usando fórmula de Haversine
   * @param lat1 - Latitud punto 1
   * @param lon1 - Longitud punto 1
   * @param lat2 - Latitud punto 2
   * @param lon2 - Longitud punto 2
   * @returns Distancia en kilómetros
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 10) / 10; // Redondear a 1 decimal
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // =============== MÉTODOS PÚBLICOS ===============

  /**
   * Enviar viaje disponible a un conductor específico
   * @param driverSocketId - ID del socket del conductor
   * @param tripData - Datos del viaje disponible
   */
  sendTripToDriver(driverSocketId: string, tripData: any) {
    const trip = {
      trip_id: tripData.trip_id || `trip-${Date.now()}`,
      passenger_id: tripData.passenger_id,
      passenger_name: tripData.passenger_name,
      passenger_rating: tripData.passenger_rating || 5.0,
      pickup_location: tripData.pickup_location,
      dropoff_location: tripData.dropoff_location,
      estimated_distance: tripData.estimated_distance,
      estimated_duration: tripData.estimated_duration,
      estimated_fare: tripData.estimated_fare,
      request_time: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30000).toISOString(), // Expira en 30 segundos
    };

    // Guardar viaje pendiente
    this.pendingTrips.set(trip.trip_id, {
      ...trip,
      driver_socket_id: driverSocketId,
      status: 'pending'
    });

    // Enviar viaje al conductor específico
    this.server.to(driverSocketId).emit(TRIP_AVAILABLE, trip);
    this.logger.log(`🚕 Viaje ${trip.trip_id} enviado al conductor ${driverSocketId}`);

    // Auto-expirar después de 30 segundos
    setTimeout(() => {
      const pendingTrip = this.pendingTrips.get(trip.trip_id);
      if (pendingTrip && pendingTrip.status === 'pending') {
        this.logger.log(`⏰ Viaje ${trip.trip_id} expiró sin respuesta`);
        this.pendingTrips.delete(trip.trip_id);
        // Aquí podrías buscar otro conductor
      }
    }, 30000);

    return trip;
  }

  /**
   * Enviar viaje disponible a todos los conductores conectados
   * @param tripData - Datos del viaje disponible
   */
  broadcastTripToDrivers(tripData: any) {
    const trip = {
      trip_id: tripData.trip_id || `trip-${Date.now()}`,
      passenger_id: tripData.passenger_id,
      passenger_name: tripData.passenger_name,
      passenger_rating: tripData.passenger_rating || 5.0,
      pickup_location: tripData.pickup_location,
      dropoff_location: tripData.dropoff_location,
      estimated_distance: tripData.estimated_distance,
      estimated_duration: tripData.estimated_duration,
      estimated_fare: tripData.estimated_fare,
      request_time: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30000).toISOString(),
    };

    // Broadcast a todos los conductores
    this.server.emit(TRIP_AVAILABLE, trip);
    this.logger.log(`🚕 Viaje ${trip.trip_id} enviado a todos los conductores`);

    return trip;
  }


 

}