interface JiraIssue {
  key: string
  fields: {
    summary: string
    description: string | null
    acceptanceCriteria?: string
    acceptance_criteria?: string
    customfield_10016?: string // common acceptance criteria field
    customfield_10035?: string
    customfield_10036?: string
    [key: string]: unknown
  }
}

export interface JiraStory {
  key: string
  summary: string
  description: string
  acceptanceCriteria: string
}

export class JiraClient {
  private baseUrl: string
  private email: string
  private apiToken: string

  constructor(baseUrl: string, email: string, apiToken: string) {
    // Normalize base URL - remove trailing slash
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.email = email
    this.apiToken = apiToken
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64')
    return `Basic ${credentials}`
  }

  async fetchIssue(issueKey: string): Promise<JiraStory> {
    const url = `${this.baseUrl}/rest/api/3/issue/${encodeURIComponent(issueKey)}?expand=names`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      if (response.status === 401) {
        throw new Error('Jira authentication failed. Check your email and API token.')
      }
      if (response.status === 404) {
        throw new Error(`Jira issue "${issueKey}" not found.`)
      }
      throw new Error(`Jira API error (${response.status}): ${errorBody || response.statusText}`)
    }

    const issue = await response.json() as { key: string; fields: Record<string, unknown>; names?: Record<string, string> }
    return this.mapToStory(issue)
  }

  private mapToStory(issue: { key: string; fields: Record<string, unknown>; names?: Record<string, string> }): JiraStory {
    const description = this.extractTextFromADF(issue.fields.description)
    
    let acceptanceCriteria = ''

    // Use the 'names' map to find the field whose display name contains "acceptance criteria"
    if (issue.names) {
      for (const [fieldId, displayName] of Object.entries(issue.names)) {
        if (displayName.toLowerCase().replace(/[\s_-]/g, '').includes('acceptancecriteria')) {
          const value = issue.fields[fieldId]
          if (value) {
            acceptanceCriteria = typeof value === 'string'
              ? value
              : this.extractTextFromADF(value)
            if (acceptanceCriteria) break
          }
        }
      }
    }

    // Fallback: check common known field names/IDs
    if (!acceptanceCriteria) {
      const acFieldCandidates = [
        issue.fields.acceptanceCriteria,
        issue.fields.acceptance_criteria,
        issue.fields.customfield_10016,
        issue.fields.customfield_10035,
        issue.fields.customfield_10036,
      ]
      for (const candidate of acFieldCandidates) {
        if (candidate) {
          acceptanceCriteria = typeof candidate === 'string'
            ? candidate
            : this.extractTextFromADF(candidate)
          if (acceptanceCriteria) break
        }
      }
    }

    // Last resort: try to extract from description text
    if (!acceptanceCriteria) {
      acceptanceCriteria = this.extractAcceptanceCriteria(description)
    }

    return {
      key: issue.key,
      summary: issue.fields.summary as string,
      description,
      acceptanceCriteria,
    }
  }

  private extractTextFromADF(content: unknown): string {
    if (!content) return ''
    if (typeof content === 'string') return content

    // Atlassian Document Format (ADF) parsing
    if (typeof content === 'object' && content !== null && 'content' in content) {
      return this.parseADFNode(content as ADFNode)
    }

    return String(content)
  }

  private parseADFNode(node: ADFNode): string {
    if (!node) return ''

    if (node.type === 'text') {
      return node.text || ''
    }

    if (node.content && Array.isArray(node.content)) {
      const parts = node.content.map((child: ADFNode) => this.parseADFNode(child))
      
      // Add newlines for block-level elements
      if (['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem'].includes(node.type)) {
        return parts.join('') + '\n'
      }
      return parts.join('')
    }

    return ''
  }

  private extractAcceptanceCriteria(description: string): string {
    // Try to find acceptance criteria section in the description
    const patterns = [
      /acceptance\s*criteria[:\s]*\n([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i,
      /AC[:\s]*\n([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i,
      /given[\s\S]*?when[\s\S]*?then[\s\S]*/i,
    ]

    for (const pattern of patterns) {
      const match = description.match(pattern)
      if (match) {
        return match[0].trim()
      }
    }

    return ''
  }
}

interface ADFNode {
  type: string
  text?: string
  content?: ADFNode[]
}
