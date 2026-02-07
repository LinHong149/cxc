import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface OutputEvent {
  event_id: string;
  type?: string;
  title?: string;
  time?: { start?: string; end?: string };
  participants?: string[];
  locations?: string[];
  summary?: string;
  source_refs?: Array<{ source_id: string; page: number; evidence?: string }>;
}

interface OutputEntity {
  entity_id: string;
  type?: string;
  name?: string;
  geo?: { lat?: number; lng?: number };
}

interface OutputSchema {
  entities?: OutputEntity[];
  events?: OutputEvent[];
}

// Known locations for flight route inference (Epstein residences + Teterboro)
const KNOWN_ROUTES: Array<{ start: { lat: number; lng: number; name: string }; end: { lat: number; lng: number; name: string } }> = [
  { start: { lat: 40.8501, lng: -74.0608, name: 'Teterboro (NY/NJ)' }, end: { lat: 26.7056, lng: -80.0364, name: 'Palm Beach, FL' } },
  { start: { lat: 40.8501, lng: -74.0608, name: 'Teterboro (NY/NJ)' }, end: { lat: 35.687, lng: -105.9378, name: 'New Mexico Ranch' } },
  { start: { lat: 40.8501, lng: -74.0608, name: 'Teterboro (NY/NJ)' }, end: { lat: 51.5074, lng: -0.1278, name: 'London' } },
  { start: { lat: 26.7056, lng: -80.0364, name: 'Palm Beach, FL' }, end: { lat: 40.8501, lng: -74.0608, name: 'Teterboro (NY/NJ)' } },
  { start: { lat: 51.5074, lng: -0.1278, name: 'London' }, end: { lat: 40.8501, lng: -74.0608, name: 'Teterboro (NY/NJ)' } },
];

export interface FlightArc {
  id: string;
  event_id: string;
  title: string;
  date: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  startName: string;
  endName: string;
  participants?: string[];
  summary?: string;
  source_refs?: Array<{ source_id: string; page: number; evidence?: string }>;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateStart = searchParams.get('date_start');
    const dateEnd = searchParams.get('date_end');
    const fileParam = searchParams.get('file') || 'output.json';

    const validFiles = ['output.json', 'output2.json'];
    const fileName = validFiles.includes(fileParam) ? fileParam : 'output.json';

    const isVercel = process.env.VERCEL === '1';
    if (isVercel) {
      return NextResponse.json(
        { error: 'Flights data not available on Vercel.' },
        { status: 404 }
      );
    }

    const projectRoot = path.resolve(process.cwd(), '..');
    const outputPath = path.join(projectRoot, fileName);

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

    const flightEvents = (data.events || []).filter((e) => e.type === 'flight');
    const entityMap = new Map<string, OutputEntity>();
    for (const e of data.entities || []) {
      entityMap.set(e.entity_id, e);
    }

    const inDateRange = (start?: string, end?: string) => {
      if (!dateStart && !dateEnd) return true;
      const rangeStart = start || end;
      const rangeEnd = end || start;
      if (!rangeStart && !rangeEnd) return true;
      if (dateStart && rangeEnd && rangeEnd < dateStart) return false;
      if (dateEnd && rangeStart && rangeStart > dateEnd) return false;
      return true;
    };

    const arcs: FlightArc[] = [];
    flightEvents.forEach((ev, idx) => {
      const start = ev.time?.start;
      const end = ev.time?.end;
      if (!inDateRange(start, end)) return;

      const route = KNOWN_ROUTES[idx % KNOWN_ROUTES.length];
      arcs.push({
        id: `arc_${ev.event_id}`,
        event_id: ev.event_id,
        title: ev.title || `Flight - ${formatDate(start || '')}`,
        date: start || '',
        startLat: route.start.lat,
        startLng: route.start.lng,
        endLat: route.end.lat,
        endLng: route.end.lng,
        startName: route.start.name,
        endName: route.end.name,
        participants: ev.participants,
        summary: ev.summary,
        source_refs: ev.source_refs,
      });
    });

    return NextResponse.json({
      flights: arcs,
      timeline_range: {
        start: arcs.length > 0 ? arcs.reduce((a, b) => (a.date < b.date ? a : b)).date : null,
        end: arcs.length > 0 ? arcs.reduce((a, b) => (a.date > b.date ? a : b)).date : null,
      },
    });
  } catch (error: unknown) {
    console.error('Error building flights:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load flights' },
      { status: 500 }
    );
  }
}
