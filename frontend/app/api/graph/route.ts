import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface PageData {
  doc_id: string;
  page_id: string;
  text: string;
  page_number: number;
  date?: string;
  document_timestamp?: string;
  one_sentence_summary?: string;
  paragraph_summary?: string;
}

interface Entity {
  id: string;
  name: string;
  label?: string; // Alias for name for compatibility
  type: string;
  mention_count: number;
  first_seen?: string;
  last_seen?: string;
  documents: string[];
}

interface Edge {
  id: string;
  source: string;
  target: string;
  weight: number;
  evidence: Array<{
    doc_id: string;
    page_id: string;
    snippet: string;
    timestamp?: string;
  }>;
}

// Simple NER extraction (can be enhanced with actual spaCy integration)
function extractEntities(text: string): Array<{ text: string; label: string }> {
  // This is a placeholder - in production, you'd use spaCy or another NER tool
  // For now, we'll do basic pattern matching
  const entities: Array<{ text: string; label: string }> = [];
  const seen = new Set<string>();
  
  // Simple patterns (this is very basic - real implementation would use spaCy)
  // Person pattern: Capitalized first name + capitalized last name
  // More permissive pattern to catch more names
  const personPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b)/g;
  
  // Extract potential entities (very simplified)
  let match;
  while ((match = personPattern.exec(text)) !== null) {
    const entityText = match[1].trim();
    // Filter out common false positives and ensure it looks like a name
    if (
      entityText.length > 4 &&
      entityText.split(' ').length >= 2 &&
      entityText.split(' ').length <= 4 &&
      !entityText.match(/^(The|A|An|This|That|These|Those|From|To|Sent|Date|Subject|RE|Fwd|Phone|Fax|Assistant|Attorney|U\.S\.|USA|FL|CA|NY)\s/i) &&
      !entityText.match(/^\d/) &&
      !seen.has(entityText.toLowerCase())
    ) {
      entities.push({ text: entityText, label: 'PERSON' });
      seen.add(entityText.toLowerCase());
    }
  }
  
  return entities;
}

function buildGraph(pages: PageData[]): { nodes: Entity[]; edges: Edge[] } {
  const entityMap = new Map<string, Entity>();
  const edgeMap = new Map<string, Edge>();
  const sentences = new Map<string, Array<{ entities: string[]; text: string; page: PageData }>>();

  // Process each page
  for (const page of pages) {
    const pageEntities = extractEntities(page.text);
    const entityIds = new Set<string>();

    for (const entity of pageEntities) {
      const entityId = `${entity.label}:${entity.text.toLowerCase()}`;
      entityIds.add(entityId);

      if (!entityMap.has(entityId)) {
        entityMap.set(entityId, {
          id: entityId,
          name: entity.text,
          label: entity.text, // Alias for compatibility
          type: entity.label,
          mention_count: 0,
          documents: [],
        });
      }

      const entityData = entityMap.get(entityId)!;
      entityData.mention_count++;
      if (!entityData.documents.includes(page.doc_id)) {
        entityData.documents.push(page.doc_id);
      }
      if (!entityData.first_seen || (page.date && page.date < entityData.first_seen)) {
        entityData.first_seen = page.date || page.document_timestamp;
      }
      if (!entityData.last_seen || (page.date && page.date > entityData.last_seen)) {
        entityData.last_seen = page.date || page.document_timestamp;
      }
    }

    // Build co-occurrence edges (entities in same page)
    const entityArray = Array.from(entityIds);
    for (let i = 0; i < entityArray.length; i++) {
      for (let j = i + 1; j < entityArray.length; j++) {
        const edgeId = `${entityArray[i]}--${entityArray[j]}`;
        const reverseEdgeId = `${entityArray[j]}--${entityArray[i]}`;
        const existingEdgeId = edgeMap.has(edgeId) ? edgeId : reverseEdgeId;

        if (!edgeMap.has(edgeId) && !edgeMap.has(reverseEdgeId)) {
          edgeMap.set(edgeId, {
            id: edgeId,
            source: entityArray[i],
            target: entityArray[j],
            weight: 1,
            evidence: [{
              doc_id: page.doc_id,
              page_id: page.page_id,
              snippet: page.one_sentence_summary || page.text.substring(0, 200),
              timestamp: page.date || page.document_timestamp,
            }],
          });
        } else {
          const edge = edgeMap.get(existingEdgeId)!;
          edge.weight++;
          edge.evidence.push({
            doc_id: page.doc_id,
            page_id: page.page_id,
            snippet: page.one_sentence_summary || page.text.substring(0, 200),
            timestamp: page.date || page.document_timestamp,
          });
        }
      }
    }
  }

  return {
    nodes: Array.from(entityMap.values()),
    edges: Array.from(edgeMap.values()),
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateStart = searchParams.get('date_start');
    const dateEnd = searchParams.get('date_end');

    // Read output.json
    const projectRoot = path.resolve(process.cwd(), '..');
    const outputPath = path.join(projectRoot, 'output.json');
    let pages: PageData[];
    
    try {
      const data = await fs.readFile(outputPath, 'utf-8');
      pages = JSON.parse(data);
    } catch (error) {
      return NextResponse.json(
        { error: 'No parsed data found. Please upload and parse a PDF first.' },
        { status: 404 }
      );
    }

    // Filter by date range if provided
    if (dateStart || dateEnd) {
      pages = pages.filter((page) => {
        const pageDate = page.date || page.document_timestamp;
        if (!pageDate) return false;
        if (dateStart && pageDate < dateStart) return false;
        if (dateEnd && pageDate > dateEnd) return false;
        return true;
      });
    }

    // Build graph
    const graph = buildGraph(pages);

    return NextResponse.json({
      nodes: graph.nodes,
      edges: graph.edges,
      timeline_range: {
        start: graph.nodes.reduce((min, node) => 
          !min || (node.first_seen && node.first_seen < min) ? node.first_seen : min, 
          undefined as string | undefined
        ),
        end: graph.nodes.reduce((max, node) => 
          !max || (node.last_seen && node.last_seen > max) ? node.last_seen : max, 
          undefined as string | undefined
        ),
      },
      filter_applied: {
        date_start: dateStart || null,
        date_end: dateEnd || null,
      },
    });

  } catch (error: any) {
    console.error('Error building graph:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to build graph' },
      { status: 500 }
    );
  }
}
