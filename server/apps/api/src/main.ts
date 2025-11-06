import 'reflect-metadata'

import { bootstrap, envPort } from '@app/common'

import { AppModule } from './app.module'

void bootstrap({
  name: 'api',
  module: AppModule,
  port: envPort('PORT', 3000),
})
