# Implementation Plan: VC Associate

## Status: MVP Complete → Phase 2 In Progress

The core MVP is functional with the following features working:
- Gemini 3 Pro (`gemini-3-pro-preview`) + Google Search grounding
- Parallel research pipeline (6 concurrent queries)
- Three-way scoring (Company, Fund Fit, Partner Fit)
- Real-time SSE streaming with progress tracking
- Next.js UI with chat + opportunity cards

---

## Phase 2: Multi-Modal Input + Mobile UX

### Priority 1: Multi-Modal File Support

Enable users to research companies by uploading pitch decks, screenshots, or other documents.

#### 1.1 File Upload Infrastructure

**New Components:**
- `FileDropZone` - Drag-and-drop area with click-to-upload fallback
- `AttachmentPreview` - Thumbnail/icon display for attached files
- `AttachmentList` - List of pending attachments before submission

**Supported File Types:**
| Type | Extensions | Processing |
|------|-----------|------------|
| Images | `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif` | Direct to Gemini Vision |
| PDFs | `.pdf` | Extract pages as images → Gemini Vision |
| Documents | `.docx`, `.pptx` | Convert to PDF → Extract → Vision |

**API Changes:**
- Update `/api/process` to accept `multipart/form-data`
- Add file validation (size limits, type checking)
- Store attachments temporarily for processing

#### 1.2 Gemini Vision Integration

**Multi-Modal Research Flow:**
```
1. User drops pitch deck (PDF/images)
2. Extract visual content (PDF pages → images)
3. Send to Gemini with vision prompt:
   "Analyze this pitch deck/screenshot. Extract:
    - Company name
    - What they do
    - Key metrics shown
    - Team information visible
    - Any funding/investor info"
4. Use extracted info to seed research pipeline
5. Run normal parallel research with extracted context
```

**Implementation:**
```typescript
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

const { text } = await generateText({
  model: google("gemini-3-pro-preview"),
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "Analyze this pitch deck..." },
        { type: "image", image: imageBuffer }, // or base64
      ],
    },
  ],
  // Gemini 3 features:
  // - thinking_level: "low" | "medium" | "high" (reasoning depth)
  // - media_resolution: control vision processing quality vs tokens
});
```

#### 1.3 File Processing Pipeline

**New Pipeline Stages:**
```
[Upload] → [Validate] → [Extract] → [Analyze] → [Research] → [Generate]
    │          │           │           │            │            │
    │          │           │           │            │            └─ Existing memo generation
    │          │           │           │            └─ Existing parallel research
    │          │           │           └─ NEW: Gemini Vision analysis
    │          │           └─ NEW: PDF/doc → images
    │          └─ NEW: File type/size validation
    └─ NEW: Drag-drop + click upload
```

**Progress Events (updated):**
- `uploading` - Files being uploaded
- `extracting` - Converting PDF/docs to images
- `analyzing` - Gemini Vision processing attachments
- `identifying` - (existing) Identify company from analysis
- `researching` - (existing) Parallel research queries
- `synthesizing` - (existing) Structure research
- `generating` - (existing) Generate memo
- `saving` - (existing) Save to CRM

---

### Priority 2: Mobile-Responsive UX

Transform the desktop two-panel layout into a mobile-friendly single-panel experience.

#### 2.1 Responsive Layout Strategy

**Breakpoints:**
- **Desktop** (≥1024px): Current two-panel layout
- **Tablet** (768-1023px): Stacked panels, full-width cards
- **Mobile** (<768px): Single panel with tab navigation

**Mobile Layout:**
```
┌─────────────────────┐
│ [Chat] [Results] ←─── Tab bar
├─────────────────────┤
│                     │
│   Active Panel      │
│   (Chat or Results) │
│                     │
├─────────────────────┤
│ [+] Input area [→]  │  ← Attachment button + send
└─────────────────────┘
```

#### 2.2 Component Refactoring

**Extract from `page.tsx` into separate files:**
```
components/
├── chat/
│   ├── ChatPanel.tsx
│   ├── MessageList.tsx
│   ├── MessageBubble.tsx
│   └── ChatInput.tsx
├── opportunities/
│   ├── OpportunitiesPanel.tsx
│   ├── OpportunityCard.tsx
│   ├── ProcessingCard.tsx
│   └── PipelineProgress.tsx
├── scores/
│   ├── CompanyScorecard.tsx
│   ├── FundFitCard.tsx
│   └── StrategicFitCard.tsx
├── upload/
│   ├── FileDropZone.tsx
│   ├── AttachmentPreview.tsx
│   └── AttachmentList.tsx
└── layout/
    ├── MobileTabBar.tsx
    └── ResponsiveLayout.tsx
```

#### 2.3 Mobile Input Experience

**Attachment Flow (Mobile):**
1. Tap [+] button in input area
2. Show action sheet: "Take Photo" | "Photo Library" | "Files"
3. Selected files appear as chips above input
4. Tap chip to preview/remove
5. Submit with text + attachments

**Touch Optimizations:**
- Larger tap targets (min 44px)
- Swipe to dismiss expanded cards
- Pull-to-refresh opportunity list
- Bottom sheet for expanded opportunity details

#### 2.4 Progressive Enhancement

**Mobile-First CSS Strategy:**
```css
/* Base: Mobile */
.layout { display: flex; flex-direction: column; }
.panel { width: 100%; }

/* Tablet */
@media (min-width: 768px) {
  .layout { flex-direction: column; }
  .panel { width: 100%; }
}

/* Desktop */
@media (min-width: 1024px) {
  .layout { flex-direction: row; }
  .panel { width: 50%; }
}
```

---

## Implementation Checklist

### Phase 2.1: Multi-Modal (File Upload + Vision)

- [ ] **Infrastructure**
  - [ ] Create `FileDropZone` component with drag-drop + click
  - [ ] Create `AttachmentPreview` component (thumbnails/icons)
  - [ ] Create `AttachmentList` component
  - [ ] Add file validation utilities (type, size)

- [ ] **API Updates**
  - [ ] Update `/api/process` to handle `multipart/form-data`
  - [ ] Add PDF page extraction (pdf-lib or similar)
  - [ ] Add temporary file storage for processing

- [ ] **Vision Integration**
  - [ ] Create `analyzeAttachments()` function using Gemini Vision
  - [ ] Update research pipeline to use extracted context
  - [ ] Add new progress stages for upload/extract/analyze

- [ ] **UI Integration**
  - [ ] Add drop zone to chat input area
  - [ ] Show attachment previews before submission
  - [ ] Update progress display for new stages

### Phase 2.2: Mobile-Responsive UX

- [ ] **Component Extraction**
  - [ ] Extract chat components from `page.tsx`
  - [ ] Extract opportunity components from `page.tsx`
  - [ ] Extract score card components from `page.tsx`
  - [ ] Create upload components

- [ ] **Responsive Layout**
  - [ ] Create `ResponsiveLayout` wrapper component
  - [ ] Create `MobileTabBar` for panel switching
  - [ ] Add responsive breakpoint styles
  - [ ] Test on various screen sizes

- [ ] **Mobile Optimizations**
  - [ ] Add mobile attachment picker (action sheet)
  - [ ] Increase touch target sizes
  - [ ] Add swipe gestures for cards
  - [ ] Optimize for mobile keyboards

---

## Technical Decisions

### File Size Limits
- Images: 10MB max
- PDFs: 20MB max (will extract first 10 pages)
- Total per submission: 50MB max

### PDF Processing Options

**Option A: Client-side (pdf.js)**
- Pros: No server processing, fast
- Cons: Larger bundle, limited format support

**Option B: Server-side (pdf-lib + sharp)**
- Pros: Better quality, more formats
- Cons: Server resources, slower

**Recommended: Option B** - Server-side processing for reliability

### Image Optimization
- Resize large images before sending to Gemini (max 2048px)
- Convert to WebP/JPEG for smaller payloads
- Use sharp for server-side processing

---

## Architecture Overview

**Core Technologies:**
- **AI Engine**: Gemini 3 Pro (`gemini-3-pro-preview`) via Vercel AI SDK with Google Search grounding + Vision
- **Frontend**: Next.js 16 with App Router
- **Language**: TypeScript with strict mode
- **Validation**: Zod schemas for structured outputs
- **Streaming**: Server-Sent Events (SSE)
- **File Processing**: pdf-lib (PDF), sharp (images)

---

## What's Built (Phase 1 - MVP)

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

## Key Technical Patterns

### Vercel AI SDK Usage with Gemini 3

```typescript
import { generateText, generateObject, stepCountIs } from "ai";
import { google } from "@ai-sdk/google";

// For research with search grounding
const { text } = await generateText({
  model: google("gemini-3-pro-preview"),
  tools: {
    google_search: google.tools.googleSearch({}),
  },
  stopWhen: stepCountIs(5),
  prompt: "...",
});

// For structured outputs (now works with built-in tools in single call!)
const { object } = await generateObject({
  model: google("gemini-3-pro-preview"),
  schema: YourZodSchema,
  prompt: "...",
});

// For vision with Gemini 3 features
const { text } = await generateText({
  model: google("gemini-3-pro-preview"),
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "Analyze this image..." },
        { type: "image", image: buffer },
      ],
    },
  ],
  // NEW Gemini 3 parameters:
  // providerOptions: {
  //   google: {
  //     thinkingLevel: "high",      // "low" | "medium" | "high"
  //     mediaResolution: "medium",  // control vision quality vs tokens
  //   }
  // }
});
```

### Gemini 3 Key Features

| Feature | Description | Use Case |
|---------|-------------|----------|
| `thinking_level` | Control reasoning depth (low/medium/high) | High for complex analysis, low for speed |
| `media_resolution` | Vision processing quality | High for pitch decks, low for thumbnails |
| Thought signatures | Persist reasoning across calls | Multi-turn image editing, function chains |
| Structured + Tools | Use Google Search with structured output | Research + parse in single call |

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

## Future Work (Phase 3+)

### Integrations
- [ ] Real Attio CRM integration
- [ ] Real Google Drive integration
- [ ] Full memo download (PDF/Markdown)

### Additional Input Modes
- [ ] URL parsing (paste company website)
- [ ] Audio transcription (voice memos)
- [ ] Batch processing (multiple companies)

### Advanced Features
- [ ] Advanced filtering/sorting of opportunities
- [ ] Comparison view (side-by-side companies)
- [ ] Export to various formats
- [ ] Persistent storage / database

### Architecture
- [ ] Vercel Workflow for durability
- [ ] Background job queue
- [ ] User authentication

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
