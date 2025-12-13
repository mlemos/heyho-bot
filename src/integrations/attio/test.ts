/**
 * Test script for Attio API integration
 *
 * Usage:
 *   npx tsx src/integrations/attio/test.ts                    # Test with mock data
 *   npx tsx src/integrations/attio/test.ts "Company Name"     # Test with specific company
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import {
  lookupCompany,
  upsertCompany,
  createInvestmentOpportunity,
  attachOpportunityNote,
  isAttioConfigured,
} from "./client";
import type { CompanyResearch, InvestmentMemo } from "@/src/types/schemas";

const TEST_COMPANY = process.argv[2] || "Test Company Inc";

// Mock research data for testing
function createMockResearch(companyName: string): CompanyResearch {
  return {
    company: {
      name: companyName,
      website: "https://testcompany.example.com",
      description: "A test company for API integration testing",
      industry: "Technology",
      stage: "Series A",
      location: "San Francisco, CA",
    },
    founders: [
      {
        name: "Jane Doe",
        role: "CEO",
        linkedIn: "https://linkedin.com/in/janedoe",
        background: "Former Google engineer with 10 years experience",
      },
    ],
    funding: {
      totalRaised: "$10M",
      lastRound: "Series A",
      lastRoundDate: "2024-01",
      investors: ["Test Ventures", "Example Capital"],
    },
    metrics: {
      employees: "25-50",
      revenue: "$2M ARR",
      growth: "3x YoY",
    },
    market: {
      size: "$10B",
      trends: ["AI adoption", "Remote work"],
      competitors: ["Competitor A", "Competitor B"],
    },
    news: [
      {
        title: "Test Company raises Series A",
        date: "2024-01-15",
        source: "TechCrunch",
        summary: "Test Company announced their Series A funding round.",
      },
    ],
  };
}

// Mock memo data for testing
function createMockMemo(companyName: string): InvestmentMemo {
  return {
    companyScorecard: {
      overall: 7.5,
      team: 8.0,
      market: 7.0,
      product: 7.5,
      traction: 7.0,
      competition: 8.0,
    },
    fundFit: {
      score: 7.0,
      stage: "Series A",
      sector: "Technology",
      geography: "US",
      checkSize: "$1-2M",
      rationale: "Good fit for our portfolio focus on early-stage tech.",
      concerns: ["Limited traction data"],
    },
    partnerFit: {
      overallFitScore: 7.5,
      topPartners: [
        {
          name: "Partner A",
          fitScore: 8.0,
          reasons: ["Deep tech background", "Network in enterprise"],
        },
      ],
    },
    oneLiner: `${companyName} is building next-gen technology solutions.`,
    summary: "A promising early-stage company with strong founding team.",
    sections: {
      companySummary: "Test Company is an innovative technology company...",
      founderProfiles: "The founding team has strong backgrounds...",
      investorAnalysis: "Current investors include reputable firms...",
      fundingHistory: "The company has raised $10M to date...",
      momentumAnalysis: "Strong growth trajectory with 3x YoY...",
      competitiveLandscape: "Market has several players but room for...",
      thesisAlignment: "Aligns well with our investment thesis...",
      strategicSynergies: "Potential synergies with portfolio companies...",
      risksAndFlaws: "Key risks include market timing and competition...",
    },
    tags: ["AI", "SaaS", "Enterprise"],
  };
}

async function runTest() {
  console.log("=== Attio Integration Test ===\n");

  // Check configuration
  if (!isAttioConfigured()) {
    console.error("❌ ATTIO_API_KEY is not set in environment");
    process.exit(1);
  }
  console.log("✓ Attio API key is configured\n");

  const research = createMockResearch(TEST_COMPANY);
  const memo = createMockMemo(TEST_COMPANY);

  try {
    // Step 1: Lookup company
    console.log(`1. Looking up company: "${TEST_COMPANY}"...`);
    const lookupResult = await lookupCompany(TEST_COMPANY);
    if (lookupResult.exists) {
      console.log(`   ✓ Found existing company: ${lookupResult.recordId}`);
      console.log(`   URL: ${lookupResult.webUrl}`);
    } else {
      console.log("   ○ Company not found (will be created)");
    }
    console.log("");

    // Step 2: Upsert company
    console.log("2. Upserting company...");
    const companyResult = await upsertCompany(research);
    console.log(
      `   ✓ Company ${companyResult.isNew ? "created" : "updated"}: ${companyResult.recordId}`
    );
    console.log(`   URL: ${companyResult.webUrl}`);
    console.log("");

    // Step 3: Create Investment Opportunity
    console.log("3. Creating Investment Opportunity...");
    const opportunityResult = await createInvestmentOpportunity(
      companyResult.recordId,
      TEST_COMPANY,
      memo,
      research
    );
    console.log(`   ✓ Opportunity created: ${opportunityResult.recordId}`);
    console.log(`   URL: ${opportunityResult.webUrl}`);
    console.log("");

    // Step 4: Attach note
    console.log("4. Attaching investment memo as note...");
    const noteResult = await attachOpportunityNote(opportunityResult.recordId, memo);
    console.log(`   ✓ Note attached: ${noteResult.noteId}`);
    console.log("");

    console.log("=== Test Complete ===");
    console.log(`\nView opportunity: ${opportunityResult.webUrl}`);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

runTest();
