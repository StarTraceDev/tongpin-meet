import 'reflect-metadata'

import { WsAdapter } from '@nestjs/platform-ws'

import { bootstrap, envPort } from '@app/common'

import { AppModule } from './app.module'

void bootstrap({
  name: 'gateway',
  module: AppModule,
  port: envPort('GATEWAY_PORT', 3001),
  configure: (app) => {
    app.useWebSocketAdapter(new WsAdapter(app))
  },
})
