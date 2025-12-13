/**
 * Research Pipeline Functions
 *
 * Core functions for running parallel research queries and synthesizing results.
 * Extracted from test file for use in API routes.
 */

import { generateText, generateObject, stepCountIs } from "ai";
import { google } from "@ai-sdk/google";
import {
  CompanyResearchSchema,
  InvestmentMemoSchema,
  type CompanyResearch,
  type InvestmentMemo,
  type StrategicPartner,
} from "../types/schemas";

// Schema for AI generation - excludes fields that are added programmatically
const InvestmentMemoGenerationSchema = InvestmentMemoSchema.omit({
  attachmentReferences: true,
  infographicBase64: true,
});
import { getStrategicPartners } from "../config/strategic-partners";
import { formatFundThesisContext } from "../config/fund-thesis";

// ===========================================
// Types
// ===========================================

export type ResearchArea = "basics" | "founders" | "funding" | "product" | "competitive" | "news";

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ResearchResultWithUsage {
  text: string;
  usage: TokenUsage;
}

export interface ResearchProgress {
  area: ResearchArea;
  status: "pending" | "in_progress" | "completed" | "error";
  result?: string;
  error?: string;
}

// Helper to map AI SDK v5 usage to our TokenUsage format
// AI SDK v5 uses inputTokens/outputTokens instead of promptTokens/completionTokens
function mapUsage(usage: { inputTokens?: number; outputTokens?: number } | undefined): TokenUsage {
  const inputTokens = usage?.inputTokens || 0;
  const outputTokens = usage?.outputTokens || 0;
  return {
    promptTokens: inputTokens,
    completionTokens: outputTokens,
    totalTokens: inputTokens + outputTokens,
  };
}

export interface ParallelResearchResults {
  basics: string;
  founders: string;
  funding: string;
  product: string;
  competitive: string;
  news: string;
  totalUsage?: TokenUsage;
}

export interface PipelineProgress {
  stage: "identifying" | "researching" | "synthesizing" | "generating" | "saving" | "complete" | "error";
  company?: string;
  researchProgress?: Map<ResearchArea, ResearchProgress>;
  message?: string;
}

// Context from uploaded files, organized by research area
export interface FileContext {
  basics?: string;
  founders?: string;
  funding?: string;
  product?: string;
  competitive?: string;
  news?: string;
}

// ===========================================
// Research Functions (with optional file context)
// ===========================================

function buildContextPrefix(fileContext?: string): string {
  if (!fileContext) return "";
  return `IMPORTANT: Use this information from uploaded files as a primary source. Verify and supplement with web search:

${fileContext}

---

Now search for additional/updated information:

`;
}

export async function researchCompanyBasics(companyName: string, fileContext?: string): Promise<ResearchResultWithUsage> {
  const contextPrefix = buildContextPrefix(fileContext);
  const { text, usage } = await generateText({
    model: google("gemini-3-pro-preview"),
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    stopWhen: stepCountIs(3),
    prompt: `${contextPrefix}Search for basic information about "${companyName}" company:
- What does the company do? (one paragraph description)
- What industry/sector are they in?
- What stage are they at? (pre-seed, seed, Series A, etc.)
- Where are they headquartered?
- What is their website?

Be thorough and cite specific facts.`,
  });
  return {
    text,
    usage: mapUsage(usage),
  };
}

export async function researchFounders(companyName: string, fileContext?: string): Promise<ResearchResultWithUsage> {
  const contextPrefix = buildContextPrefix(fileContext);
  const { text, usage } = await generateText({
    model: google("gemini-3-pro-preview"),
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    stopWhen: stepCountIs(3),
    prompt: `${contextPrefix}Search for founder information about "${companyName}" company:
- Who are the founders and co-founders?
- What are their roles/titles?
- What is their professional background? (previous companies, education)
- Any notable achievements or credentials?

Focus on finding specific names and verifiable background info.`,
  });
  return {
    text,
    usage: mapUsage(usage),
  };
}

export async function researchFunding(companyName: string, fileContext?: string): Promise<ResearchResultWithUsage> {
  const contextPrefix = buildContextPrefix(fileContext);
  const { text, usage } = await generateText({
    model: google("gemini-3-pro-preview"),
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    stopWhen: stepCountIs(3),
    prompt: `${contextPrefix}Search for funding information about "${companyName}" company:
- How much total funding have they raised?
- What was their most recent funding round?
- When did the last round close?
- Who are their investors? (VCs, angels, strategics)
- Any notable investors or lead investors?

Look for specific dollar amounts and investor names.`,
  });
  return {
    text,
    usage: mapUsage(usage),
  };
}

export async function researchProduct(companyName: string, fileContext?: string): Promise<ResearchResultWithUsage> {
  const contextPrefix = buildContextPrefix(fileContext);
  const { text, usage } = await generateText({
    model: google("gemini-3-pro-preview"),
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    stopWhen: stepCountIs(3),
    prompt: `${contextPrefix}Search for product and traction information about "${companyName}" company:
- What is their main product or service?
- What technology do they use or build?
- Who are their customers/users?
- Any metrics on traction? (users, revenue, growth)
- What problems do they solve?

Focus on product details and any available traction metrics.`,
  });
  return {
    text,
    usage: mapUsage(usage),
  };
}

export async function researchCompetitive(companyName: string, fileContext?: string): Promise<ResearchResultWithUsage> {
  const contextPrefix = buildContextPrefix(fileContext);
  const { text, usage } = await generateText({
    model: google("gemini-3-pro-preview"),
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    stopWhen: stepCountIs(3),
    prompt: `${contextPrefix}Search for competitive landscape information about "${companyName}" company:
- Who are their main competitors?
- How do they differentiate themselves?
- What is the market size/opportunity?
- What are their competitive advantages or moats?

Identify specific competitor names and differentiation points.`,
  });
  return {
    text,
    usage: mapUsage(usage),
  };
}

export async function researchNews(companyName: string, fileContext?: string): Promise<ResearchResultWithUsage> {
  const contextPrefix = buildContextPrefix(fileContext);
  const { text, usage } = await generateText({
    model: google("gemini-3-pro-preview"),
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    stopWhen: stepCountIs(3),
    prompt: `${contextPrefix}Search for recent news and momentum about "${companyName}" company:
- Any recent news articles or press releases?
- Any product launches or major announcements?
- Any partnerships or customer wins?
- Any awards or recognition?
- Any hiring activity or expansion?

Focus on news from the last 6-12 months.`,
  });
  return {
    text,
    usage: mapUsage(usage),
  };
}

// ===========================================
// Parallel Research Orchestration
// ===========================================

export async function runParallelResearch(
  companyName: string,
  onProgress?: (area: ResearchArea, status: ResearchProgress["status"], tokens?: number) => void,
  fileContext?: FileContext
): Promise<ParallelResearchResults> {
  // Each research function gets its targeted context from files
  const tasks = [
    { area: "basics" as ResearchArea, fn: () => researchCompanyBasics(companyName, fileContext?.basics) },
    { area: "founders" as ResearchArea, fn: () => researchFounders(companyName, fileContext?.founders) },
    { area: "funding" as ResearchArea, fn: () => researchFunding(companyName, fileContext?.funding) },
    { area: "product" as ResearchArea, fn: () => researchProduct(companyName, fileContext?.product) },
    { area: "competitive" as ResearchArea, fn: () => researchCompetitive(companyName, fileContext?.competitive) },
    { area: "news" as ResearchArea, fn: () => researchNews(companyName, fileContext?.news) },
  ];

  const results = await Promise.all(
    tasks.map(async ({ area, fn }) => {
      onProgress?.(area, "in_progress");

      try {
        const result = await fn();
        onProgress?.(area, "completed", result.usage.totalTokens);
        return { area, text: result.text, usage: result.usage, error: null };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        onProgress?.(area, "error");
        return { area, text: "", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, error: errorMsg };
      }
    })
  );

  // Accumulate total usage
  const totalUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  const aggregated: ParallelResearchResults = {
    basics: "",
    founders: "",
    funding: "",
    product: "",
    competitive: "",
    news: "",
  };

  results.forEach(({ area, text, usage }) => {
    aggregated[area] = text || "";
    totalUsage.promptTokens += usage.promptTokens;
    totalUsage.completionTokens += usage.completionTokens;
    totalUsage.totalTokens += usage.totalTokens;
  });

  aggregated.totalUsage = totalUsage;

  return aggregated;
}

// ===========================================
// Synthesis & Memo Generation
// ===========================================

export async function synthesizeResearch(
  companyName: string,
  research: ParallelResearchResults
): Promise<CompanyResearch> {
  const combinedResearch = `
## Company Basics
${research.basics}

## Founders
${research.founders}

## Funding
${research.funding}

## Product & Traction
${research.product}

## Competitive Landscape
${research.competitive}

## Recent News
${research.news}
`;

  const { object } = await generateObject({
    model: google("gemini-2.5-flash"),  // Using Flash for faster synthesis
    schema: CompanyResearchSchema,
    prompt: `Based on the following research about "${companyName}", extract structured information.
If information is not available, use reasonable defaults or "Unknown".

${combinedResearch}

Extract:
1. Company basics (name, website, description, industry, stage, location)
2. Founders (name, role, background for each)
3. Funding info (total raised, last round, date, investors)
4. Momentum (recent news items, growth indicators)
5. Competitive info (landscape, competitors, differentiation)`,
  });

  return object;
}

/**
 * Format strategic partners for prompt context
 */
function formatStrategicPartnersContext(partners: StrategicPartner[]): string {
  return partners
    .map(
      (p) => `
### ${p.name}
- **Markets**: ${p.markets.join(", ")}
- **Thesis**: ${p.thesis}
- **Interests**: ${p.interests.join(", ")}`
    )
    .join("\n");
}

export async function generateInvestmentMemo(
  companyName: string,
  research: CompanyResearch,
  rawResearch?: ParallelResearchResults
): Promise<InvestmentMemo> {
  const strategicPartners = getStrategicPartners();
  const partnersContext = formatStrategicPartnersContext(strategicPartners);
  const fundThesisContext = formatFundThesisContext();

  // Build raw research context if available
  const rawResearchContext = rawResearch
    ? `
## RAW RESEARCH (Use for detailed sections with citations)

### Company Basics Research
${rawResearch.basics}

### Founders Research
${rawResearch.founders}

### Funding Research
${rawResearch.funding}

### Product & Traction Research
${rawResearch.product}

### Competitive Landscape Research
${rawResearch.competitive}

### Recent News Research
${rawResearch.news}

---
`
    : "";

  const { object } = await generateObject({
    model: google("gemini-2.5-flash"),  // Using Flash for faster memo generation
    schema: InvestmentMemoGenerationSchema,
    prompt: `Generate a professional, DETAILED investment memo for "${companyName}".

## STRUCTURED DATA (Use for scores and quick facts)
${JSON.stringify(research, null, 2)}

${rawResearchContext}

${fundThesisContext}

## Strategic Partners
${partnersContext}

---

# INSTRUCTIONS

Create a comprehensive investment memo. **Each section should be DETAILED (2-4 paragraphs) with INLINE CITATIONS.**

Format citations as: [Source Name, Date] - e.g., [TechCrunch, Dec 2024] or [Company Website]

## 1. EXECUTIVE SUMMARY
- 3-4 sentence summary of the opportunity, including key metrics and why it's interesting

## 2. DETAILED SECTIONS (Each should be 2-4 paragraphs with citations)

### Company Summary
- What does the company do? Include founding year, mission, and key products.
- What problem do they solve and for whom?
- What is their business model?
- Cite sources for key facts.

### Founder Profiles
- For each founder: full background, previous roles, education, notable achievements
- Why is this team uniquely positioned to win?
- Cite LinkedIn profiles, press coverage, etc.

### Investor Analysis
- Who has invested? Detail the investors and their track record.
- What does investor quality signal about the company?
- Any notable angels or strategic investors?

### Funding History
- Complete funding timeline with amounts, dates, and lead investors
- Current valuation if known
- How does this compare to peers?

### Momentum Analysis
- Recent news, launches, partnerships, customer wins
- Growth metrics if available
- Hiring signals, expansion plans
- Include dates and sources

### Competitive Landscape
- Who are the main competitors? Describe each briefly.
- How does the company differentiate?
- What is their moat or competitive advantage?
- Market size and dynamics

### Thesis Alignment
- How does this fit our fund's investment thesis?
- Which of our focus areas does this address?

### Strategic Synergies
- Potential portfolio company synergies
- Strategic partner opportunities
- Value-add we can provide

### Risks and Flaws
- Key risks and concerns (be specific, not generic)
- What could go wrong?
- Red flags or areas needing due diligence

## 3. COMPANY SCORECARD (0.0-10.0 scale)
- Team, Market, Product, Traction, Competition, Overall
- Use decimal scores (e.g., 7.5)

## 4. FUND FIT (0.0-10.0 scale)
- Score, Stage fit, Sector fit, Geography fit, Check size fit
- Rationale, Aligned theses, Concerns

## 5. PARTNER FIT
- Analyze fit with each strategic partner: ${strategicPartners.map((p) => p.name).join(", ")}
- Include match scores and specific synergy opportunities

## 6. ONE-LINER
- Max 15 words pitch

## 7. TAGS
- Categorization tags

## 8. SOURCES
- List ALL sources cited in the memo
- Include: title, source name, URL if available, date if known
- Track which sections used each source

**IMPORTANT**: Be thorough and specific. Avoid generic statements. Include real data, names, dates, and amounts wherever possible. Every factual claim should have a citation.`,
  });

  // Cast to InvestmentMemo - the omitted fields are optional and will be added by the caller
  return object as InvestmentMemo;
}

// ===========================================
// Infographic Generation
// ===========================================

/**
 * Generate an infographic image for the investment opportunity using Gemini
 */
export async function generateInfographic(
  companyName: string,
  research: CompanyResearch,
  memo: InvestmentMemo
): Promise<string | null> {
  try {
    // Build a detailed prompt for the infographic
    const prompt = buildInfographicPrompt(companyName, research, memo);

    // Use Gemini 3 Pro Image (Nano Banana Pro) for professional infographic generation
    // - Advanced text rendering for legible labels and scores
    // - Optimized for professional asset production (diagrams, infographics)
    // - Supports high-resolution output (1K, 2K, 4K)
    const result = await generateText({
      model: google("gemini-3-pro-image-preview"),
      providerOptions: {
        google: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      },
      prompt,
    });

    // Log what we got back
    console.log("Gemini response - text length:", result.text?.length || 0);
    console.log("Gemini response - files count:", result.files?.length || 0);

    // Extract the generated image from files
    if (result.files && result.files.length > 0) {
      for (const file of result.files) {
        console.log("File mediaType:", file.mediaType, "base64 length:", file.base64?.length || 0);
        if (file.mediaType?.startsWith("image/")) {
          // File already has base64 property
          return `data:${file.mediaType};base64,${file.base64}`;
        }
      }
    }

    console.warn("No image generated by Gemini - files:", JSON.stringify(result.files || []));
    return null;
  } catch (error) {
    console.error("Error generating infographic:", error);
    return null;
  }
}

/**
 * Build a detailed prompt for infographic generation
 */
function buildInfographicPrompt(
  companyName: string,
  research: CompanyResearch,
  memo: InvestmentMemo
): string {
  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Format the full memo content
  const memoContent = `
# ${companyName}
**${research.company.industry}** | **${research.company.stage}** | ${today}

## One-Liner
${memo.oneLiner}

## Summary
${memo.summary}

## Scores (out of 10)
- Overall: ${memo.companyScorecard.overall.toFixed(1)}
- Team: ${memo.companyScorecard.team.toFixed(1)}
- Market: ${memo.companyScorecard.market.toFixed(1)}
- Product: ${memo.companyScorecard.product.toFixed(1)}
- Traction: ${memo.companyScorecard.traction.toFixed(1)}
- Competition: ${memo.companyScorecard.competition.toFixed(1)}
- Fund Fit: ${memo.fundFit.score.toFixed(1)}

## Founders
${research.founders.map(f => `- ${f.name} (${f.role}): ${f.background}`).join("\n")}

## Funding
- Total Raised: ${research.funding.totalRaised}
- Last Round: ${research.funding.lastRound || "N/A"}
- Investors: ${research.funding.investors.join(", ")}

## Company Overview
${memo.sections.companySummary}

## Competitive Landscape
${memo.sections.competitiveLandscape}

## Thesis Alignment
${memo.sections.thesisAlignment}

## Risks
${memo.sections.risksAndFlaws}

## Tags
${memo.tags.join(", ")}
`;

  return `Create an infographic version of this investment memo in LANDSCAPE format:

${memoContent}

Generate a visually appealing, professional infographic image in landscape orientation that captures the key information from this memo.`;
}
