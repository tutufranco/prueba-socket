import { Logger} from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { buildSendTripPassanger, buildTripChange } from './helpers';
import { TripStatusV2 } from './interface';
import { OnEvent } from '@nestjs/event-emitter';
import { GlobalEvent } from 'src/global-event.dto';


// Interface para datos de ubicación
interface LocationData {
  lat: number;
  lon: number;
  timestamp?: number;
}
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'events', // solo para pruebas
})
export class ChatGateway {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);
  
  private  trip =  buildSendTripPassanger({trip_status: TripStatusV2.idle});
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
    this.logger.log(`Cliente conectado: ${client.id}`);
    this.logger.log(':outbox_tray: Enviando datos del viaje al cliente...');
    
    // Reiniciar contador para nuevo cliente
    this.locationUpdateCount = 0;
    this.tripChange = buildTripChange({tripStatus: TripStatusV2.idle});
    this.logger.log(':outbox_tray: Enviando datos del viaje al cliente...');
    client.emit('get-trip-response', this.trip);
    this.logger.log(':outbox_tray: Enviando datos del viaje al cliente...');
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('send-change-trip')
  onSendChangeTrip(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.logger.log(`Mensaje de ${client.id}: ${JSON.stringify(data)}`);
    // reenviar a todos
    // this.server.emit('send-change-trip', { from: client.id, ...data });
    // opcional: responder solo al que envió
    return true;
  }

  @SubscribeMessage('driver-location')
  onDriverLocation(@MessageBody() data: LocationData, @ConnectedSocket() client: Socket) {
    this.logger.log(`:round_pushpin: Ubicación recibida del cliente ${client.id}: lat=${data.lat}, lon=${data.lon}`);
    
    // Incrementar contador de actualizaciones
    this.locationUpdateCount++;
    
    // Obtener el siguiente estado en la secuencia
    const currentStateIndex = Math.min(this.locationUpdateCount - 1, this.tripStateSequence.length - 1);
    const nextState = this.tripStateSequence[currentStateIndex];
    
    this.logger.log(`:arrows_counterclockwise: Actualización #${this.locationUpdateCount} - Progresando a: ${nextState}`);
    
    // Actualizar el estado del viaje
    this.tripChange = buildTripChange({ 
      tripStatus: nextState,
    
    });
    
    this.logger.log(':outbox_tray: Enviando tripChange actualizado...');
    this.logger.log(`Estado del viaje: ${this.tripChange.tripStatus}`);
  
    
    // Responder con el tripChange actualizado
    client.emit('send-change-trip', this.tripChange);
    
    // Si llegamos al final de la secuencia, reiniciar
    if (this.locationUpdateCount >= this.tripStateSequence.length) {
      this.logger.log(':tada: Viaje completado! Reiniciando secuencia...');
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

 @OnEvent('global.event')
  async emitGlobalEvent(data: GlobalEvent) {
    this.logger.debug(`Emitting global event: ${data.event}`);
    this.logger.debug(`Data: ${JSON.stringify(data.data, null, 4)}`);
    this.server.emit(data.event, data.data);

    // this.server.emit('send-change-trip', this.tripChange);
  }


 

}