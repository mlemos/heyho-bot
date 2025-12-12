# Implementation Plan: VC Associate

## Status: MVP Complete

The core MVP is functional with the following features working:
- Gemini 2.5 Flash + Google Search grounding
- Parallel research pipeline (6 concurrent queries)
- Three-way scoring (Company, Fund Fit, Partner Fit)
- Real-time SSE streaming with progress tracking
- Next.js UI with chat + opportunity cards

---

## Architecture Overview

**Core Technologies:**
- **AI Engine**: Gemini 2.5 Flash via Vercel AI SDK with Google Search grounding
- **Frontend**: Next.js 16 with App Router
- **Language**: TypeScript with strict mode
- **Validation**: Zod schemas for structured outputs
- **Streaming**: Server-Sent Events (SSE)

---

## What's Built

### Research Pipeline (`src/lib/research.ts`)

Six parallel specialized research functions:
1. `researchCompanyBasics()` - Company description, industry, stage, location
2. `researchFounders()` - Founder names, roles, backgrounds
3. `researchFunding()` - Total raised, investors, last round
4. `researchProduct()` - Product details, traction, customers
5. `researchCompetitive()` - Competitive landscape, differentiation
6. `researchNews()` - Recent news, momentum indicators

Orchestration functions:
- `runParallelResearch()` - Runs all 6 queries concurrently with progress callbacks
- `synthesizeResearch()` - Structures raw research into `CompanyResearch` object
- `generateInvestmentMemo()` - Creates full `InvestmentMemo` with three scorecards

### Type System (`src/types/schemas.ts`)

Key schemas:
- `CompanyResearchSchema` - Structured company data
- `CompanyScorecardSchema` - Objective company metrics (0.0-10.0)
- `FundFitSchema` - Fund thesis alignment analysis
- `StrategicFitAnalysisSchema` - Partner fit analysis
- `InvestmentMemoSchema` - Complete memo with all sections

### Configuration

**Fund Thesis** (`src/config/fund-thesis.ts`):
- Target stages, sectors, geographies
- Check size range
- Key investment theses
- Must-haves and red flags

**Strategic Partners** (`src/config/strategic-partners.ts`):
- 5 sample partners with markets, thesis, interests
- Used for partner fit analysis

### API (`app/api/process/route.ts`)

SSE streaming endpoint that:
1. Receives company name input
2. Runs full research pipeline
3. Streams progress events (stage changes, research status)
4. Returns complete result

### UI (`app/page.tsx`)

Two-panel layout:
- **Left**: Chat interface with message history
- **Right**: Opportunity cards with real-time processing status

Components:
- `PipelineProgress` - Visual task list showing all pipeline steps
- `ProcessingCard` - Shows progress while researching
- `OpportunityCard` - Collapsed view with 3 score bubbles, tags, quick links
- `CompanyScorecard` - Score bubble + metric bars
- `FundFitCard` - Score bubble + fit dimensions + aligned theses
- `StrategicFitCard` - Score bubble + partner matches

---

## Key Technical Decisions

### Vercel AI SDK Usage

```typescript
import { generateText, generateObject, stepCountIs } from "ai";
import { google } from "@ai-sdk/google";

// For research with search grounding
const { text } = await generateText({
  model: google("gemini-2.5-flash"),
  tools: {
    google_search: google.tools.googleSearch({}),
  },
  stopWhen: stepCountIs(5),  // Note: replaces deprecated maxSteps
  prompt: "...",
});

// For structured outputs
const { object } = await generateObject({
  model: google("gemini-2.5-flash"),
  schema: YourZodSchema,
  prompt: "...",
});
```

### SSE Streaming Pattern

```typescript
function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(c) { controller = c; },
  });

  const send = (event: ProgressEvent) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  };

  const close = () => controller.close();

  return { stream, send, close };
}
```

### Three-Way Scoring

Separated into distinct analyses:
1. **Company Scorecard** - Objective quality (independent of our fund)
2. **Fund Fit** - How well it matches our specific thesis
3. **Partner Fit** - Alignment with our strategic partners

All scores use 0.0-10.0 scale with one decimal precision.

---

## What's Not Built (Future Work)

### Integrations
- [ ] Real Attio CRM integration
- [ ] Real Google Drive integration
- [ ] Full memo download (PDF/Markdown)

### Multi-modal Input
- [ ] Screenshot/image processing
- [ ] URL parsing
- [ ] Audio transcription
- [ ] Batch processing (multiple companies)

### UI Enhancements
- [ ] Mobile-responsive layout
- [ ] Drag-and-drop file upload
- [ ] Voice input
- [ ] Advanced filtering/sorting of opportunities

### Architecture (Deferred)
- [ ] Vercel Workflow for durability (not needed for hackathon)
- [ ] Background job queue
- [ ] Persistent storage

---

## Environment Setup

```bash
# .env.local
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key

# Future
ATTIO_API_KEY=your-attio-api-key
GOOGLE_SERVICE_ACCOUNT_KEY=path/to/service-account.json
GOOGLE_DRIVE_ROOT_FOLDER_ID=your-folder-id
```

---

## Running the Application

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production build
npm run build
npm start
```

---

## Learnings

### What Worked Well
- Parallel research queries dramatically reduce processing time
- SSE streaming provides great UX for long-running operations
- Zod schemas ensure consistent structured outputs from Gemini
- Separating Company/Fund/Partner scores provides clearer analysis

### Challenges Overcome
- `maxSteps` deprecated in favor of `stopWhen: stepCountIs(N)`
- Need to exclude test files from TypeScript compilation
- Research prompts need to be specific for quality results

### Architecture Validation
- SSE sufficient for real-time updates (no need for WebSockets)
- Vercel Workflow adds complexity without clear benefit for this use case
- Parallel execution + streaming = good hackathon demo experience
