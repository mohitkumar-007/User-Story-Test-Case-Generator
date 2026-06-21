import { CostBreakdownSchema } from './schemas'
import { z } from 'zod'

type CostBreakdown = z.infer<typeof CostBreakdownSchema>

const DEFAULT_PRICING_PER_MILLION: Record<string, { input: number; output: number }> = {
  'llama3-8b-8192': { input: 0.05, output: 0.08 },
  'llama3-70b-8192': { input: 0.59, output: 0.79 },
  'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'mixtral-8x7b-32768': { input: 0.24, output: 0.24 },
  'gemma2-9b-it': { input: 0.20, output: 0.20 },
  'openai/gpt-oss-120b': { input: 0.59, output: 0.79 }
}

export function calculateCost(model: string | undefined, promptTokens: number, completionTokens: number): CostBreakdown {
  const envInput = process.env.GROQ_INPUT_PRICE_PER_1M
  const envOutput = process.env.GROQ_OUTPUT_PRICE_PER_1M
  let inputRate = envInput ? parseFloat(envInput) : undefined
  let outputRate = envOutput ? parseFloat(envOutput) : undefined

  if (inputRate === undefined || outputRate === undefined) {
    const tablePricing = model ? DEFAULT_PRICING_PER_MILLION[model] : undefined
    if (inputRate === undefined) inputRate = tablePricing?.input
    if (outputRate === undefined) outputRate = tablePricing?.output
  }

  const inputCost = (promptTokens / 1_000_000) * (inputRate ?? 0)
  const outputCost = (completionTokens / 1_000_000) * (outputRate ?? 0)

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    currency: 'USD',
    estimated: true
  }
}
