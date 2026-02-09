import OpenAI from 'openai';
import { Dimension } from '../dto/ecoimpact.dto';

type Radar5 = {
  waste: number;
  transport: number;
  energy: number;
  water: number;
  consumption: number;
};

type AiMessage = {
  title: string;
  text: string;
  cta: string;
  dimension: Dimension;
};

type AiResult = {
  targetRadar: Radar5;
  messages: AiMessage[];
  summary: string;
};

const DIMENSIONS: Dimension[] = [
  Dimension.WASTE,
  Dimension.TRANSPORT,
  Dimension.ENERGY,
  Dimension.WATER,
  Dimension.CONSUMPTION,
];

function isRadar5(value: unknown): value is Radar5 {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return DIMENSIONS.every(
    (d) => typeof v[d] === 'number' && Number.isFinite(v[d] as number),
  );
}

function isAiMessage(value: unknown): value is AiMessage {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.title === 'string' &&
    typeof v.text === 'string' &&
    typeof v.cta === 'string' &&
    DIMENSIONS.includes(v.dimension as Dimension)
  );
}

function clamp(n: number, min = 0, max = 10) {
  return Math.max(min, Math.min(max, n));
}

function clampTarget(baseline: Radar5, target: Radar5): Radar5 {
  return {
    waste: clamp(target.waste, 0, Math.min(10, baseline.waste + 3)),
    transport: clamp(target.transport, 0, Math.min(10, baseline.transport + 3)),
    energy: clamp(target.energy, 0, Math.min(10, baseline.energy + 3)),
    water: clamp(target.water, 0, Math.min(10, baseline.water + 3)),
    consumption: clamp(target.consumption, 0, Math.min(10, baseline.consumption + 3)),
  };
}

function fallbackResult(baseline: Radar5, focus: Dimension): AiResult {
  const entries = DIMENSIONS.map((d) => ({ d, v: baseline[d] }));
  entries.sort((a, b) => a.v - b.v);
  const target: Radar5 = { ...baseline };
  for (let i = 0; i < 2; i++) {
    const dim = entries[i]?.d;
    if (dim) target[dim] = clamp(target[dim] + 1);
  }

  const messages: AiMessage[] = [
    {
      title: 'Pequeños cambios',
      text: 'Haz un ajuste simple hoy y repítelo toda la semana.',
      cta: 'Elige una acción eco',
      dimension: focus,
    },
    {
      title: 'Suma puntos verdes',
      text: 'Cada decisión cuenta. Prioriza la opción más sostenible.',
      cta: 'Busca una mejora',
      dimension: entries[0]?.d ?? focus,
    },
    {
      title: 'Reto rápido',
      text: 'Completa un mini reto y mejora tu radar.',
      cta: 'Inicia el reto',
      dimension: entries[1]?.d ?? focus,
    },
    {
      title: 'Impacto visible',
      text: 'Comparte tu progreso y motiva al grupo.',
      cta: 'Comparte avance',
      dimension: focus,
    },
  ];

  return {
    targetRadar: clampTarget(baseline, target),
    messages,
    summary: 'Semana lista: enfócate en mejoras pequeñas pero constantes.',
  };
}

export class OpenAiEcoImpactService {
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY no está configurada.');
    this.client = new OpenAI({ apiKey });
    this.model = process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini';
  }

  async generateTargetAndMessages(params: {
    weekKey: string;
    baselineRadar: Radar5;
    focusDimension: Dimension;
    locale: string;
  }): Promise<AiResult> {
    const system = 'Eres un generador de gamificación sostenible. Responde SOLO con JSON válido. No uses markdown.';
    const user = `Semana: ${params.weekKey}
Locale: ${params.locale}
Dimensiones: waste, transport, energy, water, consumption
baselineRadar (0..10): ${JSON.stringify(params.baselineRadar)}
focusDimension: ${params.focusDimension}

Tarea:
1) Genera targetRadar (0..10) alcanzable en 7 días.
   - No aumentes más de +3 por dimensión respecto a baseline.
   - Mantén coherencia: targetRadar debe tener al menos 1 dimensión con mejora notable (+2 o +3) y el resto mejoras pequeñas (0..+2).
2) Genera 4 mensajes cortos, accionables y no aburridos.
   - Estructura: [{title,text,cta,dimension}]
   - text <= 140 caracteres
   - cta <= 60 caracteres
   - dimension debe ser uno de los 5.
3) Genera summary (1-2 líneas, <= 160 caracteres) motivacional.

Devuelve SOLO JSON con claves exactas:
{
  "targetRadar": { "waste":n, "transport":n, "energy":n, "water":n, "consumption":n },
  "messages": [{ "title":"", "text":"", "cta":"", "dimension":"" }, ... 4],
  "summary": ""
}
`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) return fallbackResult(params.baselineRadar, params.focusDimension);

      const parsed: unknown = JSON.parse(content);
      if (!parsed || typeof parsed !== 'object') return fallbackResult(params.baselineRadar, params.focusDimension);

      const obj = parsed as Record<string, unknown>;
      if (!isRadar5(obj.targetRadar)) return fallbackResult(params.baselineRadar, params.focusDimension);
      if (!Array.isArray(obj.messages) || obj.messages.length !== 4) {
        return fallbackResult(params.baselineRadar, params.focusDimension);
      }
      const messages = obj.messages.filter(isAiMessage);
      if (messages.length !== 4) return fallbackResult(params.baselineRadar, params.focusDimension);
      if (typeof obj.summary !== 'string') return fallbackResult(params.baselineRadar, params.focusDimension);

      const clamped: Radar5 = clampTarget(params.baselineRadar, {
        waste: clamp(obj.targetRadar.waste),
        transport: clamp(obj.targetRadar.transport),
        energy: clamp(obj.targetRadar.energy),
        water: clamp(obj.targetRadar.water),
        consumption: clamp(obj.targetRadar.consumption),
      });

      return {
        targetRadar: clamped,
        messages,
        summary: obj.summary,
      };
    } catch {
      return fallbackResult(params.baselineRadar, params.focusDimension);
    }
  }
}
