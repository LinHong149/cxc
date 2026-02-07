import os
import json
import spacy
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
SPACY_MODEL = os.getenv("SPACY_MODEL", "en_core_web_trf")
DUMMY_PAGES_PATH = os.getenv("DUMMY_PAGES_PATH", "dummy_pages.json")

DISABLE_PIPES = ["tagger", "parser", "attribute_ruler", "lemmatizer"]

# Minimal schema: Page + Entity + MENTIONS
CONSTRAINTS = [
    "CREATE CONSTRAINT page_id_unique IF NOT EXISTS FOR (p:Page) REQUIRE p.page_id IS UNIQUE",
    "CREATE CONSTRAINT entity_id_unique IF NOT EXISTS FOR (e:Entity) REQUIRE e.entity_id IS UNIQUE",
]

INGEST_CYPHER = """
MERGE (p:Page {page_id: $page.page_id})
SET p.doc_id = $page.doc_id,
    p.source_type = $page.source_type,
    p.source_uri = $page.source_uri,
    p.summary = $page.summary,
    p.text = $page.text

WITH p, $entities AS entities
UNWIND entities AS e
MERGE (n:Entity {entity_id: e.entity_id})
SET n.type = e.type,
    n.name = e.name
MERGE (p)-[:MENTIONS]->(n)
"""


def make_entity_id(ent_type: str, name: str) -> str:
    # Deterministic + simple: "TYPE:normalized name"
    norm = " ".join(name.strip().split()).lower()
    return f"{ent_type}:{norm}"


def main() -> None:
    if not (NEO4J_URI and NEO4J_USER and NEO4J_PASSWORD):
        raise SystemExit("Missing Neo4j env vars. Set NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD.")

    nlp = spacy.load(SPACY_MODEL, disable=DISABLE_PIPES)

    with open(DUMMY_PAGES_PATH) as f:
        pages = json.load(f)

    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    try:
        with driver.session() as session:
            for c in CONSTRAINTS:
                session.run(c)

            for page in pages:
                doc = nlp(page["text"])
                entities = [
                    {
                        "entity_id": make_entity_id(ent.label_, ent.text),
                        "type": ent.label_,
                        "name": ent.text,
                    }
                    for ent in doc.ents
                ]

                session.run(INGEST_CYPHER, page=page, entities=entities)

        print("Inserted Page + Entity nodes into Neo4j.")
        print("Try in Neo4j Browser: MATCH (p:Page)-[:MENTIONS]->(e:Entity) RETURN p.page_id, e.type, e.name LIMIT 50;")
    finally:
        driver.close()


if __name__ == "__main__":
    main()