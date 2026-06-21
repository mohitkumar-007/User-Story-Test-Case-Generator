export interface GenerateRequest {
  storyTitle: string
  acceptanceCriteria: string
  description?: string
  additionalInfo?: string
}

export interface JiraFetchRequest {
  jiraBaseUrl: string
  email: string
  apiToken: string
  issueKey: string
}

export interface JiraStory {
  key: string
  summary: string
  description: string
  acceptanceCriteria: string
}

export interface TestCase {
  id: string
  title: string
  steps: string[]
  testData?: string
  expectedResult: string
  category: string
}

export interface CostBreakdown {
  inputCost: number
  outputCost: number
  totalCost: number
  currency: 'USD'
  estimated: boolean
}

export interface GenerateResponse {
  cases: TestCase[]
  model?: string
  promptTokens: number
  completionTokens: number
  cost?: CostBreakdown
}