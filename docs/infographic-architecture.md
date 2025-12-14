# AI VC Associate: Technical Architecture

## System Overview

```
User Input (Text/Files)
        |
        v
+------------------+
|   Next.js App    |  <-- React 19, TypeScript, Tailwind CSS
|   (Frontend)     |
+------------------+
        |
        v
+------------------+
|   API Routes     |  <-- Server-side processing
|   (Backend)      |
+------------------+
        |
        v
+------------------+
|  AI Pipeline     |  <-- Gemini 3 Models
+------------------+
        |
        v
+------------------+
|  Attio CRM       |  <-- Data persistence
+------------------+
```

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI**: React 19 + Tailwind CSS 4
- **Theming**: next-themes (dark/light mode)
- **Type Safety**: TypeScript 5.9
- **Validation**: Zod schemas

### Backend
- **Runtime**: Node.js (Vercel Edge)
- **AI SDK**: Vercel AI SDK 5.0
- **Streaming**: Server-Sent Events (SSE)
- **File Processing**: Multi-modal analysis

### AI Models (Google Gemini)
- **gemini-2.5-flash**: Fast parallel research (8 agents)
- **gemini-3-pro-preview**: Deep synthesis & memo generation
- **gemini-3-pro-image-preview**: Infographic generation
- **Google Search Tool**: Real-time web research

### Integrations
- **Attio CRM**: Company & opportunity records
- **PWA**: Offline support, home screen install

## Pipeline Architecture

### Stage 1: Input Processing
```
Files/Text --> Triage --> Extract --> Identify Company
                |           |
                v           v
          Classification  Structured Data
          (pitch deck,    (company name,
           financials,     founders,
           irrelevant)     metrics)
```

### Stage 2: Parallel Research (8 Agents)
```
                    +---> Basics
                    +---> Founders
                    +---> Funding
Company Name -------+---> Product      ---> All run in parallel
                    +---> Traction          with Google Search
                    +---> Market
                    +---> Competitive
                    +---> News
```

Each agent:
- Uses gemini-2.5-flash for speed
- Has access to Google Search tool
- Limited to 3 search steps
- Returns structured research text

### Stage 3: Synthesis
```
Raw Research (8 areas)
        |
        v
+------------------+
| gemini-3-pro     |  <-- Advanced reasoning
| Synthesis        |
+------------------+
        |
        v
Structured CompanyResearch object
(Zod-validated schema)
```

### Stage 4: Memo Generation
```
CompanyResearch + Raw Research + Fund Thesis + Strategic Partners
                            |
                            v
                  +------------------+
                  | gemini-3-pro     |
                  | Memo Generator   |
                  +------------------+
                            |
                            v
                  InvestmentMemo object
                  - Summary
                  - Scores (0-10)
                  - Fund Fit
                  - Partner Fit
                  - Risks
                  - Sources
```

### Stage 5: Infographic (Optional)
```
CompanyResearch + InvestmentMemo
              |
              v
    +------------------+
    | gemini-3-pro     |
    | -image-preview   |
    +------------------+
              |
              v
    Base64 PNG Image
```

### Stage 6: CRM Save
```
InvestmentMemo --> Attio API --> Company Record
                            --> Opportunity Record
                            --> Linked Notes
```

## Data Flow (SSE Streaming)

```
Client                          Server
  |                               |
  |------ POST /api/process ----->|
  |                               |
  |<----- SSE: progress ---------|  (stage updates)
  |<----- SSE: research ---------|  (per-area status)
  |<----- SSE: metrics ----------|  (tokens, time)
  |<----- SSE: result -----------|  (final memo)
  |                               |
```

## Key Design Decisions

### 1. Parallel Research
- 8 independent agents run simultaneously
- Reduces total time from ~16 min to ~2 min
- Each agent isolated for error resilience

### 2. Tiered Model Strategy
- **Flash** for high-volume research (cheap, fast)
- **Pro** for synthesis/analysis (better reasoning)
- **Pro Image** for visual output (text rendering)

### 3. File Context Integration
- Uploaded files triaged by AI
- Relevant content injected into research prompts
- Web search supplements/verifies file data

### 4. Structured Output
- Zod schemas enforce data consistency
- Type-safe from API to UI
- Easy to extend/modify

## Performance Metrics

| Stage | Model | Avg Time | Tokens |
|-------|-------|----------|--------|
| Triage | Flash | 2s | ~1K |
| Research (x8) | Flash | 15s | ~40K |
| Synthesis | Pro | 8s | ~10K |
| Memo | Pro | 12s | ~15K |
| Infographic | Pro Image | 20s | ~5K |
| **Total** | Mixed | **~60s** | **~70K** |

## Security & Reliability

- API keys server-side only
- File validation before processing
- Error boundaries per pipeline stage
- Graceful degradation (skip infographic on error)
- Rate limiting via Vercel

## Built for AGI House Gemini 3 Hackathon
December 2024 | San Francisco
