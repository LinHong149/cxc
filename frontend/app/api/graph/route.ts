import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { GraphResponse, ParsedPage } from "@/types";

// Mock function to build graph from parsed pages
// In production, this would query a database
function buildGraphFromPages(pages: ParsedPage[]): GraphResponse {
  // This is a simplified mock - in production, you'd run NER and build relationships
  const nodes: GraphResponse["nodes"] = [];
  const edges: GraphResponse["edges"] = [];
  const dates: Date[] = [];

  // Extract dates from pages
  pages.forEach((page) => {
    if (page.date) {
      dates.push(new Date(page.date));
    }
  });

  // Mock entities based on text analysis
  // In production, use spaCy NER here
  const mockEntities = [
    { id: "ent_001", label: "Epstein", type: "PERSON" as const },
    { id: "ent_002", label: "NY CART Coordinator", type: "ORG" as const },
    { id: "ent_003", label: "Southern District of New York", type: "ORG" as const },
    { id: "ent_004", label: "New York", type: "GPE" as const },
    { id: "ent_005", label: "Virgin Islands", type: "GPE" as const },
  ];

  mockEntities.forEach((entity, idx) => {
    nodes.push({
      id: entity.id,
      label: entity.label,
      type: entity.type,
      data: {
        mention_count: Math.floor(Math.random() * 20) + 5,
        first_seen: dates.length > 0 ? dates[0].toISOString() : new Date().toISOString(),
        last_seen: dates.length > 0 ? dates[dates.length - 1].toISOString() : new Date().toISOString(),
        documents: pages.map((p) => p.doc_id),
      },
    });
  });

  // Create some mock relationships
  if (nodes.length >= 2) {
    edges.push({
      id: "edge_001",
      source: nodes[0].id,
      target: nodes[1].id,
      label: "mentioned_with",
      weight: 3,
      data: {
        evidence_count: 3,
        first_seen: dates.length > 0 ? dates[0].toISOString() : new Date().toISOString(),
        last_seen: dates.length > 0 ? dates[dates.length - 1].toISOString() : new Date().toISOString(),
      },
    });
  }

  const timelineStart = dates.length > 0 ? dates[0] : new Date("2020-01-01");
  const timelineEnd = dates.length > 0 ? dates[dates.length - 1] : new Date();

  return {
    nodes,
    edges,
    timeline_range: {
      start: timelineStart.toISOString(),
      end: timelineEnd.toISOString(),
    },
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStart = searchParams.get("date_start");
    const dateEnd = searchParams.get("date_end");

    // Read output.json from project root (parent of frontend directory)
    const outputPath = path.join(process.cwd(), "..", "output.json");
    
    // Fallback: try current directory if running from root
    const fallbackPath = path.join(process.cwd(), "output.json");
    const finalPath = fs.existsSync(outputPath) ? outputPath : fallbackPath;
    
    if (!fs.existsSync(finalPath)) {
      return NextResponse.json(
        { error: "No parsed data found. Please run the PDF parser first." },
        { status: 404 }
      );
    }

    const fileContent = fs.readFileSync(finalPath, "utf-8");
    const pages: ParsedPage[] = JSON.parse(fileContent);

    let graph = buildGraphFromPages(pages);

    // Apply date filtering if provided
    if (dateStart && dateEnd) {
      const startDate = new Date(dateStart);
      const endDate = new Date(dateEnd);

      graph = {
        ...graph,
        nodes: graph.nodes.filter((node) => {
          const firstSeen = new Date(node.data.first_seen);
          const lastSeen = new Date(node.data.last_seen);
          return (
            (firstSeen >= startDate && firstSeen <= endDate) ||
            (lastSeen >= startDate && lastSeen <= endDate) ||
            (firstSeen <= startDate && lastSeen >= endDate)
          );
        }),
        edges: graph.edges.filter((edge) => {
          const firstSeen = new Date(edge.data.first_seen);
          const lastSeen = new Date(edge.data.last_seen);
          return (
            (firstSeen >= startDate && firstSeen <= endDate) ||
            (lastSeen >= startDate && lastSeen <= endDate) ||
            (firstSeen <= startDate && lastSeen >= endDate)
          );
        }),
        filter_applied: {
          date_start: dateStart,
          date_end: dateEnd,
        },
      };
    }

    return NextResponse.json(graph);
  } catch (error) {
    console.error("Error fetching graph data:", error);
    return NextResponse.json(
      { error: "Failed to fetch graph data" },
      { status: 500 }
    );
  }
}
