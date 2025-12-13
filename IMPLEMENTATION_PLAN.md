# Implementation Plan: VC Associate

## Status: Phase 2.1 Complete → Phase 2.2 Pending

The core MVP plus multi-modal support is functional with the following features working:
- Gemini 3 Pro (`gemini-3-pro-preview`) + Google Search grounding
- Parallel research pipeline (6 concurrent queries)
- Three-way scoring (Company, Fund Fit, Partner Fit)
- Real-time SSE streaming with progress tracking
- Next.js UI with chat + opportunity cards
- **Multi-modal file input** (drag-drop any file type)
- **Smart file triage** (AI classifies files and routes content to research areas)
- **Attachment references** (memo documents what files were used)

---

## Phase 2: Multi-Modal Input + Mobile UX

### Priority 1: Multi-Modal File Support

Enable users to research companies by uploading pitch decks, screenshots, or other documents.

#### 1.1 File Upload Infrastructure

**New Components:**
- `FileDropZone` - Drag-and-drop area with click-to-upload fallback
- `AttachmentPreview` - Thumbnail/icon display for attached files
- `AttachmentList` - List of pending attachments before submission

**Supported File Types (Gemini-native):**

Gemini 3 Pro natively handles a wide range of file types - no preprocessing needed!

| Category | Types | Notes |
|----------|-------|-------|
| Images | PNG, JPEG, WebP, GIF, BMP | Direct vision processing |
| Documents | PDF, TXT, HTML, CSS, JS, TS | Native document understanding |
| Office | DOC, DOCX, XLS, XLSX, PPT, PPTX | Full document parsing |
| Data | CSV, JSON, XML | Structured data extraction |
| Code | Python, Java, C++, etc. | Code analysis |
| Audio | MP3, WAV, FLAC, OGG | Transcription + analysis |
| Video | MP4, MOV, AVI, MKV | Frame analysis + audio |

**API Changes:**
- Update `/api/process` to accept `multipart/form-data`
- Add file validation (size limits only - let Gemini handle the rest)
- Pass files directly to Gemini as buffers with mime types

#### 1.2 Gemini-Native Multi-Modal Processing

**Key Insight:** Gemini 3 Pro handles all file processing natively. No need for `pdf-lib`, `sharp`, or any preprocessing libraries.

**Simplified Flow:**
```
1. User drops any file(s) (pitch deck, screenshot, audio memo, video, etc.)
2. Validate file size (< 20MB per file)
3. Send directly to Gemini 3 with analysis prompt
4. Gemini extracts company information from any format
5. Use extracted info to seed research pipeline
6. Run normal parallel research with extracted context
```

**Implementation:**
```typescript
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

// Works with ANY supported file type - no preprocessing!
const { object } = await generateObject({
  model: google("gemini-3-pro-preview"),
  schema: ExtractedCompanyInfoSchema,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `Analyze these files and extract company information:
            - Company name
            - What they do
            - Key metrics (users, revenue, growth)
            - Team/founders information
            - Funding/investor info
            - Any other relevant details`
        },
        // PDF pitch deck
        { type: "file", data: pdfBuffer, mimeType: "application/pdf" },
        // Screenshot
        { type: "image", image: imageBuffer },
        // Audio pitch
        { type: "file", data: audioBuffer, mimeType: "audio/mp3" },
        // ... any combination of files
      ],
    },
  ],
});
```

#### 1.3 Simplified Pipeline

**New Pipeline Stages:**
```
[Upload] → [Validate] → [Analyze] → [Research] → [Generate]
    │          │            │            │            │
    │          │            │            │            └─ Existing memo generation
    │          │            │            └─ Existing parallel research
    │          │            └─ NEW: Gemini 3 native multi-modal analysis
    │          └─ NEW: File size validation (no type restrictions)
    └─ NEW: Drag-drop + click upload
```

**Progress Events (updated):**
- `uploading` - Files being uploaded
- `analyzing` - Gemini processing attachments (native multi-modal)
- `identifying` - (existing) Identify company from analysis
- `researching` - (existing) Parallel research queries
- `synthesizing` - (existing) Structure research
- `generating` - (existing) Generate memo
- `saving` - (existing) Save to CRM

**What We Eliminated:**
- ~~`pdf-lib`~~ - Gemini reads PDFs natively
- ~~`sharp`~~ - No image preprocessing needed
- ~~Page extraction~~ - Gemini handles full documents
- ~~Format conversion~~ - Gemini handles Office docs natively
- ~~Audio transcription libraries~~ - Gemini transcribes natively

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

### Phase 2.1: Multi-Modal (Gemini-Native) ✅ COMPLETE

- [x] **Infrastructure**
  - [x] Create `FileDropZone` component with drag-drop + click (mobile-friendly)
  - [x] Create `AttachmentPreview` component (thumbnails/icons by mime type)
  - [x] Create `AttachmentList` component with remove functionality
  - [x] Add file size validation utility (20MB limit)

- [x] **API Updates**
  - [x] Update `/api/process` to handle `multipart/form-data`
  - [x] Parse files and convert to buffers with mime types
  - [x] Pass files directly to Gemini (no preprocessing)

- [x] **Smart File Triage** (enhancement over original plan)
  - [x] Create `triageFiles()` function using Gemini 3 native multi-modal
  - [x] Define `FileTriageResultSchema` for file classification
  - [x] Create `buildResearchContext()` to route content to research areas
  - [x] Create `buildAttachmentReferences()` for memo documentation
  - [x] Update research functions to accept targeted file context
  - [x] Add new progress stages (triaging → triaged)

- [x] **UI Integration**
  - [x] Add full-panel drop zone with overlay to chat area
  - [x] Show attachment previews before submission
  - [x] Update progress display for new stages
  - [x] Handle mixed input (text + files)
  - [x] Display attachment references in expanded opportunity card

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

### File Handling (Gemini-Native)

**Key Decision:** Let Gemini handle everything. No preprocessing libraries.

| Decision | Choice | Rationale |
|----------|--------|-----------|
| File processing | Gemini-native | Handles PDFs, Office docs, images, audio, video natively |
| Preprocessing | None | Gemini optimizes internally via `media_resolution` |
| Libraries | None needed | Eliminates `pdf-lib`, `sharp`, transcription libs |

### File Size Limits
- Per file: 20MB max
- Total per submission: 50MB max
- Gemini handles optimization via `media_resolution` parameter

### Supported Input Combinations
Users can submit any combination of:
- Text only (current behavior)
- Files only (Gemini extracts company info)
- Text + files (text provides context, files provide details)

---

## Architecture Overview

**Core Technologies:**
- **AI Engine**: Gemini 3 Pro (`gemini-3-pro-preview`) via Vercel AI SDK
  - Google Search grounding for research
  - Native multi-modal (images, PDFs, Office docs, audio, video)
- **Frontend**: Next.js 16 with App Router
- **Language**: TypeScript with strict mode
- **Validation**: Zod schemas for structured outputs
- **Streaming**: Server-Sent Events (SSE)
- **File Processing**: None needed - Gemini handles natively

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
