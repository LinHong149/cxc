"use client";

import { X, FileText, Calendar, Link as LinkIcon } from "lucide-react";
import { format } from "date-fns";
import type { EvidenceResponse, GraphNode } from "@/types";

interface EvidencePanelProps {
  evidence: EvidenceResponse | null;
  node: GraphNode | null;
  onClose: () => void;
}

export default function EvidencePanel({ evidence, node, onClose }: EvidencePanelProps) {
  if (!evidence && !node) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-96 bg-detective-board border-l border-gray-700 shadow-2xl overflow-y-auto z-10">
      <div className="sticky top-0 bg-detective-board border-b border-gray-700 p-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-detective-text">Evidence Details</h2>
        <button
          onClick={onClose}
          className="text-detective-muted hover:text-detective-text transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {evidence && (
          <>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-sm text-detective-muted mb-2">Connection</div>
              <div className="flex items-center gap-2">
                <div className="px-2 py-1 bg-detective-accent/20 text-detective-accent rounded text-sm font-medium">
                  {evidence.src_entity.name}
                </div>
                <span className="text-detective-muted">→</span>
                <div className="px-2 py-1 bg-detective-highlight/20 text-detective-highlight rounded text-sm font-medium">
                  {evidence.dst_entity.name}
                </div>
              </div>
              <div className="mt-2 text-xs text-detective-muted">
                {evidence.total_evidence_count} evidence snippet{evidence.total_evidence_count !== 1 ? "s" : ""}
              </div>
            </div>

            <div className="space-y-3">
              {evidence.evidence.map((item, idx) => (
                <div key={idx} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs text-detective-muted">
                      <FileText size={14} />
                      <span className="font-mono">{item.doc_id}</span>
                      <span>Page {item.page_number}</span>
                    </div>
                    {item.timestamp && (
                      <div className="flex items-center gap-1 text-xs text-detective-muted">
                        <Calendar size={12} />
                        <span>{format(new Date(item.timestamp), "MMM d, yyyy")}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-detective-text leading-relaxed mb-2">
                    {item.context_before && (
                      <span className="text-detective-muted italic">
                        {item.context_before}...{" "}
                      </span>
                    )}
                    <span className="bg-detective-accent/20 px-1 rounded">
                      {item.snippet}
                    </span>
                    {item.context_after && (
                      <span className="text-detective-muted italic">
                        {" "}...{item.context_after}
                      </span>
                    )}
                  </div>

                  {item.source_uri && (
                    <div className="flex items-center gap-1 text-xs text-detective-muted mt-2">
                      <LinkIcon size={12} />
                      <span className="truncate">{item.source_uri}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {node && (
          <div className="space-y-3">
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-sm text-detective-muted mb-2">Entity</div>
              <div className="text-lg font-semibold text-detective-text mb-2">{node.label}</div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-detective-highlight/20 text-detective-highlight rounded text-xs">
                  {node.type}
                </span>
                <span className="text-xs text-detective-muted">
                  {node.data.mention_count} mention{node.data.mention_count !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-sm text-detective-muted mb-2">Timeline</div>
              <div className="text-xs text-detective-text space-y-1">
                <div>First seen: {format(new Date(node.data.first_seen), "MMM d, yyyy")}</div>
                <div>Last seen: {format(new Date(node.data.last_seen), "MMM d, yyyy")}</div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-sm text-detective-muted mb-2">Documents</div>
              <div className="space-y-1">
                {node.data.documents.map((docId) => (
                  <div key={docId} className="text-xs font-mono text-detective-text">
                    {docId}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
