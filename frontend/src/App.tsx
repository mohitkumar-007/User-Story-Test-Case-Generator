import { useState } from 'react'
import * as XLSX from 'xlsx'
import { generateTests, fetchJiraIssue } from './api'
import { GenerateRequest, GenerateResponse, TestCase, JiraFetchRequest } from './types'

function App() {
  const [formData, setFormData] = useState<GenerateRequest>({
    storyTitle: '',
    acceptanceCriteria: '',
    description: '',
    additionalInfo: ''
  })
  const [results, setResults] = useState<GenerateResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedTestCases, setExpandedTestCases] = useState<Set<string>>(new Set())

  // Jira integration state
  const [inputMode, setInputMode] = useState<'manual' | 'jira'>('manual')
  const [jiraConfig, setJiraConfig] = useState<JiraFetchRequest>({
    jiraBaseUrl: 'https://mohitsinghcse10.atlassian.net/',
    email: 'mohitsinghcse10@gmail.com',
    apiToken: '',
    issueKey: ''
  })
  const [isFetchingJira, setIsFetchingJira] = useState<boolean>(false)
  const [jiraFetched, setJiraFetched] = useState<boolean>(false)

  const toggleTestCaseExpansion = (testCaseId: string) => {
    const newExpanded = new Set(expandedTestCases)
    if (newExpanded.has(testCaseId)) {
      newExpanded.delete(testCaseId)
    } else {
      newExpanded.add(testCaseId)
    }
    setExpandedTestCases(newExpanded)
  }

  const handleInputChange = (field: keyof GenerateRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleJiraConfigChange = (field: keyof JiraFetchRequest, value: string) => {
    setJiraConfig(prev => ({ ...prev, [field]: value }))
  }

  const handleFetchJira = async () => {
    if (!jiraConfig.jiraBaseUrl || !jiraConfig.email || !jiraConfig.apiToken || !jiraConfig.issueKey) {
      setError('All Jira fields are required')
      return
    }

    setIsFetchingJira(true)
    setError(null)

    try {
      const story = await fetchJiraIssue(jiraConfig)
      setFormData({
        storyTitle: story.summary,
        description: story.description,
        acceptanceCriteria: story.acceptanceCriteria,
        additionalInfo: `Jira Issue: ${story.key}`
      })
      setJiraFetched(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Jira issue')
    } finally {
      setIsFetchingJira(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.storyTitle.trim() || !formData.acceptanceCriteria.trim()) {
      setError('Story Title and Acceptance Criteria are required')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const response = await generateTests(formData)
      setResults(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tests')
    } finally {
      setIsLoading(false)
    }
  }

  const exportToExcel = () => {
    if (!results) return

    const rows = results.cases.map((tc) => ({
      'Test Case ID': tc.id,
      'Title': tc.title,
      'Category': tc.category,
      'Steps': tc.steps.join('\n'),
      'Test Data': tc.testData || '',
      'Expected Result': tc.expectedResult,
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Test Cases')
    XLSX.writeFile(wb, `test-cases-${Date.now()}.xlsx`)
  }

  return (
    <div>
      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          background-color: #f5f5f5;
          color: #333;
          line-height: 1.6;
        }
        
        .container {
          max-width: 95%;
          width: 100%;
          margin: 0 auto;
          padding: 20px;
          min-height: 100vh;
        }
        
        @media (min-width: 768px) {
          .container {
            max-width: 90%;
            padding: 30px;
          }
        }
        
        @media (min-width: 1024px) {
          .container {
            max-width: 85%;
            padding: 40px;
          }
        }
        
        @media (min-width: 1440px) {
          .container {
            max-width: 1800px;
            padding: 50px;
          }
        }
        
        .header {
          text-align: center;
          margin-bottom: 40px;
        }
        
        .title {
          font-size: 2.5rem;
          color: #2c3e50;
          margin-bottom: 10px;
        }
        
        .subtitle {
          color: #666;
          font-size: 1.1rem;
        }
        
        .form-container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        }

        .tab-switcher {
          display: flex;
          gap: 0;
          margin-bottom: 25px;
          border-bottom: 2px solid #e1e8ed;
        }

        .tab-btn {
          padding: 12px 24px;
          border: none;
          background: none;
          font-size: 15px;
          font-weight: 600;
          color: #666;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          margin-bottom: -2px;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          color: #3498db;
        }

        .tab-btn.active {
          color: #3498db;
          border-bottom-color: #3498db;
        }

        .jira-section {
          background: #f8fafc;
          border: 2px solid #e1e8ed;
          border-radius: 8px;
          padding: 24px;
          margin-bottom: 20px;
        }

        .jira-section-title {
          font-size: 16px;
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .jira-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 768px) {
          .jira-grid {
            grid-template-columns: 1fr;
          }
        }

        .jira-grid .form-group {
          margin-bottom: 0;
        }

        .fetch-btn {
          background: #0052cc;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-top: 16px;
        }

        .fetch-btn:hover:not(:disabled) {
          background: #0747a6;
        }

        .fetch-btn:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
        }

        .jira-success {
          background: #d4edda;
          color: #155724;
          padding: 12px 16px;
          border-radius: 6px;
          margin-top: 16px;
          font-weight: 500;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: #2c3e50;
        }
        
        .form-input, .form-textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e1e8ed;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        
        .form-input:focus, .form-textarea:focus {
          outline: none;
          border-color: #3498db;
        }
        
        .form-textarea {
          resize: vertical;
          min-height: 100px;
        }
        
        .submit-btn {
          background: #3498db;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .submit-btn:hover:not(:disabled) {
          background: #2980b9;
        }
        
        .submit-btn:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
        }

        .export-btn {
          background: #27ae60;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-top: 12px;
        }

        .export-btn:hover {
          background: #219a52;
        }
        
        .error-banner {
          background: #e74c3c;
          color: white;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
        }
        
        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
          font-size: 18px;
        }
        
        .results-container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .results-header {
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #e1e8ed;
        }
        
        .results-title {
          font-size: 1.8rem;
          color: #2c3e50;
          margin-bottom: 10px;
        }
        
        .results-meta {
          color: #666;
          font-size: 14px;
        }
        
        .table-container {
          overflow-x: auto;
        }
        
        .results-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        
        .results-table th,
        .results-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e1e8ed;
        }
        
        .results-table th {
          background: #f8f9fa;
          font-weight: 600;
          color: #2c3e50;
        }
        
        .results-table tr:hover {
          background: #f8f9fa;
        }
        
        .category-positive { color: #27ae60; font-weight: 600; }
        .category-negative { color: #e74c3c; font-weight: 600; }
        .category-edge { color: #f39c12; font-weight: 600; }
        .category-authorization { color: #9b59b6; font-weight: 600; }
        .category-non-functional { color: #34495e; font-weight: 600; }
        
        .test-case-id {
          cursor: pointer;
          color: #3498db;
          font-weight: 600;
          padding: 8px 12px;
          border-radius: 4px;
          transition: background-color 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        
        .test-case-id:hover {
          background: #f8f9fa;
        }
        
        .test-case-id.expanded {
          background: #e3f2fd;
          color: #1976d2;
        }
        
        .expand-icon {
          font-size: 10px;
          transition: transform 0.2s;
        }
        
        .expand-icon.expanded {
          transform: rotate(90deg);
        }
        
        .expanded-details {
          margin-top: 15px;
          background: #fafbfc;
          border: 1px solid #e1e8ed;
          border-radius: 8px;
          padding: 20px;
        }
        
        .step-item {
          background: white;
          border: 1px solid #e1e8ed;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .step-header {
          display: grid;
          grid-template-columns: 80px 1fr 1fr 1fr;
          gap: 15px;
          align-items: start;
        }
        
        .step-id {
          font-weight: 600;
          color: #2c3e50;
          background: #f8f9fa;
          padding: 4px 8px;
          border-radius: 4px;
          text-align: center;
          font-size: 12px;
        }
        
        .step-description {
          color: #2c3e50;
          line-height: 1.5;
        }
        
        .step-test-data {
          color: #666;
          font-style: italic;
          font-size: 14px;
        }
        
        .step-expected {
          color: #27ae60;
          font-weight: 500;
          font-size: 14px;
        }
        
        .step-labels {
          display: grid;
          grid-template-columns: 80px 1fr 1fr 1fr;
          gap: 15px;
          margin-bottom: 10px;
          font-weight: 600;
          color: #666;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      `}</style>
      
      <div className="container">
        <div className="header">
          <h1 className="title">User Story to Tests</h1>
          <p className="subtitle">Generate comprehensive test cases from your user stories</p>
        </div>
        
        <form onSubmit={handleSubmit} className="form-container">
          <div className="tab-switcher">
            <button
              type="button"
              className={`tab-btn ${inputMode === 'manual' ? 'active' : ''}`}
              onClick={() => setInputMode('manual')}
            >
              Manual Input
            </button>
            <button
              type="button"
              className={`tab-btn ${inputMode === 'jira' ? 'active' : ''}`}
              onClick={() => setInputMode('jira')}
            >
              Import from Jira
            </button>
          </div>

          {inputMode === 'jira' && (
            <div className="jira-section">
              <div className="jira-section-title">
                🔗 Jira Connection
              </div>
              <div className="jira-grid">
                <div className="form-group">
                  <label htmlFor="jiraBaseUrl" className="form-label">
                    Jira Base URL *
                  </label>
                  <input
                    type="url"
                    id="jiraBaseUrl"
                    className="form-input"
                    value={jiraConfig.jiraBaseUrl}
                    onChange={(e) => handleJiraConfigChange('jiraBaseUrl', e.target.value)}
                    placeholder="https://your-domain.atlassian.net"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="jiraIssueKey" className="form-label">
                    Issue Key *
                  </label>
                  <input
                    type="text"
                    id="jiraIssueKey"
                    className="form-input"
                    value={jiraConfig.issueKey}
                    onChange={(e) => handleJiraConfigChange('issueKey', e.target.value)}
                    placeholder="PROJ-123"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="jiraEmail" className="form-label">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="jiraEmail"
                    className="form-input"
                    value={jiraConfig.email}
                    onChange={(e) => handleJiraConfigChange('email', e.target.value)}
                    placeholder="your-email@company.com"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="jiraApiToken" className="form-label">
                    API Token *
                  </label>
                  <input
                    type="password"
                    id="jiraApiToken"
                    className="form-input"
                    value={jiraConfig.apiToken}
                    onChange={(e) => handleJiraConfigChange('apiToken', e.target.value)}
                    placeholder="Your Jira API token"
                  />
                </div>
              </div>
              <button
                type="button"
                className="fetch-btn"
                onClick={handleFetchJira}
                disabled={isFetchingJira}
              >
                {isFetchingJira ? 'Fetching...' : 'Fetch Story from Jira'}
              </button>
              {jiraFetched && (
                <div className="jira-success">
                  ✓ Story fetched successfully from Jira. Fields populated below.
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="storyTitle" className="form-label">
              Story Title *
            </label>
            <input
              type="text"
              id="storyTitle"
              className="form-input"
              value={formData.storyTitle}
              onChange={(e) => handleInputChange('storyTitle', e.target.value)}
              placeholder="Enter the user story title..."
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              className="form-textarea"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Additional description (optional)..."
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="acceptanceCriteria" className="form-label">
              Acceptance Criteria *
            </label>
            <textarea
              id="acceptanceCriteria"
              className="form-textarea"
              value={formData.acceptanceCriteria}
              onChange={(e) => handleInputChange('acceptanceCriteria', e.target.value)}
              placeholder="Enter the acceptance criteria..."
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="additionalInfo" className="form-label">
              Additional Info
            </label>
            <textarea
              id="additionalInfo"
              className="form-textarea"
              value={formData.additionalInfo}
              onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
              placeholder="Any additional information (optional)..."
            />
          </div>
          
          <button
            type="submit"
            className="submit-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : 'Generate'}
          </button>
        </form>

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="loading">
            Generating test cases...
          </div>
        )}

        {results && (
          <div className="results-container">
            <div className="results-header">
              <h2 className="results-title">Generated Test Cases</h2>
              <div className="results-meta">
                {results.cases.length} test case(s) generated
                {results.model && ` • Model: ${results.model}`}
                {results.promptTokens > 0 && ` • Input tokens: ${results.promptTokens}`}
                {results.completionTokens > 0 && ` • Output tokens: ${results.completionTokens}`}
                {results.cost && ` • Cost: $${results.cost.totalCost.toFixed(6)}${results.cost.estimated ? ' (est.)' : ''}`}
              </div>
              <button
                type="button"
                className="export-btn"
                onClick={exportToExcel}
              >
                📥 Export to Excel
              </button>
            </div>
            
            <div className="table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Test Case ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Expected Result</th>
                  </tr>
                </thead>
                <tbody>
                  {results.cases.map((testCase: TestCase) => (
                    <>
                      <tr key={testCase.id}>
                        <td>
                          <div 
                            className={`test-case-id ${expandedTestCases.has(testCase.id) ? 'expanded' : ''}`}
                            onClick={() => toggleTestCaseExpansion(testCase.id)}
                          >
                            <span className={`expand-icon ${expandedTestCases.has(testCase.id) ? 'expanded' : ''}`}>
                              ▶
                            </span>
                            {testCase.id}
                          </div>
                        </td>
                        <td>{testCase.title}</td>
                        <td>
                          <span className={`category-${testCase.category.toLowerCase()}`}>
                            {testCase.category}
                          </span>
                        </td>
                        <td>{testCase.expectedResult}</td>
                      </tr>
                      {expandedTestCases.has(testCase.id) && (
                        <tr key={`${testCase.id}-details`}>
                          <td colSpan={4}>
                            <div className="expanded-details">
                              <h4 style={{marginBottom: '15px', color: '#2c3e50'}}>Test Steps for {testCase.id}</h4>
                              <div className="step-labels">
                                <div>Step ID</div>
                                <div>Step Description</div>
                                <div>Test Data</div>
                                <div>Expected Result</div>
                              </div>
                              {testCase.steps.map((step, index) => (
                                <div key={index} className="step-item">
                                  <div className="step-header">
                                    <div className="step-id">S{String(index + 1).padStart(2, '0')}</div>
                                    <div className="step-description">{step}</div>
                                    <div className="step-test-data">{testCase.testData || 'N/A'}</div>
                                    <div className="step-expected">
                                      {index === testCase.steps.length - 1 ? testCase.expectedResult : 'Step completed successfully'}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App