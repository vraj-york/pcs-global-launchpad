import { Module } from '@nestjs/common';
import { ChatbotHttpClient } from './chatbot-http.client';

@Module({
  providers: [ChatbotHttpClient],
  exports: [ChatbotHttpClient],
})
export class ChatbotModule {}
