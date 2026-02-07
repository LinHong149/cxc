# CXC Frontend

A Next.js frontend for the CXC PDF parser application.

## Setup

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- **PDF Upload**: Upload PDF files for parsing
- **Results View**: Display parsed PDF data including:
  - Page-by-page text extraction
  - One-sentence summaries
  - Paragraph summaries
  - Extracted dates and metadata

## Project Structure

```
frontend/
├── app/
│   ├── api/
│   │   └── parse-pdf/      # API route for PDF parsing (placeholder)
│   ├── results/            # Results display page
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page with upload
│   └── globals.css         # Global styles
├── package.json
└── tsconfig.json
```

## Next Steps

1. **Connect to Backend**: Implement the API route to call your Python backend service
2. **Add Error Handling**: Improve error messages and validation
3. **Add Loading States**: Better UX during PDF processing
4. **Add File Preview**: Show PDF preview before/after parsing
5. **Add Export**: Allow users to download parsed results as JSON

## Build for Production

```bash
npm run build
npm start
```
 