import { HttpModule, HttpService } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { LLM_AXIOS_INSTANCE } from './llm.constants';
import { LlmService } from './llm.service';

@Global()
@Module({
  imports: [ConfigModule, HttpModule],
  providers: [
    LlmService,
    {
      provide: LLM_AXIOS_INSTANCE,
      useFactory: (httpService: HttpService) =>
        httpService.axiosRef,
      inject: [HttpService],
    },
  ],
  exports: [LlmService],
})
export class LlmModule {}
