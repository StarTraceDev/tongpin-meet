import 'reflect-metadata'

import { bootstrap, envPort } from '@app/common'

import { AppModule } from './app.module'

void bootstrap({
  name: 'ai',
  module: AppModule,
  port: envPort('AI_PORT', 3002),
})
