import { openai } from '@ai-sdk/openai';
import { generateText, Output } from 'ai';
import { DIRECTOR_INSTRUCTIONS } from '@/ai/directorInstructions';
import { resolveLocally } from '@/ai/semanticMatcher';
import {
  TerraformDirectiveSchema,
  TerraformRequestSchema,
  sanitizeDirective,
  type TerraformDirective,
  type TerraformResponse,
} from '@/ai/terraformSchema';
import { hashString } from '@/engine/random';

export const runtime = 'nodejs';
export const maxDuration = 30;

const DEFAULT_MODEL = 'gpt-5-mini';
const MODEL_TIMEOUT_MS = 20000;
const SEED_SPACE = 100000;

async function directWithModel(prompt: string): Promise<TerraformDirective> {
  const { output } = await generateText({
    model: openai(process.env.OROGEN_OPENAI_MODEL ?? DEFAULT_MODEL),
    system: DIRECTOR_INSTRUCTIONS,
    prompt,
    output: Output.object({ schema: TerraformDirectiveSchema, name: 'terraform_directive' }),
    abortSignal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
  });
  return sanitizeDirective(output);
}

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);
  const parsed = TerraformRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Provide a prompt between 2 and 240 characters.' },
      { status: 400 },
    );
  }

  const { prompt } = parsed.data;
  if (process.env.OPENAI_API_KEY) {
    try {
      const response: TerraformResponse = {
        directive: await directWithModel(prompt),
        seed: hashString(prompt.toLowerCase()) % SEED_SPACE,
        source: 'model',
      };
      return Response.json(response);
    } catch (error) {
      console.warn('[terraform] Model generation failed, resolving locally instead.', error);
    }
  }

  return Response.json(resolveLocally(prompt));
}
