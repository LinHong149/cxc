import os
import json
import itertools
import spacy
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

SPACY_MODEL = os.getenv("SPACY_MODEL", "en_core_web_trf")
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.getenv("DATA_PATH", os.path.join(_SCRIPT_DIR, "normalized_data.json"))

# Keep parser for sentence boundaries (to extract context snippets)
DISABLE_PIPES = ["tagger", "attribute_ruler", "lemmatizer"]

ALLOWED_TYPES = {"PERSON", "LOC"} #, "ORG", "GPE"

# Map spaCy types to Neo4j node labels
LABEL_MAP = {
    "PERSON": "Person",
    # "ORG": "Organization" #,
    # "GPE": "Location",
    "LOC": "Location"
}

CONSTRAINTS = [
    "CREATE CONSTRAINT person_id_unique IF NOT EXISTS FOR (p:Person) REQUIRE p.entity_id IS UNIQUE",
    # "CREATE CONSTRAINT org_id_unique IF NOT EXISTS FOR (o:Organization) REQUIRE o.entity_id IS UNIQUE",
    "CREATE CONSTRAINT location_id_unique IF NOT EXISTS FOR (l:Location) REQUIRE l.entity_id IS UNIQUE",
]

# ref format: doc_id|page_id|page_number|source_uri|||snippet (||| separates metadata from description)
# Dynamic: use .format(LABEL=...) for Person, Organization, Location
UPSERT_ENTITY = """
UNWIND $entities AS e
MERGE (n:{LABEL} {{entity_id: e.entity_id}})
SET n.name = e.name,
    n.refs = coalesce(n.refs, []) + e.ref
"""

UPSERT_EDGE = """
UNWIND $pairs AS p
MATCH (a) WHERE a.entity_id = p.a_id
MATCH (b) WHERE b.entity_id = p.b_id
MERGE (a)-[r:RELATES_TO]->(b)
SET r.count = coalesce(r.count, 0) + 1
SET r.refs = coalesce(r.refs, []) + p.ref
"""


def norm_text(s: str) -> str:
    return " ".join(s.strip().split())


def make_entity_id(ent_type: str, name: str) -> str:
    return f"{ent_type}:{norm_text(name).lower()}"


REF_SEP = "|||"  # separates metadata from snippet in ref string


def make_ref_simple(page: dict) -> str:
    """Metadata only: doc_id|page_id|source_uri (for edges)."""
    return f"{page.get('doc_id','')}|{page.get('page_id','')}|{page.get('source_uri','')}"


def make_ref(page: dict, snippet: str = "") -> str:
    """Build ref: doc_id|page_id|page_number|source_uri|||snippet"""
    meta = f"{page.get('doc_id','')}|{page.get('page_id','')}|{page.get('page_number','')}|{page.get('source_uri','')}"
    return f"{meta}{REF_SEP}{snippet}"


def get_snippet_for_entity(doc, ent) -> str:
    """Return the sentence containing the entity, or a fallback chunk."""
    for sent in doc.sents:
        if sent.start_char <= ent.start_char < sent.end_char:
            return sent.text.strip()
    # Fallback: window around entity (max 200 chars)
    start = max(0, ent.start_char - 80)
    end = min(len(doc.text), ent.end_char + 80)
    return doc.text[start:end].strip()


def main() -> None:
    if not (NEO4J_URI and NEO4J_USER and NEO4J_PASSWORD):
        raise SystemExit("Missing Neo4j env vars. Set NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD.")

    nlp = spacy.load(SPACY_MODEL, disable=DISABLE_PIPES)

    with open(DATA_PATH) as f:
        pages = json.load(f)

    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    try:
        with driver.session() as session:
            for c in CONSTRAINTS:
                session.run(c)

            for page in pages:
                doc = nlp(page["text"])

                unique = {}
                for ent in doc.ents:
                    if ent.label_ not in ALLOWED_TYPES:
                        continue
                    eid = make_entity_id(ent.label_, ent.text)
                    snippet = get_snippet_for_entity(doc, ent)
                    ref = make_ref(page, snippet)
                    unique.setdefault(
                        eid,
                        {
                            "entity_id": eid,
                            "type": ent.label_,
                            "name": norm_text(ent.text),
                            "ref": ref,
                        },
                    )

                entities = list(unique.values())
                if not entities:
                    continue

                # Upsert by label (Person, Organization, Location)
                by_label: dict[str, list] = {}
                for e in entities:
                    label = LABEL_MAP.get(e["type"], "Person")
                    by_label.setdefault(label, []).append(e)

                for label, label_entities in by_label.items():
                    cypher = UPSERT_ENTITY.format(LABEL=label)
                    session.run(cypher, entities=label_entities)

                eids = sorted(unique.keys())
                page_ref = make_ref_simple(page)
                pairs = [
                    {"a_id": a, "b_id": b, "ref": page_ref}
                    for a, b in itertools.combinations(eids, 2)
                ]

                if pairs:
                    session.run(UPSERT_EDGE, pairs=pairs)

        print("Inserted Person, Organization, Location nodes + RELATES_TO edges into Neo4j.")
        print("Node labels: Person | Organization | Location")
        print("Try in Neo4j Browser:\n"
              "MATCH (a)-[r:RELATES_TO]->(b) RETURN a, r, b LIMIT 200;")
    finally:
        driver.close()


if __name__ == "__main__":
    main()
