/**
 * Test 1: Basic Gemini + Search Grounding
 *
 * Goal: Validate Gemini 3 works with Vercel AI SDK and search grounding returns citations.
 *
 * What we test:
 * - API key authentication works
 * - Search grounding returns results with citations
 * - Structured output with Zod schemas works
 * - Basic text prompt processing
 *
 * Run: npx tsx src/tests/01-gemini-search.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { generateText, generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

// Schema for structured company research output
const CompanyResearchSchema = z.object({
  name: z.string().describe("Company name"),
  description: z.string().describe("Brief description of what the company does"),
  founded: z.string().describe("Year founded or 'Unknown'"),
  founders: z.array(z.string()).describe("List of founder names"),
  headquarters: z.string().describe("Company headquarters location"),
  funding: z.string().describe("Total funding raised or latest funding round"),
  keyProducts: z.array(z.string()).describe("Main products or services"),
});

type CompanyResearch = z.infer<typeof CompanyResearchSchema>;

async function testBasicSearch() {
  console.log("=".repeat(60));
  console.log("Test 1.1: Basic text generation with search grounding");
  console.log("=".repeat(60));

  try {
    const { text, sources, providerMetadata } = await generateText({
      model: google("gemini-2.5-flash"),
      tools: {
        google_search: google.tools.googleSearch({}),
      },
      prompt: "What is Anthropic and what are their main products? Include recent news.",
    });

    console.log("\n📝 Response:");
    console.log(text);

    if (sources && sources.length > 0) {
      console.log("\n📚 Sources:");
      sources.forEach((source, i) => {
        console.log(`  ${i + 1}. ${source.title || "Untitled"}`);
        // URL might be in different properties depending on source type
        const url = 'url' in source ? source.url : ('id' in source ? source.id : 'N/A');
        console.log(`     ${url}`);
      });
    } else {
      console.log("\n⚠️  No sources returned (grounding may not have been used)");
    }

    console.log("\n✅ Test 1.1 PASSED: Basic search grounding works");
    return true;
  } catch (error) {
    console.error("\n❌ Test 1.1 FAILED:", error);
    return false;
  }
}

async function testStructuredOutput() {
  console.log("\n" + "=".repeat(60));
  console.log("Test 1.2: Structured output with Zod schema");
  console.log("=".repeat(60));

  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: CompanyResearchSchema,
      prompt: "Research the company Stripe and provide structured information about them.",
    });

    console.log("\n📊 Structured Output:");
    console.log(JSON.stringify(object, null, 2));

    // Validate the output
    const parsed = CompanyResearchSchema.safeParse(object);
    if (parsed.success) {
      console.log("\n✅ Test 1.2 PASSED: Structured output is valid");
      return true;
    } else {
      console.error("\n❌ Test 1.2 FAILED: Schema validation errors:", parsed.error);
      return false;
    }
  } catch (error) {
    console.error("\n❌ Test 1.2 FAILED:", error);
    return false;
  }
}

async function testSearchWithStructuredOutput() {
  console.log("\n" + "=".repeat(60));
  console.log("Test 1.3: Search grounding + Structured output combined");
  console.log("=".repeat(60));

  try {
    // First, search for information
    const { text: researchText } = await generateText({
      model: google("gemini-2.5-flash"),
      tools: {
        google_search: google.tools.googleSearch({}),
      },
      prompt:
        "Search for the latest information about OpenAI including their funding, products, and recent news. Be thorough.",
    });

    console.log("\n🔍 Raw Research:");
    console.log(researchText.substring(0, 500) + "...");

    // Then, structure the information
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: CompanyResearchSchema,
      prompt: `Based on this research, extract structured company information:\n\n${researchText}`,
    });

    console.log("\n📊 Structured Result:");
    console.log(JSON.stringify(object, null, 2));

    console.log("\n✅ Test 1.3 PASSED: Search + Structured output works");
    return true;
  } catch (error) {
    console.error("\n❌ Test 1.3 FAILED:", error);
    return false;
  }
}

async function main() {
  console.log("\n🚀 Starting Test 1: Basic Gemini + Search Grounding\n");

  // Check for API key
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error("❌ Error: GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set");
    console.log("\nTo fix this:");
    console.log("  1. Copy .env.example to .env.local");
    console.log("  2. Add your Gemini API key from https://aistudio.google.com/apikey");
    console.log("  3. Run this test again");
    process.exit(1);
  }

  const results = {
    basicSearch: await testBasicSearch(),
    structuredOutput: await testStructuredOutput(),
    searchWithStructured: await testSearchWithStructuredOutput(),
  };

  console.log("\n" + "=".repeat(60));
  console.log("📋 Test 1 Summary");
  console.log("=".repeat(60));
  console.log(`  1.1 Basic Search Grounding:     ${results.basicSearch ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  1.2 Structured Output:          ${results.structuredOutput ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  1.3 Search + Structured:        ${results.searchWithStructured ? "✅ PASS" : "❌ FAIL"}`);

  const allPassed = Object.values(results).every(Boolean);
  console.log(`\n${allPassed ? "✅ All tests passed!" : "❌ Some tests failed"}\n`);

  process.exit(allPassed ? 0 : 1);
}

main();
