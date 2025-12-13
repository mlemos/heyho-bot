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
import { getStrategicPartners } from "../config/strategic-partners";
import { formatFundThesisContext } from "../config/fund-thesis";

// ===========================================
// Types
// ===========================================

export type ResearchArea = "basics" | "founders" | "funding" | "product" | "competitive" | "news";

export interface ResearchProgress {
  area: ResearchArea;
  status: "pending" | "in_progress" | "completed" | "error";
  result?: string;
  error?: string;
}

export interface ParallelResearchResults {
  basics: string;
  founders: string;
  funding: string;
  product: string;
  competitive: string;
  news: string;
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

export async function researchCompanyBasics(companyName: string, fileContext?: string): Promise<string> {
  const contextPrefix = buildContextPrefix(fileContext);
  const { text } = await generateText({
    model: google("gemini-3-pro-preview"),
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    stopWhen: stepCountIs(5),
    prompt: `${contextPrefix}Search for basic information about "${companyName}" company:
- What does the company do? (one paragraph description)
- What industry/sector are they in?
- What stage are they at? (pre-seed, seed, Series A, etc.)
- Where are they headquartered?
- What is their website?

Be thorough and cite specific facts.`,
  });
  return text;
}

export async function researchFounders(companyName: string, fileContext?: string): Promise<string> {
  const contextPrefix = buildContextPrefix(fileContext);
  const { text } = await generateText({
    model: google("gemini-3-pro-preview"),
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    stopWhen: stepCountIs(5),
    prompt: `${contextPrefix}Search for founder information about "${companyName}" company:
- Who are the founders and co-founders?
- What are their roles/titles?
- What is their professional background? (previous companies, education)
- Any notable achievements or credentials?

Focus on finding specific names and verifiable background info.`,
  });
  return text;
}

export async function researchFunding(companyName: string, fileContext?: string): Promise<string> {
  const contextPrefix = buildContextPrefix(fileContext);
  const { text } = await generateText({
    model: google("gemini-3-pro-preview"),
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    stopWhen: stepCountIs(5),
    prompt: `${contextPrefix}Search for funding information about "${companyName}" company:
- How much total funding have they raised?
- What was their most recent funding round?
- When did the last round close?
- Who are their investors? (VCs, angels, strategics)
- Any notable investors or lead investors?

Look for specific dollar amounts and investor names.`,
  });
  return text;
}

export async function researchProduct(companyName: string, fileContext?: string): Promise<string> {
  const contextPrefix = buildContextPrefix(fileContext);
  const { text } = await generateText({
    model: google("gemini-3-pro-preview"),
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    stopWhen: stepCountIs(5),
    prompt: `${contextPrefix}Search for product and traction information about "${companyName}" company:
- What is their main product or service?
- What technology do they use or build?
- Who are their customers/users?
- Any metrics on traction? (users, revenue, growth)
- What problems do they solve?

Focus on product details and any available traction metrics.`,
  });
  return text;
}

export async function researchCompetitive(companyName: string, fileContext?: string): Promise<string> {
  const contextPrefix = buildContextPrefix(fileContext);
  const { text } = await generateText({
    model: google("gemini-3-pro-preview"),
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    stopWhen: stepCountIs(5),
    prompt: `${contextPrefix}Search for competitive landscape information about "${companyName}" company:
- Who are their main competitors?
- How do they differentiate themselves?
- What is the market size/opportunity?
- What are their competitive advantages or moats?

Identify specific competitor names and differentiation points.`,
  });
  return text;
}

export async function researchNews(companyName: string, fileContext?: string): Promise<string> {
  const contextPrefix = buildContextPrefix(fileContext);
  const { text } = await generateText({
    model: google("gemini-3-pro-preview"),
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    stopWhen: stepCountIs(5),
    prompt: `${contextPrefix}Search for recent news and momentum about "${companyName}" company:
- Any recent news articles or press releases?
- Any product launches or major announcements?
- Any partnerships or customer wins?
- Any awards or recognition?
- Any hiring activity or expansion?

Focus on news from the last 6-12 months.`,
  });
  return text;
}

// ===========================================
// Parallel Research Orchestration
// ===========================================

export async function runParallelResearch(
  companyName: string,
  onProgress?: (area: ResearchArea, status: ResearchProgress["status"]) => void,
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
        onProgress?.(area, "completed");
        return { area, result, error: null };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        onProgress?.(area, "error");
        return { area, result: "", error: errorMsg };
      }
    })
  );

  const aggregated: ParallelResearchResults = {
    basics: "",
    founders: "",
    funding: "",
    product: "",
    competitive: "",
    news: "",
  };

  results.forEach(({ area, result }) => {
    aggregated[area] = result || "";
  });

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
    model: google("gemini-3-pro-preview"),
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
  research: CompanyResearch
): Promise<InvestmentMemo> {
  const strategicPartners = getStrategicPartners();
  const partnersContext = formatStrategicPartnersContext(strategicPartners);
  const fundThesisContext = formatFundThesisContext();

  const { object } = await generateObject({
    model: google("gemini-3-pro-preview"),
    schema: InvestmentMemoSchema,
    prompt: `Generate a professional investment memo for "${companyName}" based on this research:

${JSON.stringify(research, null, 2)}

${fundThesisContext}

## Strategic Partners
The fund has the following strategic partners:

${partnersContext}

---

Create a comprehensive memo with THREE SEPARATE ANALYSES:

## 1. EXECUTIVE SUMMARY
- 2-3 sentence summary of the opportunity

## 2. DETAILED SECTIONS
   - Company Summary
   - Founder Profiles
   - Investor Analysis
   - Funding History
   - Momentum Analysis
   - Competitive Landscape
   - Thesis Alignment
   - Strategic Synergies
   - Risks and Flaws

## 3. COMPANY SCORECARD (Objective company quality - independent of our fund)
Rate 0.0-10.0 for each (use one decimal place, e.g., 7.5):
- **Team**: Quality of founding team and leadership
- **Market**: Market size and opportunity
- **Product**: Product quality and differentiation
- **Traction**: Current traction and growth metrics
- **Competition**: Competitive position and moat
- **Overall**: Overall company score

## 4. FUND FIT (How well this matches OUR fund's thesis)
- **Score**: Overall fit with our fund (0.0-10.0, use one decimal place)
- **Stage fit**: perfect/good/acceptable/outside
- **Sector fit**: core/adjacent/exploratory/outside
- **Geography fit**: target/acceptable/challenging
- **Check size fit**: ideal/stretch/too_small/too_large
- **Rationale**: Why this is/isn't a good fit for our fund
- **Aligned theses**: Which of our investment theses does this align with?
- **Concerns**: Any concerns about fit

## 5. PARTNER FIT (How well this aligns with our strategic partners)
- Overall fit level (excellent/good/moderate/limited)
- Overall fit score (0.0-10.0, use one decimal place)
- Primary category for this opportunity
- Secondary categories
- For EACH strategic partner (${strategicPartners.map((p) => p.name).join(", ")}):
  - Match level (high/medium/low/none)
  - Match score (0.0-10.0, use one decimal place)
  - Which specific interests match
  - Which specific markets overlap
  - Rationale for the match
  - Potential synergy opportunities
- Top 3 partner collaboration opportunities
- Strategic narrative explaining the overall fit

## 6. ONE-LINER
- Max 15 words pitch

## 7. TAGS
- Categorization tags (e.g., "AI", "B2B", "Seed", etc.)

Be thorough but concise. Keep the three analyses (Company, Fund Fit, Partner Fit) clearly separate.`,
  });

  return object;
}
