# VC Associate - AI-Powered Investment Research

A multi-modal AI-based VC associate built for the AGI House Gemini 3 hackathon. The application processes investment opportunities using Gemini 2.5 Flash with Google Search grounding to research companies and generate comprehensive investment memos.

## Features

- **Parallel Research Pipeline**: 6 concurrent specialized research queries (Company Info, Founders, Funding, Product, Competition, News)
- **Three-Way Analysis**:
  - **Company Scorecard** (0.0-10.0): Objective company quality metrics (Team, Market, Product, Traction, Competition)
  - **Fund Fit** (0.0-10.0): Alignment with fund thesis (Stage, Sector, Geography, Check Size)
  - **Partner Fit** (0.0-10.0): Strategic partner alignment analysis
- **Real-time Progress**: SSE streaming with visual pipeline progress tracking
- **Investment Memos**: Structured memo generation with executive summary, detailed sections, and scorecards
- **Configurable**: Customizable fund thesis and strategic partners

## Tech Stack

- **Frontend**: Next.js 16, React, Tailwind CSS
- **AI**: Gemini 3 Pro (`gemini-3-pro-preview`) via Vercel AI SDK (`@ai-sdk/google`)
- **Search**: Google Search grounding for real-time company research
- **Validation**: Zod schemas for structured outputs
- **Language**: TypeScript with strict mode

## Getting Started

### Prerequisites

- Node.js 18+
- Google AI API key (from [Google AI Studio](https://aistudio.google.com/apikey))

### Installation

```bash
npm install
cp .env.example .env.local
# Add your GOOGLE_GENERATIVE_AI_API_KEY to .env.local
```

### Running

```bash
npm run dev
# Open http://localhost:3000
```

### Usage

1. Enter a company name in the chat input (e.g., "Anthropic", "Stripe", "Mistral AI")
2. Watch the pipeline progress as it researches the company
3. View the generated opportunity card with scores and analysis
4. Click to expand for detailed memo sections

## Project Structure

```
sandbox-gemini/
├── app/
│   ├── page.tsx                 # Main UI: chat + opportunity cards
│   └── api/process/route.ts     # Streaming API endpoint
├── src/
│   ├── lib/research.ts          # Research pipeline functions
│   ├── config/
│   │   ├── fund-thesis.ts       # Fund investment thesis config
│   │   └── strategic-partners.ts # Strategic partners config
│   └── types/schemas.ts         # Zod schemas for all types
├── .env.example
└── package.json
```

## Configuration

### Fund Thesis (`src/config/fund-thesis.ts`)

Customize your fund's investment criteria:
- Target stages (Pre-Seed, Seed, Series A)
- Target sectors (AI/ML, Enterprise Software, etc.)
- Target geographies
- Check size range
- Key investment theses
- Must-haves and red flags

### Strategic Partners (`src/config/strategic-partners.ts`)

Define your fund's strategic partners for fit analysis:
- Partner name and markets
- Investment thesis
- Interest areas

## Architecture

### Research Pipeline

1. **Identify Company** - Extract company name from input
2. **Check CRM** - Look for existing records (mocked)
3. **Parallel Research** - 6 concurrent Gemini searches:
   - Company basics (description, industry, stage, location)
   - Founders (names, roles, backgrounds)
   - Funding (total raised, investors, last round)
   - Product (offering, traction, customers)
   - Competitive landscape
   - Recent news and momentum
4. **Synthesize** - Structure research into `CompanyResearch` object
5. **Generate Memo** - Create `InvestmentMemo` with:
   - Executive summary
   - Detailed sections (company, founders, investors, funding, momentum, competition, thesis alignment, synergies, risks)
   - Company Scorecard (objective metrics)
   - Fund Fit analysis
   - Partner Fit analysis
   - One-liner and tags
6. **Save to CRM** - Store opportunity (mocked)

### Streaming Progress

The API uses Server-Sent Events (SSE) to stream real-time progress:
- Pipeline stage updates
- Individual research task status
- Final result with complete memo

## Key Learnings

### Vercel AI SDK with Gemini 3

- Use `stopWhen: stepCountIs(N)` instead of deprecated `maxSteps`
- Google Search grounding via `google.tools.googleSearch({})`
- Structured outputs with Zod schemas via `generateObject()`
- Gemini 3 features: `thinking_level` for reasoning depth, `media_resolution` for vision quality

### Architecture Decisions

- **SSE over WebSockets**: Simpler, works great for unidirectional streaming
- **Parallel research queries**: 6x faster than sequential
- **No Vercel Workflow needed**: SSE streaming sufficient for hackathon demo
- **Separate scoring dimensions**: Company quality vs Fund fit vs Partner fit

## Future Enhancements

- [ ] Real CRM integration (Attio)
- [ ] Google Drive integration for memo storage
- [ ] Multi-modal input (screenshots, URLs, audio)
- [ ] Batch processing (multiple companies from single input)
- [ ] Full memo PDF/markdown download
- [ ] Mobile-responsive UI

## Environment Variables

```bash
# Required
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key

# Future: CRM Integration
ATTIO_API_KEY=your-attio-api-key

# Future: Google Drive
GOOGLE_SERVICE_ACCOUNT_KEY=path/to/service-account.json
GOOGLE_DRIVE_ROOT_FOLDER_ID=your-folder-id
```

## License

MIT
