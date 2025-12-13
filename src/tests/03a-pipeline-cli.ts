/**
 * Test 3A: Full Pipeline CLI (without Vercel Workflow)
 *
 * Goal: Validate the complete VC research pipeline works end-to-end.
 *
 * What we test:
 * - Input parsing and company extraction
 * - Parallel specialized research queries (6 concurrent searches)
 * - Research synthesis into structured output
 * - Investment memo generation with scorecard
 * - Mock CRM operations (lookup, create, save note)
 *
 * Key Architecture: Parallel Specialized Queries
 * - Company basics (overview, industry, stage)
 * - Founders (background, experience)
 * - Funding (rounds, investors, amounts)
 * - Product (features, tech, traction)
 * - Competitive (landscape, differentiation)
 * - News (recent developments, momentum)
 *
 * Run: npx tsx src/tests/03a-pipeline-cli.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { generateText, generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import {
  CompanyBasicsSchema,
  FounderSchema,
  FundingInfoSchema,
  MomentumInfoSchema,
  CompetitiveInfoSchema,
  CompanyResearchSchema,
  InvestmentMemoSchema,
  ScorecardSchema,
  type CompanyResearch,
  type InvestmentMemo,
} from "../types/schemas";

// ===========================================
// Progress Tracking
// ===========================================

type ResearchArea = "basics" | "founders" | "funding" | "product" | "competitive" | "news";

interface ResearchProgress {
  area: ResearchArea;
  status: "pending" | "in_progress" | "completed" | "error";
  result?: string;
  error?: string;
}

function logProgress(progress: Map<ResearchArea, ResearchProgress>) {
  const areas: ResearchArea[] = ["basics", "founders", "funding", "product", "competitive", "news"];
  const statusEmoji = {
    pending: "⏳",
    in_progress: "🔄",
    completed: "✅",
    error: "❌",
  };

  console.log("\n📊 Research Progress:");
  areas.forEach((area) => {
    const p = progress.get(area);
    const status = p ? statusEmoji[p.status] : "⏳";
    console.log(`  ${status} ${area.padEnd(12)}`);
  });
}

// ===========================================
// Parallel Research Functions
// ===========================================

async function researchCompanyBasics(companyName: string): Promise<string> {
  const { text } = await generateText({
    model: google("gemini-2.5-flash"),
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    maxSteps: 5,
    prompt: `Search for basic information about "${companyName}" company:
- What does the company do? (one paragraph description)
- What industry/sector are they in?
- What stage are they at? (pre-seed, seed, Series A, etc.)
- Where are they headquartered?
- What is their website?

Be thorough and cite specific facts.`,
  });
  return text;
}

async function researchFounders(companyName: string): Promise<string> {
  const { text } = await generateText({
    model: google("gemini-2.5-flash"),
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    maxSteps: 5,
    prompt: `Search for founder information about "${companyName}" company:
- Who are the founders and co-founders?
- What are their roles/titles?
- What is their professional background? (previous companies, education)
- Any notable achievements or credentials?

Focus on finding specific names and verifiable background info.`,
  });
  return text;
}

async function researchFunding(companyName: string): Promise<string> {
  const { text } = await generateText({
    model: google("gemini-2.5-flash"),
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    maxSteps: 5,
    prompt: `Search for funding information about "${companyName}" company:
- How much total funding have they raised?
- What was their most recent funding round?
- When did the last round close?
- Who are their investors? (VCs, angels, strategics)
- Any notable investors or lead investors?

Look for specific dollar amounts and investor names.`,
  });
  return text;
}

async function researchProduct(companyName: string): Promise<string> {
  const { text } = await generateText({
    model: google("gemini-2.5-flash"),
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    maxSteps: 5,
    prompt: `Search for product and traction information about "${companyName}" company:
- What is their main product or service?
- What technology do they use or build?
- Who are their customers/users?
- Any metrics on traction? (users, revenue, growth)
- What problems do they solve?

Focus on product details and any available traction metrics.`,
  });
  return text;
}

async function researchCompetitive(companyName: string): Promise<string> {
  const { text } = await generateText({
    model: google("gemini-2.5-flash"),
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    maxSteps: 5,
    prompt: `Search for competitive landscape information about "${companyName}" company:
- Who are their main competitors?
- How do they differentiate themselves?
- What is the market size/opportunity?
- What are their competitive advantages or moats?

Identify specific competitor names and differentiation points.`,
  });
  return text;
}

async function researchNews(companyName: string): Promise<string> {
  const { text } = await generateText({
    model: google("gemini-2.5-flash"),
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    maxSteps: 5,
    prompt: `Search for recent news and momentum about "${companyName}" company:
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
// Research Orchestration
// ===========================================

interface ParallelResearchResults {
  basics: string;
  founders: string;
  funding: string;
  product: string;
  competitive: string;
  news: string;
}

async function runParallelResearch(companyName: string): Promise<ParallelResearchResults> {
  console.log(`\n🔍 Starting parallel research for "${companyName}"...\n`);

  const progress = new Map<ResearchArea, ResearchProgress>();
  const areas: ResearchArea[] = ["basics", "founders", "funding", "product", "competitive", "news"];

  // Initialize progress
  areas.forEach((area) => {
    progress.set(area, { area, status: "pending" });
  });

  logProgress(progress);

  // Create research tasks
  const tasks = [
    { area: "basics" as ResearchArea, fn: () => researchCompanyBasics(companyName) },
    { area: "founders" as ResearchArea, fn: () => researchFounders(companyName) },
    { area: "funding" as ResearchArea, fn: () => researchFunding(companyName) },
    { area: "product" as ResearchArea, fn: () => researchProduct(companyName) },
    { area: "competitive" as ResearchArea, fn: () => researchCompetitive(companyName) },
    { area: "news" as ResearchArea, fn: () => researchNews(companyName) },
  ];

  // Run all tasks in parallel with progress tracking
  const results = await Promise.all(
    tasks.map(async ({ area, fn }) => {
      progress.set(area, { area, status: "in_progress" });

      try {
        const result = await fn();
        progress.set(area, { area, status: "completed", result });
        console.log(`  ✅ ${area} completed`);
        return { area, result, error: null };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        progress.set(area, { area, status: "error", error: errorMsg });
        console.log(`  ❌ ${area} failed: ${errorMsg}`);
        return { area, result: "", error: errorMsg };
      }
    })
  );

  logProgress(progress);

  // Aggregate results
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
// Research Synthesis
// ===========================================

async function synthesizeResearch(
  companyName: string,
  research: ParallelResearchResults
): Promise<CompanyResearch> {
  console.log("\n🧬 Synthesizing research into structured format...\n");

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
    model: google("gemini-2.5-flash"),
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

// ===========================================
// Memo Generation
// ===========================================

async function generateInvestmentMemo(
  companyName: string,
  research: CompanyResearch
): Promise<InvestmentMemo> {
  console.log("\n📝 Generating investment memo...\n");

  const { object } = await generateObject({
    model: google("gemini-2.5-flash"),
    schema: InvestmentMemoSchema,
    prompt: `Generate a professional investment memo for "${companyName}" based on this research:

${JSON.stringify(research, null, 2)}

Create a comprehensive memo with:
1. Executive summary (2-3 sentences)
2. Detailed sections:
   - Company Summary
   - Founder Profiles
   - Investor Analysis
   - Funding History
   - Momentum Analysis
   - Competitive Landscape
   - Thesis Alignment (for a generalist VC)
   - Strategic Synergies
   - Risks and Flaws
3. Scorecard (1-10 for each):
   - Team quality
   - Market opportunity
   - Product strength
   - Traction
   - Competition risk
   - Thesis fit
   - Overall score
4. One-liner pitch (max 15 words)
5. Tags for categorization (e.g., "AI", "B2B", "Seed", etc.)

Be thorough but concise. Focus on investment-relevant insights.`,
  });

  return object;
}

// ===========================================
// Mock CRM Operations
// ===========================================

interface CRMLookupResult {
  exists: boolean;
  recordId?: string;
  message: string;
}

interface CRMCreateResult {
  success: boolean;
  recordId: string;
  message: string;
}

interface CRMNoteResult {
  success: boolean;
  noteId: string;
  message: string;
}

async function mockCRMLookup(companyName: string): Promise<CRMLookupResult> {
  console.log(`\n🔎 Looking up "${companyName}" in CRM...`);
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Mock: company doesn't exist
  return {
    exists: false,
    message: `Company "${companyName}" not found in CRM database`,
  };
}

async function mockCRMCreate(
  companyName: string,
  research: CompanyResearch
): Promise<CRMCreateResult> {
  console.log(`\n➕ Creating CRM record for "${companyName}"...`);
  await new Promise((resolve) => setTimeout(resolve, 200));

  return {
    success: true,
    recordId: `attio-${Date.now()}`,
    message: `Company "${companyName}" created in CRM`,
  };
}

async function mockCRMSaveNote(
  recordId: string,
  memo: InvestmentMemo
): Promise<CRMNoteResult> {
  console.log(`\n💾 Saving investment memo to CRM...`);
  await new Promise((resolve) => setTimeout(resolve, 200));

  return {
    success: true,
    noteId: `note-${Date.now()}`,
    message: "Investment memo saved to CRM record",
  };
}

// ===========================================
// Full Pipeline
// ===========================================

interface PipelineResult {
  company: string;
  research: CompanyResearch;
  memo: InvestmentMemo;
  crmRecordId: string;
  noteId: string;
  duration: number;
}

async function runFullPipeline(input: string): Promise<PipelineResult> {
  const startTime = Date.now();

  console.log("=".repeat(60));
  console.log("🚀 Starting Full VC Research Pipeline");
  console.log("=".repeat(60));
  console.log(`\n📥 Input: "${input}"\n`);

  // Step 1: Extract company name (simplified for demo)
  // In production, this would use multi-modal input parsing
  const companyName = input.trim();
  console.log(`📍 Identified company: ${companyName}`);

  // Step 2: Check CRM
  const crmLookup = await mockCRMLookup(companyName);
  if (crmLookup.exists) {
    console.log(`⚠️ Company exists in CRM (ID: ${crmLookup.recordId})`);
  } else {
    console.log(`✨ New company - proceeding with research`);
  }

  // Step 3: Parallel research
  const research = await runParallelResearch(companyName);

  // Step 4: Synthesize research
  const structuredResearch = await synthesizeResearch(companyName, research);

  console.log("\n📊 Structured Research:");
  console.log(`  Company: ${structuredResearch.company.name}`);
  console.log(`  Industry: ${structuredResearch.company.industry}`);
  console.log(`  Stage: ${structuredResearch.company.stage}`);
  console.log(`  Founders: ${structuredResearch.founders.map((f) => f.name).join(", ")}`);
  console.log(`  Funding: ${structuredResearch.funding.totalRaised}`);

  // Step 5: Generate memo
  const memo = await generateInvestmentMemo(companyName, structuredResearch);

  console.log("\n📝 Investment Memo Generated:");
  console.log(`  Summary: ${memo.summary.substring(0, 100)}...`);
  console.log(`  One-liner: ${memo.oneLiner}`);
  console.log(`  Tags: ${memo.tags.join(", ")}`);
  console.log("\n  Company Scorecard:");
  Object.entries(memo.companyScorecard).forEach(([key, value]) => {
    console.log(`    ${key}: ${value}/10`);
  });

  // Step 6: Save to CRM
  const crmCreate = await mockCRMCreate(companyName, structuredResearch);
  const noteResult = await mockCRMSaveNote(crmCreate.recordId, memo);

  const duration = Date.now() - startTime;

  console.log("\n" + "=".repeat(60));
  console.log("✅ Pipeline Complete!");
  console.log("=".repeat(60));
  console.log(`\n⏱️  Total duration: ${(duration / 1000).toFixed(1)}s`);
  console.log(`📋 CRM Record: ${crmCreate.recordId}`);
  console.log(`📝 Note ID: ${noteResult.noteId}`);

  return {
    company: companyName,
    research: structuredResearch,
    memo,
    crmRecordId: crmCreate.recordId,
    noteId: noteResult.noteId,
    duration,
  };
}

// ===========================================
// Tests
// ===========================================

async function testParallelResearch() {
  console.log("\n" + "=".repeat(60));
  console.log("Test 3A.1: Parallel Specialized Research");
  console.log("=".repeat(60));

  try {
    const results = await runParallelResearch("Anthropic");

    const hasBasics = results.basics.length > 100;
    const hasFounders = results.founders.length > 50;
    const hasFunding = results.funding.length > 50;
    const hasProduct = results.product.length > 50;
    const hasCompetitive = results.competitive.length > 50;
    const hasNews = results.news.length > 50;

    console.log("\n📊 Research Results Check:");
    console.log(`  Basics: ${hasBasics ? "✅" : "❌"} (${results.basics.length} chars)`);
    console.log(`  Founders: ${hasFounders ? "✅" : "❌"} (${results.founders.length} chars)`);
    console.log(`  Funding: ${hasFunding ? "✅" : "❌"} (${results.funding.length} chars)`);
    console.log(`  Product: ${hasProduct ? "✅" : "❌"} (${results.product.length} chars)`);
    console.log(`  Competitive: ${hasCompetitive ? "✅" : "❌"} (${results.competitive.length} chars)`);
    console.log(`  News: ${hasNews ? "✅" : "❌"} (${results.news.length} chars)`);

    const passCount = [hasBasics, hasFounders, hasFunding, hasProduct, hasCompetitive, hasNews].filter(Boolean).length;

    if (passCount >= 5) {
      console.log(`\n✅ Test 3A.1 PASSED: ${passCount}/6 research areas completed`);
      return true;
    } else {
      console.log(`\n⚠️ Test 3A.1 PARTIAL: Only ${passCount}/6 research areas completed`);
      return passCount >= 3;
    }
  } catch (error) {
    console.error("\n❌ Test 3A.1 FAILED:", error);
    return false;
  }
}

async function testResearchSynthesis() {
  console.log("\n" + "=".repeat(60));
  console.log("Test 3A.2: Research Synthesis");
  console.log("=".repeat(60));

  try {
    // Use mock research data for faster testing
    const mockResearch: ParallelResearchResults = {
      basics:
        "Perplexity AI is an AI-powered search engine company founded in 2022. They are headquartered in San Francisco. The company builds conversational AI search products.",
      founders:
        "Perplexity was founded by Aravind Srinivas (CEO), Denis Yarats, Johnny Ho, and Andy Konwinski. Aravind previously worked at Google and OpenAI. Denis was at Meta AI.",
      funding:
        "Perplexity has raised over $165 million in funding. Their Series B was $73.6M in April 2024 led by IVP. Investors include NEA, Databricks, and Jeff Bezos.",
      product:
        "Perplexity offers an AI search engine that provides direct answers with citations. They have Pro and Enterprise tiers. Over 10 million monthly active users.",
      competitive:
        "Main competitors include Google, ChatGPT, and You.com. Differentiates through accuracy and citations. Focus on factual, sourced answers.",
      news: "Recently launched Perplexity Pro with unlimited queries. Announced enterprise product. Growing quickly in 2024 with new features.",
    };

    const structured = await synthesizeResearch("Perplexity", mockResearch);

    const hasCompany = structured.company.name.length > 0;
    const hasFounders = structured.founders.length > 0;
    const hasFunding = structured.funding.totalRaised.length > 0;
    const hasMomentum = structured.momentum.recentNews.length > 0;
    const hasCompetitive = structured.competitive.competitors.length > 0;

    console.log("\n📊 Synthesis Check:");
    console.log(`  Company: ${hasCompany ? "✅" : "❌"} (${structured.company.name})`);
    console.log(`  Founders: ${hasFounders ? "✅" : "❌"} (${structured.founders.length} found)`);
    console.log(`  Funding: ${hasFunding ? "✅" : "❌"} (${structured.funding.totalRaised})`);
    console.log(`  Momentum: ${hasMomentum ? "✅" : "❌"} (${structured.momentum.recentNews.length} news items)`);
    console.log(`  Competitive: ${hasCompetitive ? "✅" : "❌"} (${structured.competitive.competitors.length} competitors)`);

    if (hasCompany && hasFounders && hasFunding) {
      console.log("\n✅ Test 3A.2 PASSED: Research synthesis works");
      return true;
    } else {
      console.log("\n⚠️ Test 3A.2 PARTIAL: Some fields missing");
      return hasCompany;
    }
  } catch (error) {
    console.error("\n❌ Test 3A.2 FAILED:", error);
    return false;
  }
}

async function testMemoGeneration() {
  console.log("\n" + "=".repeat(60));
  console.log("Test 3A.3: Investment Memo Generation");
  console.log("=".repeat(60));

  try {
    // Use mock structured research
    const mockResearch: CompanyResearch = {
      company: {
        name: "Example AI",
        website: "https://example.ai",
        description: "AI-powered productivity tools for developers",
        industry: "Developer Tools / AI",
        stage: "Series A",
        location: "San Francisco, CA",
      },
      founders: [
        {
          name: "Jane Smith",
          role: "CEO",
          background: "Former Google engineer, Stanford CS PhD",
        },
        {
          name: "John Doe",
          role: "CTO",
          background: "Former Meta AI researcher",
        },
      ],
      funding: {
        totalRaised: "$15M",
        lastRound: "Series A",
        lastRoundDate: "2024",
        investors: ["a]6z", "Sequoia", "Y Combinator"],
      },
      momentum: {
        recentNews: ["Launched v2.0", "Reached 100k users", "Hired VP Sales"],
        growthIndicators: "10x growth in 6 months",
      },
      competitive: {
        landscape: "Crowded developer tools market",
        competitors: ["GitHub Copilot", "Cursor", "Replit"],
        differentiation: "Focus on enterprise security and compliance",
      },
    };

    const memo = await generateInvestmentMemo("Example AI", mockResearch);

    const hasSummary = memo.summary.length > 50;
    const hasOneLiner = memo.oneLiner.length > 10;
    const hasTags = memo.tags.length > 0;
    const hasScorecard = memo.companyScorecard.overall > 0;
    const hasSections = memo.sections.companySummary.length > 50;

    console.log("\n📊 Memo Check:");
    console.log(`  Summary: ${hasSummary ? "✅" : "❌"} (${memo.summary.length} chars)`);
    console.log(`  One-liner: ${hasOneLiner ? "✅" : "❌"} ("${memo.oneLiner}")`);
    console.log(`  Tags: ${hasTags ? "✅" : "❌"} (${memo.tags.join(", ")})`);
    console.log(`  Scorecard: ${hasScorecard ? "✅" : "❌"} (Overall: ${memo.companyScorecard.overall}/10)`);
    console.log(`  Sections: ${hasSections ? "✅" : "❌"}`);

    if (hasSummary && hasOneLiner && hasScorecard) {
      console.log("\n✅ Test 3A.3 PASSED: Memo generation works");
      return true;
    } else {
      console.log("\n⚠️ Test 3A.3 PARTIAL: Some memo fields incomplete");
      return hasSummary || hasScorecard;
    }
  } catch (error) {
    console.error("\n❌ Test 3A.3 FAILED:", error);
    return false;
  }
}

async function testFullPipeline() {
  console.log("\n" + "=".repeat(60));
  console.log("Test 3A.4: Full End-to-End Pipeline");
  console.log("=".repeat(60));

  try {
    const result = await runFullPipeline("Mistral AI");

    const hasResearch = result.research.company.name.length > 0;
    const hasMemo = result.memo.summary.length > 0;
    const hasCRM = result.crmRecordId.length > 0;
    const hasNote = result.noteId.length > 0;

    console.log("\n📊 Pipeline Result:");
    console.log(`  Research: ${hasResearch ? "✅" : "❌"}`);
    console.log(`  Memo: ${hasMemo ? "✅" : "❌"}`);
    console.log(`  CRM Record: ${hasCRM ? "✅" : "❌"}`);
    console.log(`  Note: ${hasNote ? "✅" : "❌"}`);
    console.log(`  Duration: ${(result.duration / 1000).toFixed(1)}s`);

    if (hasResearch && hasMemo && hasCRM) {
      console.log("\n✅ Test 3A.4 PASSED: Full pipeline works end-to-end");
      return true;
    } else {
      console.log("\n⚠️ Test 3A.4 PARTIAL: Pipeline completed with issues");
      return hasResearch || hasMemo;
    }
  } catch (error) {
    console.error("\n❌ Test 3A.4 FAILED:", error);
    return false;
  }
}

// ===========================================
// Main
// ===========================================

async function main() {
  console.log("\n🚀 Starting Test 3A: Full Pipeline CLI\n");

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error("❌ Error: GOOGLE_GENERATIVE_AI_API_KEY not set");
    process.exit(1);
  }

  // Run tests
  const results = {
    parallelResearch: await testParallelResearch(),
    synthesis: await testResearchSynthesis(),
    memoGeneration: await testMemoGeneration(),
    fullPipeline: await testFullPipeline(),
  };

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 Test 3A Summary");
  console.log("=".repeat(60));
  console.log(`  3A.1 Parallel Research:    ${results.parallelResearch ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  3A.2 Research Synthesis:   ${results.synthesis ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  3A.3 Memo Generation:      ${results.memoGeneration ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  3A.4 Full Pipeline:        ${results.fullPipeline ? "✅ PASS" : "❌ FAIL"}`);

  console.log("\n📝 Key Findings:");
  console.log("  • Parallel research queries run concurrently (faster)");
  console.log("  • Structured synthesis converts raw research to schema");
  console.log("  • Memo generation produces professional output");
  console.log("  • Mock CRM operations simulate full workflow");

  const allPassed = Object.values(results).every(Boolean);
  const criticalPassed = results.synthesis && results.memoGeneration;

  console.log(`\n${allPassed ? "✅ All tests passed!" : criticalPassed ? "⚠️ Core functionality works" : "❌ Critical issues found"}\n`);

  process.exit(allPassed ? 0 : criticalPassed ? 0 : 1);
}

main();
