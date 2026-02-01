import { Module } from '@nestjs/common';
import { OpenAiService } from './openai.service';

@Module({
  providers: [OpenAiService],
  exports: [OpenAiService], // ✅ para que otros módulos lo usen
})
export class OpenAiModule {}