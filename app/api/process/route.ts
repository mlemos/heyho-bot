/**
 * Process API Route
 *
 * Handles the full VC research pipeline with streaming progress updates.
 * Supports both text-only and multi-modal (text + files) input.
 * Uses Server-Sent Events (SSE) to stream progress to the client.
 */

import { NextRequest } from "next/server";
import {
  runParallelResearch,
  synthesizeResearch,
  generateInvestmentMemo,
  type ResearchArea,
} from "@/src/lib/research";
import {
  analyzeAttachments,
  formatExtractedContext,
  type FileAttachment,
} from "@/src/lib/multimodal";
import type { CompanyResearch, InvestmentMemo, ExtractedCompanyInfo } from "@/src/types/schemas";

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
  extractedInfo?: ExtractedCompanyInfo;
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
// File Size Validation
// ===========================================

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB per file
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total

function validateFileSize(size: number, filename: string): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`File "${filename}" exceeds 20MB limit`);
  }
}

// ===========================================
// Pipeline
// ===========================================

async function runPipeline(
  textInput: string,
  files: FileAttachment[],
  send: (event: ProgressEvent) => void
): Promise<ProcessResult> {
  const startTime = Date.now();
  let companyName = textInput.trim();
  let extractedInfo: ExtractedCompanyInfo | undefined;
  let additionalContext = "";

  // Stage 0: Analyze attachments if present
  if (files.length > 0) {
    send({ type: "progress", stage: "analyzing", message: `Analyzing ${files.length} file(s)...` });

    try {
      extractedInfo = await analyzeAttachments(files, textInput || undefined);
      companyName = extractedInfo.companyName;
      additionalContext = formatExtractedContext(extractedInfo);

      send({
        type: "progress",
        stage: "analyzed",
        message: `Extracted info for "${companyName}" (confidence: ${(extractedInfo.confidence * 100).toFixed(0)}%)`,
      });
    } catch (error) {
      send({
        type: "progress",
        stage: "analysis_warning",
        message: `Could not extract info from files: ${error instanceof Error ? error.message : "Unknown error"}. Proceeding with text input.`,
      });
    }
  }

  // Validate we have a company name
  if (!companyName) {
    throw new Error("Could not determine company name. Please provide a company name or upload files with company information.");
  }

  // Stage 1: Identify company
  send({ type: "progress", stage: "identifying", message: `Researching: ${companyName}` });

  // Stage 2: Check CRM
  send({ type: "progress", stage: "checking", message: "Checking CRM for existing record..." });
  const crmLookup = await mockCRMLookup(companyName);

  if (crmLookup.exists) {
    send({ type: "progress", stage: "found", message: `Found existing record: ${crmLookup.recordId}` });
  } else {
    send({ type: "progress", stage: "new", message: "New company - proceeding with research" });
  }

  // Stage 3: Parallel research (with additional context from files if available)
  send({ type: "progress", stage: "researching", message: "Starting parallel research..." });

  const research = await runParallelResearch(companyName, (area, status) => {
    send({ type: "research", area, status });
  });

  // Stage 4: Synthesize (include extracted context)
  send({ type: "progress", stage: "synthesizing", message: "Synthesizing research..." });

  // Enhance research with extracted info if available
  let enhancedResearchInput = research;
  if (additionalContext) {
    enhancedResearchInput = {
      ...research,
      basics: `${research.basics}\n\nAdditional context from uploaded files:\n${additionalContext}`,
    };
  }

  const structuredResearch = await synthesizeResearch(companyName, enhancedResearchInput);

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
    extractedInfo,
  };
}

// ===========================================
// Route Handler
// ===========================================

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let textInput = "";
    let files: FileAttachment[] = [];

    // Handle multipart/form-data (files + text)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      // Get text input
      const inputField = formData.get("input");
      if (inputField && typeof inputField === "string") {
        textInput = inputField;
      }

      // Get files
      let totalSize = 0;
      const fileEntries = formData.getAll("files");

      for (const entry of fileEntries) {
        if (entry instanceof File) {
          validateFileSize(entry.size, entry.name);
          totalSize += entry.size;

          if (totalSize > MAX_TOTAL_SIZE) {
            throw new Error("Total file size exceeds 50MB limit");
          }

          const arrayBuffer = await entry.arrayBuffer();
          files.push({
            buffer: Buffer.from(arrayBuffer),
            mimeType: entry.type || "application/octet-stream",
            filename: entry.name,
          });
        }
      }
    }
    // Handle JSON (text only - backward compatible)
    else {
      const body = await request.json();
      textInput = body.input || "";
    }

    // Validate input
    if (!textInput && files.length === 0) {
      return new Response(JSON.stringify({ error: "Input or files required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { stream, send, close } = createSSEStream();

    // Run pipeline in background
    (async () => {
      try {
        const result = await runPipeline(textInput, files, send);
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
