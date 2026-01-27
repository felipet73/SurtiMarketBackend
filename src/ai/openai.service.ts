import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenAiService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async generateAwarenessMessages(params: {
    systemPrompt: string;
    userPrompt: string;
    jsonSchema: any;
  }) {
    const resp = await this.client.responses.create({
      model: process.env.OPENAI_TEXT_MODEL ?? 'gpt-4.1-mini',
      input: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
      // Structured Outputs (json_schema)
      text: {
        format: {
          type: 'json_schema',
          name: 'dashboard_awareness_messages',
          schema: params.jsonSchema,
          strict: true,
        },
      },
    });

    // El SDK suele exponer salida como texto JSON en resp.output_text
    // Por seguridad: parseamos
    const jsonText = (resp as any).output_text;
    return JSON.parse(jsonText);
  }

  async generateWeeklyImage(params: { prompt: string }) {
    // Images API: devuelve base64 según output_format
    const img = await this.client.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1',
      prompt: params.prompt,
      size: '1024x1024',
      output_format: 'png',
    });

    // data[0].b64_json es común en imágenes
    const b64 = (img as any).data?.[0]?.b64_json;
    if (!b64) throw new Error('No se recibió imagen en base64');

    return { mimeType: 'image/png', base64: b64 };
  }

  async generateJsonStructured(params: {
    systemPrompt: string;
    userPrompt: string;
    jsonSchema: any;
    temperature?: number;
  }) {
    const resp = await this.client.responses.create({
      model: process.env.OPENAI_TEXT_MODEL ?? 'gpt-4.1-mini',
      input: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
      temperature: params.temperature ?? 0.4,
      text: {
        format: {
          type: 'json_schema',
          name: 'challenge_payload',
          schema: params.jsonSchema,
          strict: true,
        },
      },
    });

    const ot = (resp as any).output_text;
    if (typeof ot === 'string' && ot.trim()) return JSON.parse(ot);

    const output = (resp as any).output ?? [];
    for (const item of output) {
      const content = item?.content ?? [];
      for (const c of content) {
        const text = c?.text;
        if (typeof text === 'string' && text.trim().startsWith('{')) return JSON.parse(text);
      }
    }
    throw new Error('No se pudo leer JSON de la respuesta de OpenAI');
  }

  async generateCardImage(params: { prompt: string }) {
    const img = await this.client.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1',
      prompt: params.prompt,
      size: '1024x1024',
      output_format: 'png',
    });

    const b64 = (img as any).data?.[0]?.b64_json;
    if (!b64) throw new Error('No se recibió imagen en base64');

    return { mimeType: 'image/png', base64: b64 };
  }
}