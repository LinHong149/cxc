export interface GraphNode {
  id: string;
  label: string;
  type: "PERSON" | "ORG" | "GPE" | "DATE";
  data: {
    mention_count: number;
    first_seen: string;
    last_seen: string;
    documents: string[];
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  weight: number;
  data: {
    evidence_count: number;
    first_seen: string;
    last_seen: string;
  };
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  timeline_range: {
    start: string;
    end: string;
  };
  filter_applied?: {
    date_start: string;
    date_end: string;
  };
}

export interface EvidenceItem {
  doc_id: string;
  page_id: string;
  page_number: number;
  snippet: string;
  timestamp: string;
  source_uri: string;
  context_before?: string;
  context_after?: string;
}

export interface EvidenceResponse {
  edge_id: string;
  src_entity: {
    id: string;
    name: string;
    type: string;
  };
  dst_entity: {
    id: string;
    name: string;
    type: string;
  };
  evidence: EvidenceItem[];
  total_evidence_count: number;
}

export interface ParsedPage {
  doc_id: string;
  source_type: string;
  source_uri: string;
  page_id: string;
  text: string;
  page_number: number;
  extracted_at: string;
  one_sentence_summary?: string;
  paragraph_summary?: string;
  date?: string;
}
