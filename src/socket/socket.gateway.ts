import { Logger} from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { buildSendTripDriver, buildSendTripPassanger, buildTripChange } from './helpers';
import { TripStatusV2 } from './interface';
import { OnEvent } from '@nestjs/event-emitter';
import { GlobalEvent } from 'src/global-event.dto';
import { 
  GET_TRIP_P_ON, 
  SEND_CHANGE_TRIP, 
  DRIVER_LOCATION, 
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
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`❌ Cliente desconectado: ${client.id}`);
  }

  // Evento de conexión para pasajero
  @SubscribeMessage(GET_TRIP_P_ON)
  onGetTripPassenger(@ConnectedSocket() client: Socket) {
    this.logger.log(`👤 Pasajero ${client.id} solicita datos del viaje`);
    
    // Construir datos del viaje para pasajero con estado actual
    const passengerTrip = buildSendTripPassanger({ 
      trip_status: this.tripChange.tripStatus 
    });
    
    // Enviar respuesta al pasajero
    client.emit(GET_TRIP_P_ON, passengerTrip);
    
    return { success: true };
  }

  @SubscribeMessage(SEND_CHANGE_TRIP)
  onSendChangeTrip(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.logger.log(`📨 Cambio manual de ${client.id}: ${JSON.stringify(data)}`);
    
    // Actualizar estado global
    if (data.tripStatus !== undefined) {
      this.tripChange.tripStatus = data.tripStatus;
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

  @SubscribeMessage(DRIVER_LOCATION)
  onDriverLocation(@MessageBody() data: LocationData, @ConnectedSocket() client: Socket) {
    this.logger.log(`📍 Ubicación de ${client.id}: lat=${data.lat}, lon=${data.lon}`);
    
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
      timestamp: data.timestamp || Date.now()
    });
    
    // Si llegamos al final de la secuencia, reiniciar
    if (this.locationUpdateCount >= this.tripStateSequence.length) {
      this.logger.log('🎉 Viaje completado! Reiniciando secuencia...');
      this.locationUpdateCount = 0;
    }
    
    return { 
      success: true, 
      message: 'Ubicación recibida y tripChange enviado',
      tripStatus: this.tripChange.tripStatus,
      updateCount: this.locationUpdateCount,
      progress: `${currentStateIndex + 1}/${this.tripStateSequence.length}`
    };
  }

 @OnEvent(GLOBAL_EVENT)
  async emitGlobalEvent(data: GlobalEvent) {
    this.logger.debug(`🌐 Emitting global event: ${data.event}`);
    this.logger.debug(`📦 Data: ${JSON.stringify(data.data, null, 4)}`);
    this.server.emit(data.event, data.data);
  }


 

}