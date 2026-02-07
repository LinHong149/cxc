# Timeline Detective Board - Frontend

Next.js frontend for the Timeline Detective Board application.

## Features

- 🕵️ **Interactive Graph Visualization** - Built with React Flow
- 📅 **Timeline Filtering** - Filter entities and connections by date range
- 🔍 **Evidence Panel** - View detailed evidence when clicking nodes or edges
- 🎨 **Detective Board Theme** - Dark, investigation-focused UI

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React Flow** - Interactive graph visualization
- **date-fns** - Date formatting and manipulation
- **lucide-react** - Icon library

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── app/
│   ├── api/
│   │   ├── graph/route.ts      # API endpoint for graph data
│   │   └── evidence/route.ts   # API endpoint for evidence details
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Main detective board page
├── components/
│   ├── GraphVisualization.tsx  # React Flow graph component
│   ├── TimelineSlider.tsx       # Date range slider
│   └── EvidencePanel.tsx        # Side panel for evidence/node details
├── types/
│   └── index.ts                 # TypeScript type definitions
└── package.json
```

## API Endpoints

### GET `/api/graph`

Fetches graph data (nodes and edges) with optional date filtering.

**Query Parameters:**
- `date_start` (optional) - ISO date string for start of range
- `date_end` (optional) - ISO date string for end of range

**Response:**
```json
{
  "nodes": [...],
  "edges": [...],
  "timeline_range": {
    "start": "2020-01-01T00:00:00Z",
    "end": "2020-12-31T00:00:00Z"
  }
}
```

### GET `/api/evidence`

Fetches evidence details for a specific edge.

**Query Parameters:**
- `edge_id` (required) - ID of the edge

**Response:**
```json
{
  "edge_id": "edge_001",
  "src_entity": {...},
  "dst_entity": {...},
  "evidence": [...],
  "total_evidence_count": 12
}
```

## Data Flow

1. Frontend loads graph data from `/api/graph`
2. API reads `output.json` from project root (parent directory)
3. Graph is built from parsed PDF pages (currently mocked - will integrate with NER backend)
4. User interacts with timeline slider to filter by date
5. Clicking nodes/edges shows evidence panel with details

## Development Notes

- The graph visualization uses React Flow with custom node types for different entity types (PERSON, ORG, GPE, DATE)
- Timeline filtering updates the graph in real-time
- Evidence panel slides in from the right when a node or edge is clicked
- Currently uses mock data - will be replaced with real NER results from backend

## Next Steps

- [ ] Integrate with actual NER backend for entity extraction
- [ ] Add entity resolution and alias merging
- [ ] Implement graph layout algorithms (force-directed, hierarchical)
- [ ] Add search functionality for entities
- [ ] Add document upload interface
- [ ] Improve evidence visualization with better context
