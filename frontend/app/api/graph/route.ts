import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Frontend-expected types
interface GraphNode {
  id: string;
  name: string;
  label?: string;
  type: string;
  mention_count: number;
  first_seen?: string;
  last_seen?: string;
  documents: string[];
  image?: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  evidence: Array<{
    doc_id: string;
    page_id: string;
    snippet: string;
    anchor?: string;
    timestamp?: string;
  }>;
}

// New output.json schema types
interface OutputEntity {
  entity_id: string;
  type: string;
  name: string;
  aliases?: string[];
  source_refs?: Array<{ source_id: string; page: number; evidence: string }>;
}

interface OutputClaim {
  claim_id: string;
  subject: string;
  predicate: string;
  object: string;
  time?: { start?: string; end?: string };
  summary?: string;
  evidence?: Array<{ source_id: string; page: number; anchor?: string }>;
}

interface OutputRelationship {
  relationship_id: string;
  subject: string;
  predicate: string;
  object: string;
  time?: { start?: string; end?: string };
  evidence?: Array<{ source_id: string; page: number; anchor?: string }>;
}

interface OutputEvent {
  event_id: string;
  time?: { start?: string; end?: string };
  participants?: string[];
  source_refs?: Array<{ source_id: string; page: number; evidence?: string }>;
}

interface OutputSource {
  source_id: string;
  title?: string;
  file_name?: string;
  page_labels?: Record<string, string>;
}

interface OutputImage {
  path: string;
  entities?: string[];
  events?: string[];
  claims?: string[];
  relationships?: string[];
}

interface OutputSchema {
  schema_version?: string;
  sources?: OutputSource[];
  entities?: OutputEntity[];
  claims?: OutputClaim[];
  relationships?: OutputRelationship[];
  events?: OutputEvent[];
  images?: OutputImage[];
}

function toPageId(sourceId: string, page: number): string {
  return `${sourceId}#p${String(page).padStart(2, '0')}`;
}

function toGraphType(entityType: string): string {
  const t = entityType?.toLowerCase() || '';
  if (t === 'person') return 'PERSON';
  if (t === 'organization' || t === 'org') return 'ORG';
  if (t === 'place' || t === 'location' || t === 'loc') return 'GPE';
  return entityType || 'PERSON';
}

function buildGraphFromOutput(data: OutputSchema, dateStart: string | null, dateEnd: string | null): {
  nodes: GraphNode[];
  edges: GraphEdge[];
  timelineStart: string | null;
  timelineEnd: string | null;
} {
  const entityMap = new Map<string, GraphNode>();
  const edgeMap = new Map<string, GraphEdge>();

  const inDateRange = (start?: string, end?: string) => {
    if (!dateStart && !dateEnd) return true;
    const rangeStart = start || end;
    const rangeEnd = end || start;
    if (!rangeStart && !rangeEnd) return true;
    if (dateStart && rangeEnd && rangeEnd < dateStart) return false;
    if (dateEnd && rangeStart && rangeStart > dateEnd) return false;
    return true;
  };

  // Build nodes from entities
  for (const e of data.entities || []) {
    entityMap.set(e.entity_id, {
      id: e.entity_id,
      name: e.name,
      label: e.name,
      type: toGraphType(e.type),
      mention_count: (e.source_refs?.length ?? 0) + (e.aliases?.length ?? 0),
      first_seen: undefined,
      last_seen: undefined,
      documents: [...new Set((e.source_refs || []).map((r) => r.source_id))],
    });
  }

  const edgeKey = (a: string, b: string) => {
    return a < b ? `${a}--${b}` : `${b}--${a}`;
  };

  const addEvidenceToEdge = (
    source: string,
    target: string,
    evidence: Array<{ source_id: string; page: number; anchor?: string; evidence?: string }>,
    timeStart?: string,
    summary?: string
  ) => {
    const key = edgeKey(source, target);
    const [s, t] = source < target ? [source, target] : [target, source];
    const refined = evidence.map((ev) => ({
      doc_id: ev.source_id,
      page_id: toPageId(ev.source_id, ev.page),
      snippet: summary || ev.anchor || ev.evidence || '',
      anchor: ev.anchor || ev.evidence,
      timestamp: timeStart,
    }));

    if (edgeMap.has(key)) {
      const existing = edgeMap.get(key)!;
      existing.weight += 1;
      existing.evidence.push(...refined);
    } else {
      edgeMap.set(key, {
        id: key,
        source: s,
        target: t,
        weight: 1,
        evidence: refined,
      });
    }
  };

  const updateNodeDates = (entityId: string, start?: string, end?: string) => {
    const node = entityMap.get(entityId);
    if (!node) return;
    if (start && (!node.first_seen || start < node.first_seen)) node.first_seen = start;
    if (end && (!node.last_seen || end > node.last_seen)) node.last_seen = end;
  };

  const allDates: string[] = [];

  // Process claims
  for (const c of data.claims || []) {
    const start = c.time?.start;
    const end = c.time?.end;
    if (start) allDates.push(start);
    if (end) allDates.push(end);
    if (!inDateRange(start, end)) continue;

    if (!entityMap.has(c.subject) || !entityMap.has(c.object)) continue;

    updateNodeDates(c.subject, start, end);
    updateNodeDates(c.object, start, end);

    const ev = (c.evidence || []).map((e) => ({
      ...e,
      anchor: e.anchor,
    }));
    addEvidenceToEdge(c.subject, c.object, ev, start, c.summary);
  }

  // Process relationships
  for (const r of data.relationships || []) {
    const start = r.time?.start ?? undefined;
    const end = r.time?.end ?? undefined;
    if (start) allDates.push(start);
    if (end) allDates.push(end);
    if (!inDateRange(start, end)) continue;

    if (!entityMap.has(r.subject) || !entityMap.has(r.object)) continue;

    updateNodeDates(r.subject, start, end);
    updateNodeDates(r.object, start, end);

    const subjName = entityMap.get(r.subject)?.name || r.subject;
    const objName = entityMap.get(r.object)?.name || r.object;
    const predReadable = (r.predicate || '').replace(/_/g, ' ');
    const relSummary = `${subjName} ${predReadable} ${objName}.`;

    const ev = (r.evidence || []).map((e) => ({
      source_id: e.source_id,
      page: e.page,
      anchor: e.anchor,
    }));
    addEvidenceToEdge(r.subject, r.object, ev, start, relSummary);
  }

  // Fallback: entity first_seen/last_seen from events
  for (const ev of data.events || []) {
    const start = ev.time?.start;
    const end = ev.time?.end;
    if (start) allDates.push(start);
    if (end) allDates.push(end);
    for (const p of ev.participants || []) {
      updateNodeDates(p, start, end);
    }
  }

  const timelineStart =
    allDates.length > 0 ? allDates.reduce((a, b) => (a < b ? a : b)) : null;
  const timelineEnd =
    allDates.length > 0 ? allDates.reduce((a, b) => (a > b ? a : b)) : null;

  const edges = Array.from(edgeMap.values());
  const connectedIds = new Set<string>();
  for (const e of edges) {
    connectedIds.add(e.source);
    connectedIds.add(e.target);
  }
  let nodes = Array.from(entityMap.values()).filter((n) => connectedIds.has(n.id));

  // Add image nodes and edges to connected entities
  const allImages = data.images || [];
  for (const img of allImages) {
    const entityIds = img.entities || [];
    const connectedToGraph = entityIds.filter((id) => connectedIds.has(id));
    if (connectedToGraph.length === 0) continue;

    const imageId = `image_${img.path.replace(/[/.]/g, '_')}`;
    const imageName = path.basename(img.path, path.extname(img.path)).replace(/-/g, ' ');
    const imageNode: GraphNode = {
      id: imageId,
      name: imageName,
      label: imageName,
      type: 'IMAGE',
      mention_count: connectedToGraph.length,
      first_seen: undefined,
      last_seen: undefined,
      documents: [],
      image: img.path,
    };
    nodes.push(imageNode);

    for (const entityId of connectedToGraph) {
      const key = edgeKey(imageId, entityId);
      const [s, t] = imageId < entityId ? [imageId, entityId] : [entityId, imageId];
      edgeMap.set(key, {
        id: key,
        source: s,
        target: t,
        weight: 1,
        evidence: [{ doc_id: '', page_id: '', snippet: `Image: ${imageName}` }],
      });
    }
  }

  const finalEdges = Array.from(edgeMap.values());
  return { nodes, edges: finalEdges, timelineStart, timelineEnd };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateStart = searchParams.get('date_start');
    const dateEnd = searchParams.get('date_end');

    const isVercel = process.env.VERCEL === '1';

    if (isVercel) {
      return NextResponse.json(
        {
          error: 'Graph data is not available on Vercel. The output.json file is not accessible in serverless environment.',
          suggestion:
            'Consider using a database (PostgreSQL, MongoDB) or storage service (S3, Vercel Blob) to store parsed data.',
        },
        { status: 404 }
      );
    }

    const projectRoot = path.resolve(process.cwd(), '..');
    const outputPath = path.join(projectRoot, 'output.json');

    let data: OutputSchema;
    try {
      const raw = await fs.readFile(outputPath, 'utf-8');
      data = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: 'No parsed data found. Please upload and parse a PDF first.' },
        { status: 404 }
      );
    }

    if (!data.entities || !Array.isArray(data.entities)) {
      return NextResponse.json(
        { error: 'Invalid output.json schema: expected entities array.' },
        { status: 400 }
      );
    }

    const { nodes, edges, timelineStart, timelineEnd } = buildGraphFromOutput(
      data,
      dateStart,
      dateEnd
    );

    const sources = (data.sources || []).map((s) => ({
      source_id: s.source_id,
      title: s.title || s.file_name || s.source_id,
      file_name: s.file_name,
      page_labels: s.page_labels,
    }));

    return NextResponse.json({
      nodes,
      edges,
      sources,
      timeline_range: {
        start: timelineStart ?? null,
        end: timelineEnd ?? null,
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
