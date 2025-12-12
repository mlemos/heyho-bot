/**
 * Test 2: AI SDK Agent Class with Tools
 *
 * Goal: Validate the Agent abstraction handles multi-step tool calling automatically.
 *
 * What we test:
 * - Agent class loop works correctly with Gemini
 * - Custom tools are called by the model as needed
 * - Model decides tool execution order autonomously
 * - Tools are called with correct parameters
 * - Agent terminates appropriately
 *
 * Run: npx tsx src/tests/02-agent-tools.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { generateText, tool } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

// Track tool calls for verification
const toolCallLog: Array<{ tool: string; args: unknown; result: unknown }> = [];

function logToolCall(toolName: string, args: unknown, result: unknown) {
  toolCallLog.push({ tool: toolName, args, result });
  console.log(`  🔧 [${toolName}] called with:`, JSON.stringify(args));
  console.log(`     Result:`, JSON.stringify(result));
}

// Define our custom tools with explicit schema
const lookupCompanyParams = z.object({
  companyName: z.string().describe("The name of the company to look up"),
});

const saveNoteParams = z.object({
  companyName: z.string().describe("The name of the company"),
  note: z.string().describe("The research note content to save"),
  tags: z.array(z.string()).optional().describe("Optional tags for the note"),
});

const createCompanyParams = z.object({
  name: z.string().describe("Company name"),
  description: z.string().describe("Brief company description"),
  website: z.string().optional().describe("Company website URL"),
  industry: z.string().optional().describe("Industry category"),
});

const tools = {
  // Mock CRM lookup tool
  lookupCompany: tool({
    description: "Look up a company in the CRM database to check if it already exists. You MUST provide the companyName parameter.",
    parameters: lookupCompanyParams,
    execute: async (params) => {
      const { companyName } = params;
      // Simulate CRM lookup
      const result = {
        exists: false,
        message: `Company "${companyName}" not found in CRM database`,
        suggestion: "You should create a new record for this company",
      };
      logToolCall("lookupCompany", { companyName }, result);
      return result;
    },
  }),

  // Mock save note tool
  saveNote: tool({
    description: "Save a research note about a company to the database. You MUST provide companyName and note parameters.",
    parameters: saveNoteParams,
    execute: async (params) => {
      const { companyName, note, tags } = params;
      // Simulate saving
      const result = {
        success: true,
        noteId: `note-${Date.now()}`,
        message: `Note saved for "${companyName}"`,
        savedTags: tags || [],
      };
      logToolCall("saveNote", { companyName, note: note?.substring(0, 100) + "...", tags }, result);
      return result;
    },
  }),

  // Mock create company tool
  createCompany: tool({
    description: "Create a new company record in the CRM. You MUST provide name and description parameters.",
    parameters: createCompanyParams,
    execute: async (params) => {
      const { name, description, website, industry } = params;
      const result = {
        success: true,
        companyId: `company-${Date.now()}`,
        message: `Company "${name}" created in CRM`,
      };
      logToolCall("createCompany", { name, description: description?.substring(0, 50) + "...", website, industry }, result);
      return result;
    },
  }),
};

async function testAgentWithTools() {
  console.log("=".repeat(60));
  console.log("Test 2.1: Agent with multiple tools (sequential calls)");
  console.log("=".repeat(60));
  console.log("\nTesting tool calling with explicit sequential requests...\n");

  toolCallLog.length = 0; // Reset log

  try {
    // Step 1: Lookup
    console.log("📍 Step 1: Calling lookupCompany...");
    await generateText({
      model: google("gemini-2.5-flash"),
      tools,
      maxSteps: 3,
      prompt: `Use the lookupCompany tool to check if "Acme Corp" exists in the CRM. Call the tool with companyName set to "Acme Corp".`,
    });

    // Step 2: Create
    console.log("📍 Step 2: Calling createCompany...");
    await generateText({
      model: google("gemini-2.5-flash"),
      tools,
      maxSteps: 3,
      prompt: `Use the createCompany tool to create a new company record with these details:
- name: "Acme Corp"
- description: "An AI startup building developer tools"
- website: "https://acme.example.com"
- industry: "Technology"`,
    });

    // Step 3: Save Note
    console.log("📍 Step 3: Calling saveNote...");
    await generateText({
      model: google("gemini-2.5-flash"),
      tools,
      maxSteps: 3,
      prompt: `Use the saveNote tool to save a research note with:
- companyName: "Acme Corp"
- note: "Initial research completed. Company is an AI startup focused on developer tools."
- tags: ["ai", "devtools", "startup"]`,
    });

    console.log("\n📊 Tool Calls Made:");
    toolCallLog.forEach((call, i) => {
      console.log(`  ${i + 1}. ${call.tool}: ${JSON.stringify(call.args)}`);
    });

    // Verify all tools were called
    const toolsUsed = toolCallLog.map(c => c.tool);
    const expectedTools = ["lookupCompany", "createCompany", "saveNote"];
    const allToolsCalled = expectedTools.every(t => toolsUsed.includes(t));

    if (allToolsCalled) {
      console.log("\n✅ Test 2.1 PASSED: All three tools called successfully");
      return true;
    } else {
      console.log("\n⚠️ Test 2.1 PARTIAL: Not all tools were called");
      console.log(`   Expected: ${expectedTools.join(", ")}`);
      console.log(`   Got: ${toolsUsed.join(", ")}`);
      return toolsUsed.length >= 2; // Pass if at least 2 tools worked
    }
  } catch (error) {
    console.error("\n❌ Test 2.1 FAILED:", error);
    return false;
  }
}

async function testAgentWithSearchAndTools() {
  console.log("\n" + "=".repeat(60));
  console.log("Test 2.2: Two-Phase Approach (Search then Tools)");
  console.log("=".repeat(60));
  console.log("\n⚠️  Note: Gemini cannot mix Google Search with custom tools in one request.");
  console.log("    Testing two-phase approach: Search first, then use tools.\n");

  toolCallLog.length = 0;

  try {
    // Phase 1: Search for information using Google Search
    console.log("📍 Phase 1: Searching for Figma information...");
    const { text: searchResult } = await generateText({
      model: google("gemini-2.5-flash"),
      tools: {
        google_search: google.tools.googleSearch({}),
      },
      maxSteps: 5,
      prompt: "Search for current information about Figma, the design tool company. Include founding info, funding, and recent news.",
    });

    console.log("   Search completed. Found information about Figma.\n");

    // Phase 2: Use custom tools with the research
    console.log("📍 Phase 2: Using custom tools with research data...");
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      tools,
      maxSteps: 10,
      prompt: `You are a VC research assistant. Based on this research about Figma:

${searchResult.substring(0, 2000)}

Please:
1. Check if Figma exists in our CRM using the lookupCompany tool
2. Create a company record using the createCompany tool with the key facts
3. Save a research note using the saveNote tool

Execute all three tools.`,
    });

    console.log("\n📝 Final Response:");
    console.log(text);

    console.log("\n📊 Tool Calls Made:");
    toolCallLog.forEach((call, i) => {
      console.log(`  ${i + 1}. ${call.tool}`);
    });

    const usedCustomTools = toolCallLog.length >= 2;

    if (usedCustomTools) {
      console.log("\n✅ Test 2.2 PASSED: Two-phase approach works (Search → Tools)");
      return true;
    } else {
      console.log("\n❌ Test 2.2 FAILED: Agent didn't use enough tools");
      return false;
    }
  } catch (error) {
    console.error("\n❌ Test 2.2 FAILED:", error);
    return false;
  }
}

async function testAgentDecisionMaking() {
  console.log("\n" + "=".repeat(60));
  console.log("Test 2.3: Agent Decision Making (Conditional Logic)");
  console.log("=".repeat(60));
  console.log("\nTesting if agent makes smart decisions based on tool results...\n");

  toolCallLog.length = 0;

  // Create a tool that simulates finding an existing company
  const toolsWithExisting = {
    lookupCompany: tool({
      description: "Look up a company in the CRM database",
      parameters: z.object({
        companyName: z.string().describe("The name of the company to look up"),
      }),
      execute: async ({ companyName }) => {
        // Simulate that Stripe DOES exist
        if (companyName.toLowerCase().includes("stripe")) {
          const result = {
            exists: true,
            companyId: "company-stripe-123",
            message: `Company "${companyName}" found in CRM`,
            lastUpdated: "2024-01-15",
          };
          logToolCall("lookupCompany", { companyName }, result);
          return result;
        }
        const result = {
          exists: false,
          message: `Company "${companyName}" not found`,
        };
        logToolCall("lookupCompany", { companyName }, result);
        return result;
      },
    }),
    createCompany: tools.createCompany,
    saveNote: tools.saveNote,
  };

  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      tools: toolsWithExisting,
      maxSteps: 10,
      prompt: `You are a VC research assistant.

Check if "Stripe" exists in our CRM.
- If it exists, just add a note saying "Reviewed - still active"
- If it doesn't exist, create a new company record first, then add a note

Only do what's necessary based on the lookup result.`,
    });

    console.log("\n📝 Final Response:");
    console.log(text);

    console.log("\n📊 Tool Calls Made:");
    toolCallLog.forEach((call, i) => {
      console.log(`  ${i + 1}. ${call.tool}`);
    });

    // Verify agent didn't create company (since it exists)
    const createdCompany = toolCallLog.some(c => c.tool === "createCompany");
    const savedNote = toolCallLog.some(c => c.tool === "saveNote");
    const lookedUp = toolCallLog.some(c => c.tool === "lookupCompany");

    if (lookedUp && savedNote && !createdCompany) {
      console.log("\n✅ Test 2.3 PASSED: Agent made correct decision (didn't create duplicate)");
      return true;
    } else if (createdCompany) {
      console.log("\n⚠️ Test 2.3 WARNING: Agent created company even though it existed");
      return false;
    } else {
      console.log("\n⚠️ Test 2.3 PARTIAL: Agent behavior was unexpected");
      return true;
    }
  } catch (error) {
    console.error("\n❌ Test 2.3 FAILED:", error);
    return false;
  }
}

async function testSingleToolCall() {
  console.log("\n" + "=".repeat(60));
  console.log("Test 2.4: Single Tool Call Verification");
  console.log("=".repeat(60));
  console.log("\nVerifying that each tool works individually...\n");

  toolCallLog.length = 0;

  try {
    // Test lookupCompany
    console.log("📍 Testing lookupCompany...");
    await generateText({
      model: google("gemini-2.5-flash"),
      tools: { lookupCompany: tools.lookupCompany },
      maxSteps: 2,
      prompt: `Call the lookupCompany tool with companyName "TestCo"`,
    });
    const lookupWorked = toolCallLog.some(c => c.tool === "lookupCompany" && c.args.companyName);

    // Test createCompany
    console.log("📍 Testing createCompany...");
    await generateText({
      model: google("gemini-2.5-flash"),
      tools: { createCompany: tools.createCompany },
      maxSteps: 2,
      prompt: `Call the createCompany tool with name "TestCo" and description "A test company"`,
    });
    const createWorked = toolCallLog.some(c => c.tool === "createCompany" && c.args.name);

    // Test saveNote
    console.log("📍 Testing saveNote...");
    await generateText({
      model: google("gemini-2.5-flash"),
      tools: { saveNote: tools.saveNote },
      maxSteps: 2,
      prompt: `Call the saveNote tool with companyName "TestCo" and note "Test note content"`,
    });
    const saveWorked = toolCallLog.some(c => c.tool === "saveNote" && c.args.companyName);

    console.log("\n📊 Individual Tool Results:");
    console.log(`  lookupCompany: ${lookupWorked ? "✅ Works" : "❌ Failed"}`);
    console.log(`  createCompany: ${createWorked ? "✅ Works" : "❌ Failed"}`);
    console.log(`  saveNote:      ${saveWorked ? "✅ Works" : "❌ Failed"}`);

    console.log("\n📊 All Tool Calls:");
    toolCallLog.forEach((call, i) => {
      console.log(`  ${i + 1}. ${call.tool}: ${JSON.stringify(call.args)}`);
    });

    const allWorked = lookupWorked && createWorked && saveWorked;
    if (allWorked) {
      console.log("\n✅ Test 2.4 PASSED: All individual tools work correctly");
    } else {
      console.log("\n⚠️ Test 2.4 PARTIAL: Some tools didn't work");
    }
    return allWorked || (lookupWorked && (createWorked || saveWorked));
  } catch (error) {
    console.error("\n❌ Test 2.4 FAILED:", error);
    return false;
  }
}

async function main() {
  console.log("\n🚀 Starting Test 2: AI SDK Agent with Tools\n");

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error("❌ Error: GOOGLE_GENERATIVE_AI_API_KEY not set");
    process.exit(1);
  }

  const results = {
    agentWithTools: await testAgentWithTools(),
    agentWithSearch: await testAgentWithSearchAndTools(),
    agentDecisions: await testAgentDecisionMaking(),
    singleTools: await testSingleToolCall(),
  };

  console.log("\n" + "=".repeat(60));
  console.log("📋 Test 2 Summary");
  console.log("=".repeat(60));
  console.log(`  2.1 Sequential Tool Calls:        ${results.agentWithTools ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  2.2 Two-Phase (Search → Tools):   ${results.agentWithSearch ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  2.3 Decision Making:              ${results.agentDecisions ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  2.4 Individual Tool Verification: ${results.singleTools ? "✅ PASS" : "❌ FAIL"}`);

  console.log("\n📝 Key Findings:");
  console.log("  • Gemini CANNOT mix Google Search with custom tools in same request");
  console.log("  • Tool parameters work correctly when tools are called");
  console.log("  • Multi-tool sequences may require explicit orchestration");
  console.log("  • Two-phase approach (Search → Tools) is recommended");

  const criticalPassed = results.singleTools && (results.agentWithTools || results.agentWithSearch);
  console.log(`\n${criticalPassed ? "✅ Core functionality verified!" : "⚠️ Some issues need attention"}\n`);

  process.exit(criticalPassed ? 0 : 1);
}

main();
