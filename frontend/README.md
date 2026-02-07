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

## Vercel Deployment

This Next.js app is ready to deploy on Vercel.

### Quick Deploy

1. **Push your code to GitHub** (if not already done)

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Select the `frontend` directory as the root directory
   - Click "Deploy"

3. **Test the API endpoints**:
   - `https://your-project.vercel.app/api/hello` - Hello world endpoint
   - `https://your-project.vercel.app/api/health` - Health check
   - `https://your-project.vercel.app/api/graph` - Graph data endpoint

### Environment Variables

If you need to configure environment variables (e.g., for external APIs), add them in the Vercel dashboard under Project Settings → Environment Variables.

### Local Testing

Test the hello world endpoint locally:
```bash
curl http://localhost:3000/api/hello
```

Or visit in your browser: [http://localhost:3000/api/hello](http://localhost:3000/api/hello)

## Project Structure

```
frontend/
├── app/
│   ├── api/
│   │   ├── hello/route.ts       # Hello world test endpoint
│   │   ├── health/route.ts       # Health check endpoint
│   │   ├── graph/route.ts        # API endpoint for graph data
│   │   └── evidence/route.ts     # API endpoint for evidence details
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

### GET `/api/hello`

Simple hello world endpoint for testing.

**Response:**
```json
{
  "message": "Hello World from Timeline Detective Board API!",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "status": "success"
}
```

### GET `/api/health`

Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "healthy",
  "service": "Timeline Detective Board API",
  "version": "0.1.0",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

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
