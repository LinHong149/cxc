# 🕵️ Timeline Detective Board — Document Entity Graph Explorer

A hackathon-built AI-powered document analysis tool that transforms messy document dumps into an interactive detective-style investigation board.

Upload documents → extract people/places/organizations → build evidence-backed connections → explore them through a timeline-driven graph interface.

---

## 🚀 Inspiration

Large investigative datasets (court filings, logs, reports, leaked archives, etc.) are difficult to navigate manually.

We wanted to build a system that helps users answer questions like:
- Who appears most often across documents?
- Which people are mentioned together?
- How do relationships change over time?
- What connections emerge when you zoom into a specific date range?

Inspired by investigative link analysis tools, we created a lightweight MVP in 24 hours.

---

## 🎯 What It Does

This project takes in a collection of documents and automatically:

### ✅ Extracts key entities:
- People
- Organizations
- Locations
- Dates

### ✅ Builds a graph of relationships based on evidence:
- Entities mentioned in the same sentence are connected
- Each edge is backed by a source citation snippet

### ✅ Provides an interactive UI:
- Timeline scrubber filters connections over time
- Detective board graph updates dynamically
- Clicking an edge reveals the exact evidence text
- Clicking a node shows all mentions across documents

---

## 🧠 How It Works

### 1. Document Ingestion

Documents are uploaded and converted into clean text.
- PDFs are parsed using lightweight extraction tools
- Each document is assigned a timestamp (from metadata or filename)

### 2. Named Entity Recognition (NER)

We run NLP-based entity extraction using spaCy:
- `PERSON`
- `ORG`
- `GPE` (locations)
- `DATE`

Each entity mention is stored with:
- Document ID
- Page number
- Exact text snippet
- Timestamp

### 3. Evidence-Backed Graph Construction

Instead of guessing intent, we build only safe, source-grounded links:
- If two entities appear in the same sentence → connect them
- Edge weight increases with repeated co-occurrence
- Every edge stores the best supporting snippets

This produces an investigation graph like:

```
Person A ── mentioned_with ── Person B
(evidence sentence attached)
```

### 4. Timeline-Sliced Detective Board

The key feature is time-based navigation:
- User selects a date window
- Graph updates to show only nodes/edges active in that period
- Relationships evolve as the timeline moves

---

## 🖥️ Tech Stack

### Backend
- **FastAPI** — REST API for graph queries
- **Python** — NLP + data processing
- **spaCy** — Named Entity Recognition
- **pdfplumber** — PDF text extraction
- **SQLite/Postgres** — storage for entities + edges

### Frontend
- **Next.js + React**
- **React Flow / Cytoscape.js** — interactive graph visualization
- Timeline slider + evidence side panel

---

## 📊 Core Data Model

### Entities (Nodes)
- `id`
- `name`
- `type`
- `first_seen`, `last_seen`

### Mentions (Evidence Anchors)
- `doc_id`
- `page`
- `snippet`
- `timestamp`

### Edges (Connections)
- `src_entity_id`
- `dst_entity_id`
- `weight`
- `evidence[]`

---

## 🏆 Hackathon MVP Features
- Upload documents
- Entity extraction
- Co-mention relationship graph
- Timeline filtering
- Clickable evidence panel
- Investigation-board visualization

---

## ⚠️ Responsible Design

This tool is designed as a document navigation + evidence explorer, not an accusation engine.

Key safeguards:
- Connections represent only textual co-occurrence
- Every link is backed by an explicit citation snippet
- No suspicion scoring or automated conclusions

**Appearance in a document ≠ wrongdoing.**

---

## 🌟 Future Improvements
- Event extraction (meetings, flights, filings)
- Entity resolution + alias merging
- Semantic relationship extraction beyond co-mentions
- Scalable graph search (Neo4j / pgvector)
- Better support for OCR-scanned documents
- Collaboration + investigation workspaces

---

## 🏁 Demo Flow
1. Upload a document pack
2. Entities are extracted automatically
3. Timeline scrub filters the investigation board
4. Click edges → view evidence
5. Explore evolving connections over time

---

## 👥 Team

Built in 24 hours as a hackathon project to explore:
- NLP + entity extraction
- Graph-based document intelligence
- Timeline-driven investigation UX

---

## 📜 License

MIT License — feel free to build on top of this project.

---

**✨ Turning unstructured documents into structured investigations.**
