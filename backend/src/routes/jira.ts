import express from 'express'
import { z } from 'zod'
import { JiraClient } from '../jira/jiraClient'

export const jiraRouter = express.Router()

const FetchJiraIssueSchema = z.object({
  jiraBaseUrl: z.string().url('Invalid Jira URL'),
  email: z.string().email('Invalid email address'),
  apiToken: z.string().min(1, 'API token is required'),
  issueKey: z.string().min(1, 'Issue key is required').regex(/^[A-Z][A-Z0-9_]+-\d+$/, 'Invalid Jira issue key format (e.g., PROJ-123)'),
})

jiraRouter.post('/fetch-issue', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const validationResult = FetchJiraIssueSchema.safeParse(req.body)

    if (!validationResult.success) {
      res.status(400).json({
        error: `Validation error: ${validationResult.error.errors.map(e => e.message).join(', ')}`
      })
      return
    }

    const { jiraBaseUrl, email, apiToken, issueKey } = validationResult.data

    const jiraClient = new JiraClient(jiraBaseUrl, email, apiToken)
    const story = await jiraClient.fetchIssue(issueKey)

    res.json(story)
  } catch (error) {
    console.error('Jira fetch error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch Jira issue'
    res.status(502).json({ error: message })
  }
})
