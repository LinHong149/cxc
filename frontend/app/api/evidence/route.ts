import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { EvidenceResponse, ParsedPage } from "@/types";

// Force dynamic rendering since we use request.url and file system
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const edgeId = searchParams.get("edge_id");

    if (!edgeId) {
      return NextResponse.json(
        { error: "edge_id parameter is required" },
        { status: 400 }
      );
    }

    // Read output.json from project root (parent of frontend directory)
    const outputPath = path.join(process.cwd(), "..", "output.json");
    
    // Fallback: try current directory if running from root
    const fallbackPath = path.join(process.cwd(), "output.json");
    const finalPath = fs.existsSync(outputPath) ? outputPath : fallbackPath;
    
    if (!fs.existsSync(finalPath)) {
      return NextResponse.json(
        { error: "No parsed data found" },
        { status: 404 }
      );
    }

    const fileContent = fs.readFileSync(finalPath, "utf-8");
    const pages: ParsedPage[] = JSON.parse(fileContent);

    // Mock evidence - in production, this would query the graph database
    const mockEvidence: EvidenceResponse = {
      edge_id: edgeId,
      src_entity: {
        id: "ent_001",
        name: "Epstein",
        type: "PERSON",
      },
      dst_entity: {
        id: "ent_002",
        name: "NY CART Coordinator",
        type: "ORG",
      },
      evidence: pages.slice(0, 3).map((page, idx) => ({
        doc_id: page.doc_id,
        page_id: page.page_id,
        page_number: page.page_number,
        snippet: page.text.substring(0, 200) + "...",
        timestamp: page.date || page.extracted_at,
        source_uri: page.source_uri,
        context_before: idx > 0 ? "Previous context..." : undefined,
        context_after: idx < pages.length - 1 ? "Following context..." : undefined,
      })),
      total_evidence_count: pages.length,
    };

    return NextResponse.json(mockEvidence);
  } catch (error) {
    console.error("Error fetching evidence:", error);
    return NextResponse.json(
      { error: "Failed to fetch evidence" },
      { status: 500 }
    );
  }
}
