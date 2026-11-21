import { resolveLocally } from './semanticMatcher';
import { TerraformResponseSchema, type TerraformResponse } from './terraformSchema';

const REQUEST_TIMEOUT_MS = 25000;

export async function requestTerraform(prompt: string): Promise<TerraformResponse> {
  try {
    const response = await fetch('/api/terraform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Terraform request failed with status ${response.status}`);
    return TerraformResponseSchema.parse(await response.json());
  } catch {
    return resolveLocally(prompt);
  }
}
