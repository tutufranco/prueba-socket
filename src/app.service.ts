import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GlobalEvent } from './global-event.dto';
@Injectable()
export class AppService {
  constructor(private readonly eventEmitter: EventEmitter2) {}
 private readonly Logger: Logger = new Logger(AppService.name)
  getHello(): string {
    return 'Hello World!';
  }

  async emitGlobalEvent(data: GlobalEvent) {
    this.Logger.debug(`Emitting global event: ${data.event}`);
    this.eventEmitter.emit('global.event', data);
  }
}