/**
 * Explore Attio workspace schema
 * Run with: npx tsx src/integrations/attio/explore.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const ATTIO_API_URL = "https://api.attio.com";

async function attioFetch<T>(endpoint: string): Promise<T> {
  const apiKey = process.env.ATTIO_API_KEY;
  if (!apiKey) throw new Error("ATTIO_API_KEY not set");

  const response = await fetch(`${ATTIO_API_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function listObjects() {
  console.log("=== Attio Workspace Objects ===\n");

  const response = await attioFetch<{
    data: Array<{
      api_slug: string;
      singular_noun: string;
      plural_noun: string;
    }>;
  }>("/v2/objects");

  for (const obj of response.data) {
    console.log(`📦 ${obj.singular_noun} (${obj.plural_noun})`);
    console.log(`   Slug: ${obj.api_slug}`);
    console.log("");
  }

  return response.data;
}

async function getObjectAttributes(objectSlug: string) {
  console.log(`\n=== Attributes for "${objectSlug}" ===\n`);

  const response = await attioFetch<{
    data: Array<{
      api_slug: string;
      title: string;
      type: string;
      is_required: boolean;
      is_unique: boolean;
      is_multiselect: boolean;
    }>;
  }>(`/v2/objects/${objectSlug}/attributes`);

  for (const attr of response.data) {
    const flags = [
      attr.is_required ? "required" : "",
      attr.is_unique ? "unique" : "",
      attr.is_multiselect ? "multiselect" : "",
    ]
      .filter(Boolean)
      .join(", ");

    console.log(`  • ${attr.title}`);
    console.log(`    Slug: ${attr.api_slug}`);
    console.log(`    Type: ${attr.type}${flags ? ` (${flags})` : ""}`);
    console.log("");
  }

  return response.data;
}

async function listLists() {
  console.log("\n=== Lists (Pipelines) ===\n");

  const response = await attioFetch<{
    data: Array<{
      api_slug: string;
      name: string;
      parent_object: string[];
    }>;
  }>("/v2/lists");

  for (const list of response.data) {
    console.log(`📋 ${list.name}`);
    console.log(`   Slug: ${list.api_slug}`);
    console.log(`   Parent objects: ${list.parent_object.join(", ")}`);
    console.log("");
  }

  return response.data;
}

async function main() {
  try {
    // List all objects
    const objects = await listObjects();

    // Find investment-related objects
    const investmentObj = objects.find(
      (o) =>
        o.api_slug.includes("investment") ||
        o.api_slug.includes("opportunit") ||
        o.singular_noun.toLowerCase().includes("investment") ||
        o.singular_noun.toLowerCase().includes("opportunity")
    );

    if (investmentObj) {
      console.log(`\n🎯 Found Investment Object: ${investmentObj.api_slug}`);
      await getObjectAttributes(investmentObj.api_slug);
    }

    // Also show companies attributes for reference
    await getObjectAttributes("companies");

    // List pipelines/lists
    await listLists();

    console.log("\n=== Exploration Complete ===");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
