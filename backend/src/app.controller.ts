import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly cfg: ConfigService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ai-test')
  async aiTest(): Promise<object> {
    const apiKey = this.cfg.get<string>('GEMINI_API_KEY');
    const model = this.cfg.get<string>('GEMINI_MODEL', 'gemini-flash-latest');
    if (!apiKey) return { ok: false, error: 'GEMINI_API_KEY not set', model };
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const result = await genAI
        .getGenerativeModel({ model })
        .generateContent('Responde solo: ok');
      return {
        ok: true,
        model,
        keyPrefix: apiKey.slice(0, 6),
        response: result.response.text().slice(0, 50),
      };
    } catch (err: any) {
      return {
        ok: false,
        model,
        keyPrefix: apiKey.slice(0, 6),
        error: err.message?.slice(0, 200),
      };
    }
  }
}
