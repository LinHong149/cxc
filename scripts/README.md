## Setup

### Create Virtual Environment

```bash
python -m venv venv
```

### Activate Virtual Environment

**On macOS/Linux:**
```bash
source venv/bin/activate
```

**On Windows:**
```bash
venv\Scripts\activate
```

### Install Requirements

```bash
pip install -r requirements.txt
```

```bash
export OPENAI_API_KEY="sk-proj-..."

```

## Usage

```bash
python scripts/parse_pdf.py path/to/document.pdf -o output.json
```
