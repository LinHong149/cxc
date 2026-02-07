import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

interface SelectedNode {
  id: string;
  name: string;
  label: string;
  type: string;
  mention_count: number;
  first_seen?: string;
  last_seen?: string;
  documents: string[];
}

interface ChatRequest {
  question: string;
  selectedNodes: SelectedNode[];
  edges?: Array<{
    source: string;
    target: string;
    weight: number;
    evidence: Array<{
      doc_id: string;
      page_id: string;
      snippet: string;
      timestamp?: string;
    }>;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { question, selectedNodes, edges = [] } = body;

    if (!question || !question.trim()) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    if (!selectedNodes || selectedNodes.length === 0) {
      return NextResponse.json(
        { error: 'At least one node must be selected' },
        { status: 400 }
      );
    }

    // Get OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Build context from selected nodes
    const nodeIds = new Set(selectedNodes.map((n) => n.id));
    const relevantEdges = edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );

    const nodeContext = selectedNodes
      .map((node) => {
        const details = [
          `Entity: ${node.label || node.name}`,
          `Type: ${node.type}`,
          `Mention Count: ${node.mention_count}`,
        ];
        if (node.first_seen) details.push(`First Seen: ${node.first_seen}`);
        if (node.last_seen) details.push(`Last Seen: ${node.last_seen}`);
        if (node.documents && node.documents.length > 0) {
          details.push(`Documents: ${node.documents.join(', ')}`);
        }
        return details.join('\n');
      })
      .join('\n\n');

    // Build relationship context
    let relationshipContext = '';
    if (relevantEdges.length > 0) {
      relationshipContext = '\n\nRelationships between selected entities:\n';
      relevantEdges.forEach((edge) => {
        const sourceNode = selectedNodes.find((n) => n.id === edge.source);
        const targetNode = selectedNodes.find((n) => n.id === edge.target);
        if (sourceNode && targetNode) {
          relationshipContext += `- ${sourceNode.label || sourceNode.name} ↔ ${targetNode.label || targetNode.name} (${edge.weight} ${edge.weight === 1 ? 'connection' : 'connections'})\n`;
          if (edge.evidence && edge.evidence.length > 0) {
            const evidenceSnippets = edge.evidence
              .slice(0, 3)
              .map((ev) => `  "${ev.snippet.substring(0, 100)}${ev.snippet.length > 100 ? '...' : ''}"`)
              .join('\n');
            relationshipContext += `  Evidence: ${evidenceSnippets}\n`;
          }
        }
      });
    }

    // Build the prompt
    const systemPrompt = `You are a helpful assistant analyzing a knowledge graph of entities extracted from documents. 
You have been given information about ${selectedNodes.length} selected ${selectedNodes.length === 1 ? 'entity' : 'entities'} from the graph.

Your task is to answer questions about these entities based on the provided context. Be concise, accurate, and focus on the relationships and information available about these specific entities.

If you don't have enough information to answer a question, say so clearly.`;

    const userPrompt = `Selected Entities:
${nodeContext}${relationshipContext}

Question: ${question}

Please provide a helpful answer about these entities based on the information provided.`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content || 'No response generated';

    return NextResponse.json({
      response,
      model: 'gpt-4o-mini',
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    
    // Handle OpenAI-specific errors
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `OpenAI API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
