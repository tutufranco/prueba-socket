import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { GlobalEvent } from './global-event.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('global-emit')
  test(@Body() data: GlobalEvent) {
    return this.appService.emitGlobalEvent(data);
  }
}