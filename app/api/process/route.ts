/**
 * Process API Route
 *
 * Handles the full VC research pipeline with streaming progress updates.
 * Uses Server-Sent Events (SSE) to stream progress to the client.
 */

import { NextRequest } from "next/server";
import {
  runParallelResearch,
  synthesizeResearch,
  generateInvestmentMemo,
  type ResearchArea,
} from "@/src/lib/research";
import type { CompanyResearch, InvestmentMemo } from "@/src/types/schemas";

// ===========================================
// Types
// ===========================================

interface ProgressEvent {
  type: "progress" | "research" | "result" | "error";
  stage?: string;
  area?: ResearchArea;
  status?: string;
  message?: string;
  data?: unknown;
}

interface ProcessResult {
  id: string;
  company: string;
  research: CompanyResearch;
  memo: InvestmentMemo;
  crmRecordId: string;
  createdAt: string;
}

// ===========================================
// SSE Helper
// ===========================================

function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });

  const send = (event: ProgressEvent) => {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    controller.enqueue(encoder.encode(data));
  };

  const close = () => {
    controller.close();
  };

  return { stream, send, close };
}

// ===========================================
// Mock CRM Operations
// ===========================================

async function mockCRMLookup(companyName: string): Promise<{ exists: boolean; recordId?: string }> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return { exists: false };
}

async function mockCRMCreate(companyName: string): Promise<{ recordId: string }> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return { recordId: `attio-${Date.now()}` };
}

async function mockCRMSaveNote(recordId: string, memo: InvestmentMemo): Promise<{ noteId: string }> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return { noteId: `note-${Date.now()}` };
}

// ===========================================
// Pipeline
// ===========================================

async function runPipeline(
  input: string,
  send: (event: ProgressEvent) => void
): Promise<ProcessResult> {
  const companyName = input.trim();
  const startTime = Date.now();

  // Stage 1: Identify company
  send({ type: "progress", stage: "identifying", message: `Identifying company: ${companyName}` });

  // Stage 2: Check CRM
  send({ type: "progress", stage: "checking", message: "Checking CRM for existing record..." });
  const crmLookup = await mockCRMLookup(companyName);

  if (crmLookup.exists) {
    send({ type: "progress", stage: "found", message: `Found existing record: ${crmLookup.recordId}` });
  } else {
    send({ type: "progress", stage: "new", message: "New company - proceeding with research" });
  }

  // Stage 3: Parallel research
  send({ type: "progress", stage: "researching", message: "Starting parallel research..." });

  const research = await runParallelResearch(companyName, (area, status) => {
    send({ type: "research", area, status });
  });

  // Stage 4: Synthesize
  send({ type: "progress", stage: "synthesizing", message: "Synthesizing research..." });
  const structuredResearch = await synthesizeResearch(companyName, research);

  // Stage 5: Generate memo
  send({ type: "progress", stage: "generating", message: "Generating investment memo..." });
  const memo = await generateInvestmentMemo(companyName, structuredResearch);

  // Stage 6: Save to CRM
  send({ type: "progress", stage: "saving", message: "Saving to CRM..." });
  const crmRecord = await mockCRMCreate(companyName);
  await mockCRMSaveNote(crmRecord.recordId, memo);

  const duration = Date.now() - startTime;
  send({ type: "progress", stage: "complete", message: `Complete in ${(duration / 1000).toFixed(1)}s` });

  return {
    id: `opp-${Date.now()}`,
    company: companyName,
    research: structuredResearch,
    memo,
    crmRecordId: crmRecord.recordId,
    createdAt: new Date().toISOString(),
  };
}

// ===========================================
// Route Handler
// ===========================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input } = body;

    if (!input || typeof input !== "string") {
      return new Response(JSON.stringify({ error: "Input is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { stream, send, close } = createSSEStream();

    // Run pipeline in background
    (async () => {
      try {
        const result = await runPipeline(input, send);
        send({ type: "result", data: result });
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        close();
      }
    })();

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
