# LLM TestRunner Web Components

A Stencil web component library that provides a comprehensive LLM testing solution with automated evaluation capabilities.

## Overview

The LLM TestRunner is a tool for testing Large Language Model (LLM) responses against expected criteria. It provides a complete interface for:

- **Question Management**: Add, edit, and organize test questions
- **AI Integration**: Can be integrated with any LLM provider
- **Automated Evaluation**: Built-in evaluation engine that checks responses against expected keywords and source links
- **Batch Testing**: Run multiple tests sequentially
- **Real-time Results**: Live evaluation results with pass/fail indicators, including details such as:
  - Number of keywords matched.
  - Presence of source links in the response.

> **Note:** Source-link checking uses _overlap/partial match_.  
> A full URL match is **not required** — any overlapping portion of the expected link (for example, matching the domain or path segment) in the response counts as present.

## Components

### `<llm-test-runner>`

The main component that provides a complete LLM testing interface.

**Features:**

- Question input with expected keywords and source links
- Real-time AI response generation any LLM provider
- Test case management (add, delete, run individual or all tests)
- Built-in evaluation engine with keyword and source link matching
- Error handling and loading states
- Rate limiting for batch operations

**Usage:**

```html
<llm-test-runner delay-ms="1000"></llm-test-runner>
```

## 🎯 Usage Modes

### 1. Direct HTML Usage

Simply include the component in your HTML:

```html
<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="/build/llm-testrunner.esm.js"></script>
    <script nomodule src="/build/llm-testrunner.js"></script>
  </head>
  <body>
    <llm-test-runner id="llm-test-runner" delay-ms="1000"></llm-test-runner>
  </body>
  <script>
    const llmTestRunner = document.getElementById('llm-test-runner');
    // Gemini API
    async function handlellmRequest(event) {
      try {
        const requestBody = {
          contents: [
            {
              parts: [
                {
                  text: event.detail.prompt,
                },
              ],
            },
          ],
        };

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=your-gemini-api-key-here`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error?.message ||
              `HTTP error! status: ${response.status}`,
          );
        }

        const data = await response.json();

        if (
          data.candidates &&
          data.candidates[0] &&
          data.candidates[0].content
        ) {
          event.detail.resolve(data.candidates[0].content.parts[0].text);
        } else {
          throw new Error('Unexpected response format from Gemini API');
        }
      } catch (err) {
        event.detail.reject(
          err instanceof Error ? err : new Error(String(err)),
        );
      }
    }
    llmTestRunner.addEventListener('llmRequest', handlellmRequest);
  </script>
</html>
```

### 2. Library Integration

Import as a module in your application:

```javascript
import { LLMTestRunner } from 'llm-testrunner-components';

// The component is automatically registered and ready to use
```

## Configuration

### 🧠 delayMs Prop — Controlling API Rate Limiting

The `delayMs` prop allows you to control **how frequently API calls are made** when triggering multiple requests.  
This helps prevent exceeding **API rate limits** by spacing out requests automatically.

### ⚙️ Description

| Prop Name | Type     | Default     | Description                                                                                                          |
| --------- | -------- | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| `delayMs` | `number` | `undefined` | Optional delay (in milliseconds) between consecutive API calls. If not provided, all API calls are made in parallel. |

```html
<llm-test-runner delay-ms="2000"></llm-test-runner>
```

### React/JSX Usage

```jsx
function App() {
  return (
    <div>
      <llm-test-runner delayMs="1000" />
    </div>
  );
}
```

## Evaluation Engine

The built-in evaluation engine provides:

- **Keyword Matching**: Case-insensitive matching of expected keywords in AI responses
- **Source Link Validation**: Checks for presence of expected URLs in responses
- **Pass/Fail Logic**: Tests pass only when ALL expected items are found
- **Detailed Results**: Shows which keywords and links were found/missing

### Evaluation Criteria

- **Keywords**: Must be present in the AI response (case-insensitive)
- **Source Links**: Must be present as exact URL matches
- **Pass Condition**: ALL expected keywords AND source links must be found

## Using in React Applications

### Installation

```bash
npm install llm-testrunner-components
```

### Integration

```tsx
import React, { useEffect } from 'react';
import { defineCustomElements } from 'llm-testrunner-components/loader';

function App() {
  useEffect(() => {
    defineCustomElements();
  }, []);

  const handlellmRequest = (event: CustomEvent<LLMRequestPayload>) => {
    try {
      console.log('🚀 callGeminiAPI called with prompt:', event.detail.prompt);
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: event.detail.prompt,
              },
            ],
          },
        ],
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=your-gemini-api-key-here`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `HTTP error! status: ${response.status}`,
        );
      }

      const data = await response.json();

      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        event.detail.resolve(data.candidates[0].content.parts[0].text);
      } else {
        throw new Error('Unexpected response format from Gemini API');
      }
    } catch (err) {
      event.detail.reject(err instanceof Error ? err : new Error(String(err)));
    }
  };

  return (
    <div>
      <h1>LLM Test Runner</h1>
      <llm-test-runner llmRequest={handlellmRequest}></llm-test-runner>
    </div>
  );
}
```

### TypeScript Support

```tsx
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'llm-test-runner': any;
    }
  }
}
```

## API Reference

### Component Props

```typescript
interface LLMTestRunnerProps {
  apiKey: string; // Required: Your Gemini API key
}
```

### TestCase Interface

```typescript
interface TestCase {
  id: string;
  question: string;
  expectedOutcome: string;
  output?: string;
  isRunning?: boolean;
  error?: string;
  evaluationResult?: EvaluationResult;
}
```

### EvaluationResult Interface

```typescript
interface EvaluationResult {
  testCaseId: string;
  passed: boolean;
  keywordMatches: KeywordMatch[];
  sourceLinkMatches: SourceLinkMatch[];
  timestamp?: string;
}
```

### LLMRequestPayload Interface

```typescript
interface LLMRequestPayload {
  prompt: string;
  resolve: (result: string) => void;
  reject: (err: Error | unknown) => void;
}
```
