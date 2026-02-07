"""
PDF Parser for Timeline Detective Board

Parses PDF documents and extracts text per page with metadata,
generating summaries and outputting in the NER input schema format.
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse

import pdfplumber
from dateutil import parser as date_parser

# LLM support - try to import OpenAI and transformers, but make them optional
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    OpenAI = None

try:
    from transformers import AutoTokenizer, AutoModelForCausalLM
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    AutoTokenizer = None
    AutoModelForCausalLM = None
    torch = None

# Global variable to cache loaded local model
_local_model_cache = {"model": None, "tokenizer": None, "model_name": None}


def extract_document_timestamp(pdf_path: str, metadata: Dict) -> Optional[str]:
    """
    Extract document timestamp from PDF metadata or filename.
    Returns ISO format timestamp string or None.
    """
    # Try to get date from PDF metadata
    if metadata:
        # Check common metadata fields
        for field in ['CreationDate', 'ModDate', 'Creation-Date', 'Modification-Date']:
            if field in metadata:
                try:
                    # PDF dates are often in format: D:20240412103500Z
                    date_str = metadata[field]
                    if date_str.startswith('D:'):
                        date_str = date_str[2:]  # Remove 'D:' prefix
                    dt = date_parser.parse(date_str)
                    return dt.isoformat()
                except (ValueError, TypeError):
                    continue
    
    # Try to extract date from filename (e.g., EFTA00011414.pdf)
    filename = Path(pdf_path).stem
    # Look for date patterns in filename
    # This is a simple heuristic - adjust based on your naming convention
    
    return None


def load_local_model(model_name: str = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"):
    """
    Load a local LLM model using transformers.
    Caches the model to avoid reloading.
    """
    global _local_model_cache
    
    if _local_model_cache["model_name"] == model_name and _local_model_cache["model"] is not None:
        return _local_model_cache["model"], _local_model_cache["tokenizer"]
    
    if not TRANSFORMERS_AVAILABLE:
        raise ImportError("transformers library not available. Install with: pip install transformers torch")
    
    print(f"Loading local model: {model_name}...", file=sys.stderr)
    
    try:
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto" if torch.cuda.is_available() else None,
            low_cpu_mem_usage=True
        )
        
        if not torch.cuda.is_available():
            model = model.to("cpu")
        
        # Cache the model
        _local_model_cache["model"] = model
        _local_model_cache["tokenizer"] = tokenizer
        _local_model_cache["model_name"] = model_name
        
        print(f"Model loaded successfully!", file=sys.stderr)
        return model, tokenizer
    
    except Exception as e:
        raise Exception(f"Failed to load local model {model_name}: {str(e)}")


def fix_json_string(json_str: str) -> str:
    """
    Attempt to fix common JSON issues in model output.
    """
    import re
    
    # Remove leading/trailing whitespace
    json_str = json_str.strip()
    
    # Remove any text before first {
    if "{" in json_str:
        json_str = json_str[json_str.find("{"):]
    
    # Remove any text after last }
    if "}" in json_str:
        json_str = json_str[:json_str.rfind("}") + 1]
    
    # Fix common issues: single quotes to double quotes
    json_str = json_str.replace("'", '"')
    
    # Fix trailing commas
    json_str = re.sub(r',\s*}', '}', json_str)
    json_str = re.sub(r',\s*]', ']', json_str)
    
    # Fix unquoted keys
    json_str = re.sub(r'(\w+):', r'"\1":', json_str)
    
    # Fix escaped quotes in strings
    json_str = json_str.replace('\\"', '"')
    
    return json_str


def generate_with_local_model(text: str, model_name: str) -> Tuple[str, str, Optional[str]]:
    """
    Generate summaries and extract date using a local model.
    """
    import sys
    
    try:
        model, tokenizer = load_local_model(model_name)
        
        # Truncate text if too long
        text_to_process = text[:2000] if len(text) > 2000 else text
        
        # Use a simple prompt format that works with base LLaMA models
        # Check if model uses special tokens (chat models) or plain format (base models)
        is_chat_model = any(token in tokenizer.get_vocab() for token in ["<|system|>", "<|user|>", "<|assistant|>"])
        
        if is_chat_model:
            # Chat model format (TinyLlama, etc.)
            prompt = f"""<|system|>
You are a helpful assistant that extracts summaries and dates from documents. Always respond with valid JSON.<|user|>
Analyze the following text and provide:
1. A one-sentence summary (concise, informative)
2. A paragraph summary (2-3 sentences, more detailed)
3. Extract the primary date mentioned in the text (format: YYYY-MM-DD, or null if no clear date)

Text:
{text_to_process}

Respond in JSON format:
{{
  "one_sentence_summary": "...",
  "paragraph_summary": "...",
  "date": "YYYY-MM-DD" or null
}}<|assistant|>
"""
        else:
            # Base model format (Sheared-LLaMA, etc.) - very simple and direct
            # Use minimal prompt to avoid confusion
            prompt = f"""Text: {text_to_process}

Extract summary and date. Return JSON:
{{"one_sentence_summary": "...", "paragraph_summary": "...", "date": "YYYY-MM-DD"}}
"""
        
        # Tokenize
        inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=2048)
        input_length = inputs.input_ids.shape[1]
        
        # Move to device
        device = next(model.parameters()).device
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        # Set pad token if not set
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        
        # Generate with adjusted parameters for better JSON output
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=300,
                temperature=0.3,  # Lower temperature for more deterministic output
                do_sample=True,
                top_p=0.95,
                top_k=50,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
                repetition_penalty=1.2,
                no_repeat_ngram_size=3,  # Prevent repetition
                early_stopping=True
            )
        
        # Decode only the new tokens (not the prompt)
        generated_tokens = outputs[0][input_length:]
        response = tokenizer.decode(generated_tokens, skip_special_tokens=True)
        
        # Clean up response - remove any obvious error patterns
        if "statusCode" in response or "error" in response.lower() or "exception" in response.lower():
            # Model generated error-like response, try to extract any valid JSON
            response = response.replace("statusCode", "").replace("message", "").replace("exception", "")
            # Look for actual JSON structure
            if "{" in response and "one_sentence_summary" not in response:
                # Response is corrupted, try to salvage
                response = ""
        
        # Always show response on error for debugging
        show_debug = os.getenv("DEBUG_LLM", "").lower() == "true"
        
        # Extract JSON from response
        # Try multiple extraction methods
        json_text = None
        
        # Method 1: Look for JSON in code blocks
        if "```json" in response:
            json_text = response.split("```json")[1].split("```")[0].strip()
        elif "```" in response:
            json_text = response.split("```")[1].split("```")[0].strip()
        
        # Method 2: Extract JSON object directly
        if not json_text and "{" in response:
            start = response.find("{")
            end = response.rfind("}") + 1
            if end > start:
                json_text = response[start:end]
        
        # Method 3: Try the whole response
        if not json_text:
            json_text = response.strip()
        
        # Try to fix common JSON issues
        json_text = fix_json_string(json_text)
        
        # Parse JSON with multiple attempts
        result = None
        parse_error = None
        
        # Attempt 1: Direct parse
        try:
            result = json.loads(json_text)
        except json.JSONDecodeError as e:
            parse_error = str(e)
            # Attempt 2: Try fixing and parsing again
            try:
                # More aggressive fixing
                json_text_fixed = json_text
                # Remove any non-JSON text at the start/end
                if "{" in json_text_fixed:
                    json_text_fixed = json_text_fixed[json_text_fixed.find("{"):]
                if "}" in json_text_fixed:
                    json_text_fixed = json_text_fixed[:json_text_fixed.rfind("}") + 1]
                
                result = json.loads(json_text_fixed)
            except json.JSONDecodeError as e2:
                parse_error = f"{parse_error}; Fixed attempt: {str(e2)}"
        
        if result:
            # Extract values, handling nested structures
            one_sentence_raw = result.get("one_sentence_summary", "")
            paragraph_raw = result.get("paragraph_summary", "")
            date_raw = result.get("date")
            
            # Handle nested structures (model sometimes returns objects instead of strings)
            if isinstance(one_sentence_raw, dict):
                one_sentence = one_sentence_raw.get("text", "").strip() if isinstance(one_sentence_raw.get("text"), str) else str(one_sentence_raw).strip()
            elif isinstance(one_sentence_raw, list):
                one_sentence = " ".join(str(x) for x in one_sentence_raw).strip()
            else:
                one_sentence = str(one_sentence_raw).strip() if one_sentence_raw else ""
            
            if isinstance(paragraph_raw, dict):
                paragraph = paragraph_raw.get("text", "").strip() if isinstance(paragraph_raw.get("text"), str) else str(paragraph_raw).strip()
            elif isinstance(paragraph_raw, list):
                paragraph = " ".join(str(x) for x in paragraph_raw).strip()
            else:
                paragraph = str(paragraph_raw).strip() if paragraph_raw else ""
            
            # Handle date
            if isinstance(date_raw, dict):
                date = date_raw.get("date") or date_raw.get("value")
            elif isinstance(date_raw, list) and len(date_raw) > 0:
                date = date_raw[0]
            else:
                date = date_raw
            
            # Convert date to string if it's not None
            if date is not None:
                date = str(date).strip()
                # Validate date format (basic check)
                if date.lower() in ["null", "none", ""]:
                    date = None
            
            # Validate we got something
            if one_sentence or paragraph:
                return (one_sentence, paragraph, date)
        
        # If we get here, parsing failed
        # Check if model generated error-like response
        is_error_response = any(keyword in response.lower() for keyword in ["statuscode", "error", "exception", "failed", "500", "404"])
        
        if is_error_response:
            print(f"Warning: Model generated error-like response. This may indicate the model is struggling with the task.", file=sys.stderr)
            print(f"Model output: {response[:300]}", file=sys.stderr)
        else:
            print(f"Warning: Could not parse JSON from model response: {parse_error}", file=sys.stderr)
            print(f"Model output (first 500 chars): {response[:500]}", file=sys.stderr)
        
        if show_debug:
            print(f"DEBUG - Full response: {response}", file=sys.stderr)
            print(f"DEBUG - Extracted JSON text: {json_text[:500] if json_text else 'None'}", file=sys.stderr)
        
        # Fallback to simple extraction
        one_sent, para = generate_summary(text)
        return (one_sent, para, None)
    
    except Exception as e:
        print(f"Warning: Local model processing failed ({str(e)}), using fallback extraction", file=sys.stderr)
        import traceback
        if os.getenv("DEBUG_LLM", "").lower() == "true":
            traceback.print_exc()
        one_sent, para = generate_summary(text)
        return (one_sent, para, None)


def generate_summary_with_llm(
    text: str,
    llm_type: str = "openai",
    api_key: Optional[str] = None,
    model: str = "gpt-4o-mini",
    use_llm: bool = True
) -> Tuple[str, str, Optional[str]]:
    """
    Generate summaries and extract date using LLM (OpenAI or local).
    
    Args:
        text: Input text to process
        llm_type: Type of LLM to use ("openai" or "local")
        api_key: OpenAI API key (defaults to OPENAI_API_KEY env var, only for OpenAI)
        model: Model name/identifier (OpenAI model name or HuggingFace model path)
        use_llm: Whether to use LLM (if False, falls back to simple extraction)
    
    Returns:
        Tuple of (one_sentence_summary, paragraph_summary, date)
    """
    import sys
    
    # Check if LLM should be used
    if not use_llm:
        one_sent, para = generate_summary(text)
        return (one_sent, para, None)
    
    # Use local model
    if llm_type == "local":
        if not TRANSFORMERS_AVAILABLE:
            print("Warning: transformers not available, falling back to simple extraction", file=sys.stderr)
            one_sent, para = generate_summary(text)
            return (one_sent, para, None)
        return generate_with_local_model(text, model)
    
    # Use OpenAI
    elif llm_type == "openai":
        if not OPENAI_AVAILABLE:
            print("Warning: OpenAI library not available, falling back to simple extraction", file=sys.stderr)
            one_sent, para = generate_summary(text)
            return (one_sent, para, None)
        
        # Get API key from env if not provided
        if api_key is None:
            api_key = os.getenv("OPENAI_API_KEY")
        
        if not api_key:
            print("Error: OpenAI API key not found. Set OPENAI_API_KEY environment variable or use --llm-api-key flag.", file=sys.stderr)
            one_sent, para = generate_summary(text)
            return (one_sent, para, None)
        
        # Clean API key (remove quotes if accidentally included)
        api_key = api_key.strip().strip('"').strip("'")
        
        try:
            # Initialize client with timeout
            client = OpenAI(
                api_key=api_key,
                timeout=30.0,  # 30 second timeout
                max_retries=2  # Retry up to 2 times on connection errors
            )
            
            # Verify API key format (basic check)
            if not api_key.startswith("sk-"):
                print("Warning: API key format looks incorrect. Should start with 'sk-'", file=sys.stderr)
            
            # Truncate text if too long (to save tokens and stay within context limits)
            # Use more text for better summaries (up to 8000 chars for gpt-4o-mini)
            text_to_process = text[:8000] if len(text) > 8000 else text
            
            prompt = f"""You are a document summarizer. Analyze the following text and extract:
1. A one-sentence summary (concise, informative, grounded in the text)
2. A paragraph summary (2-3 sentences, more detailed)
3. The primary date mentioned in the text (format: YYYY-MM-DD, or null if no clear date)

IMPORTANT: Respond with ONLY valid JSON. Do not include markdown code blocks or any other text.

Text:
{text_to_process}

JSON response (use this exact structure):
{{
  "one_sentence_summary": "your one sentence summary here",
  "paragraph_summary": "your paragraph summary here",
  "date": "YYYY-MM-DD" or null
}}"""

            # Try with JSON mode if supported (gpt-4o, gpt-4-turbo, etc.)
            # Fall back to regular mode for older models
            response = None
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": "You are a document summarizer. Always respond with valid JSON only. Do not include markdown, explanations, or any text outside the JSON object."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=600,
                    response_format={"type": "json_object"}
                )
            except Exception as json_mode_error:
                # Fallback for models that don't support response_format
                try:
                    response = client.chat.completions.create(
                        model=model,
                        messages=[
                            {"role": "system", "content": "You are a document summarizer. Always respond with valid JSON only. Do not include markdown, explanations, or any text outside the JSON object."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.3,
                        max_tokens=600
                    )
                except Exception as fallback_error:
                    # Re-raise the original error if both fail
                    raise json_mode_error from fallback_error
            
            if not response:
                raise Exception("No response from OpenAI API")
            
            # Parse response
            content = response.choices[0].message.content.strip()
            
            # Try to extract JSON from response (might have markdown code blocks)
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            result = json.loads(content)
            
            one_sentence = result.get("one_sentence_summary", "")
            paragraph = result.get("paragraph_summary", "")
            date = result.get("date")
            
            return (one_sentence, paragraph, date)
        
        except Exception as e:
            # Provide more helpful error messages
            error_msg = str(e)
            error_type = type(e).__name__
            
            # Check for specific OpenAI API errors
            is_auth_error = False
            is_connection_error = False
            
            # Check error message and status code if available
            if hasattr(e, 'status_code'):
                if e.status_code == 401:
                    is_auth_error = True
                elif e.status_code in [429, 503]:
                    print(f"Error: OpenAI API rate limit or service unavailable. Please wait a moment and try again.", file=sys.stderr)
                elif e.status_code >= 500:
                    is_connection_error = True
            
            if "401" in error_msg or "authentication" in error_msg.lower() or "invalid" in error_msg.lower() or "unauthorized" in error_msg.lower() or is_auth_error:
                print(f"Error: OpenAI API authentication failed. Please check your API key.", file=sys.stderr)
                print(f"  API Key set: {'Yes' if api_key else 'No'}", file=sys.stderr)
                if api_key:
                    # Show first and last few chars for debugging (don't expose full key)
                    key_preview = f"{api_key[:7]}...{api_key[-4:]}" if len(api_key) > 11 else "***"
                    print(f"  API Key preview: {key_preview}", file=sys.stderr)
                    print(f"  API Key length: {len(api_key)} characters", file=sys.stderr)
                    print(f"  API Key format: {'Valid (starts with sk-)' if api_key.startswith('sk-') else 'Invalid (should start with sk-)'}", file=sys.stderr)
                print(f"  Set OPENAI_API_KEY environment variable or use --llm-api-key flag", file=sys.stderr)
                print(f"  Verify your key at: https://platform.openai.com/api-keys", file=sys.stderr)
            elif "Connection" in error_type or "connection" in error_msg.lower() or is_connection_error:
                print(f"Error: Failed to connect to OpenAI API. Check your internet connection and API key.", file=sys.stderr)
                print(f"  API Key set: {'Yes' if api_key else 'No'}", file=sys.stderr)
                print(f"  API Key format: {'Valid' if api_key and api_key.startswith('sk-') else 'Invalid'}", file=sys.stderr)
            elif "rate limit" in error_msg.lower():
                print(f"Error: OpenAI API rate limit exceeded. Please wait a moment and try again.", file=sys.stderr)
            else:
                print(f"Warning: LLM processing failed ({error_type}: {error_msg}), using fallback extraction", file=sys.stderr)
                # Show API key status for debugging
                if api_key:
                    print(f"  API Key set: Yes (length: {len(api_key)}, starts with sk-: {api_key.startswith('sk-')})", file=sys.stderr)
            
            # Fallback to simple extraction on error
            one_sent, para = generate_summary(text)
            return (one_sent, para, None)
    
    else:
        # Unknown LLM type, fallback
        one_sent, para = generate_summary(text)
        return (one_sent, para, None)


def generate_summary(text: str, max_sentence_length: int = 200) -> Tuple[str, str]:
    """
    Generate a 1-sentence summary and a paragraph summary from text.
    
    Args:
        text: Input text to summarize
        max_sentence_length: Maximum length for 1-sentence summary
    
    Returns:
        Tuple of (one_sentence_summary, paragraph_summary)
    """
    if not text or len(text.strip()) == 0:
        return "", ""
    
    # Simple extractive summarization: take first sentence and first paragraph
    sentences = text.split('. ')
    
    # One sentence summary: first meaningful sentence (skip very short ones)
    one_sentence = ""
    for sentence in sentences:
        sentence = sentence.strip()
        if len(sentence) > 20:  # Skip very short sentences
            one_sentence = sentence
            if not one_sentence.endswith('.'):
                one_sentence += '.'
            break
    
    # Truncate if too long
    if len(one_sentence) > max_sentence_length:
        one_sentence = one_sentence[:max_sentence_length].rsplit(' ', 1)[0] + '...'
    
    # Paragraph summary: first 2-3 sentences or first 300 chars
    paragraph_summary = ""
    if len(sentences) > 0:
        # Take first few sentences
        para_sentences = []
        char_count = 0
        for sentence in sentences[:3]:
            sentence = sentence.strip()
            if len(sentence) > 10:
                if char_count + len(sentence) > 300:
                    break
                para_sentences.append(sentence)
                char_count += len(sentence)
        
        paragraph_summary = '. '.join(para_sentences)
        if paragraph_summary and not paragraph_summary.endswith('.'):
            paragraph_summary += '.'
    
    # Fallback: if no good summary, use first 300 chars
    if not paragraph_summary:
        paragraph_summary = text[:300].strip()
        if len(text) > 300:
            paragraph_summary += '...'
    
    return one_sentence, paragraph_summary


def parse_pdf(
    pdf_path: str,
    doc_id: Optional[str] = None,
    source_uri: Optional[str] = None,
    source_type: str = "pdf",
    use_llm: bool = True,
    llm_type: str = "openai",
    llm_api_key: Optional[str] = None,
    llm_model: str = "gpt-4o-mini"
) -> List[Dict]:
    """
    Parse a PDF file and extract text per page with metadata.
    
    Args:
        pdf_path: Path to the PDF file
        doc_id: Document ID (defaults to filename without extension)
        source_uri: Source URI (defaults to file path)
        source_type: Source type (pdf, email, image, web)
    
    Returns:
        List of page objects in NER input schema format
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")
    
    # Generate doc_id if not provided
    if doc_id is None:
        doc_id = Path(pdf_path).stem
    
    # Generate source_uri if not provided
    if source_uri is None:
        source_uri = f"file://{os.path.abspath(pdf_path)}"
    
    # Extract document timestamp from metadata
    document_timestamp = None
    pages_data = []
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            # Get PDF metadata
            metadata = pdf.metadata or {}
            document_timestamp = extract_document_timestamp(pdf_path, metadata)
            
            # Process each page
            for page_num, page in enumerate(pdf.pages, start=1):
                # Extract text from page
                text = page.extract_text()
                
                if text is None or len(text.strip()) == 0:
                    # Skip empty pages
                    continue
                
                # Clean text (remove excessive whitespace)
                text = ' '.join(text.split())
                
                # Generate summaries and extract date using LLM or fallback
                one_sentence_summary, paragraph_summary, date = generate_summary_with_llm(
                    text,
                    llm_type=llm_type,
                    api_key=llm_api_key,
                    model=llm_model,
                    use_llm=use_llm
                )
                
                # Create page ID
                page_id = f"{doc_id}#p{page_num:02d}"
                
                # Create page data object
                page_data = {
                    "doc_id": doc_id,
                    "source_type": source_type,
                    "source_uri": source_uri,
                    "page_id": page_id,
                    "text": text,
                    "page_number": page_num,
                    "extracted_at": datetime.utcnow().isoformat() + "Z",
                    "one_sentence_summary": one_sentence_summary,
                    "paragraph_summary": paragraph_summary
                }
                
                # Add date if extracted
                if date:
                    page_data["date"] = date
                
                # Add document timestamp if available
                if document_timestamp:
                    page_data["document_timestamp"] = document_timestamp
                
                pages_data.append(page_data)
    
    except Exception as e:
        raise Exception(f"Error parsing PDF {pdf_path}: {str(e)}")
    
    return pages_data


def parse_pdf_to_json(
    pdf_path: str,
    output_path: Optional[str] = None,
    doc_id: Optional[str] = None,
    source_uri: Optional[str] = None,
    source_type: str = "pdf",
    use_llm: bool = True,
    llm_type: str = "openai",
    llm_api_key: Optional[str] = None,
    llm_model: str = "gpt-4o-mini"
) -> List[Dict]:
    """
    Parse a PDF and save results to JSON file.
    
    Args:
        pdf_path: Path to the PDF file
        output_path: Path to save JSON output (defaults to pdf_path with .json extension)
        doc_id: Document ID
        source_uri: Source URI
        source_type: Source type
    
    Returns:
        List of page objects (flattened structure)
    """
    pages_data = parse_pdf(
        pdf_path, 
        doc_id, 
        source_uri, 
        source_type,
        use_llm=use_llm,
        llm_type=llm_type,
        llm_api_key=llm_api_key,
        llm_model=llm_model
    )
    
    # Save to JSON if output path provided
    if output_path:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(pages_data, f, indent=2, ensure_ascii=False)
        print(f"✓ Parsed {len(pages_data)} pages, saved to {output_path}")
    
    return pages_data


def main():
    """CLI interface for PDF parser."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Parse PDF documents for NER processing')
    parser.add_argument('pdf_path', help='Path to PDF file')
    parser.add_argument('-o', '--output', help='Output JSON file path')
    parser.add_argument('--doc-id', help='Document ID (defaults to filename)')
    parser.add_argument('--source-uri', help='Source URI')
    parser.add_argument('--source-type', default='pdf', choices=['pdf', 'email', 'image', 'web'],
                       help='Source type')
    parser.add_argument('--use-llm', action='store_true', default=True,
                       help='Use LLM for summarization and date extraction (default: True)')
    parser.add_argument('--no-llm', dest='use_llm', action='store_false',
                       help='Disable LLM, use simple extraction instead')
    parser.add_argument('--llm-type', default='openai', choices=['openai', 'local'],
                       help='LLM type: openai (API) or local (HuggingFace model)')
    parser.add_argument('--llm-api-key', help='OpenAI API key (or set OPENAI_API_KEY env var)')
    parser.add_argument('--llm-model', default='gpt-4o-mini',
                       help='LLM model: OpenAI model name or HuggingFace model path (default: gpt-4o-mini, or TinyLlama/TinyLlama-1.1B-Chat-v1.0 for local)')
    
    args = parser.parse_args()
    
    # Set default model based on llm_type
    if args.llm_type == 'local' and args.llm_model == 'gpt-4o-mini':
        args.llm_model = 'TinyLlama/TinyLlama-1.1B-Chat-v1.0'
    
    try:
        result = parse_pdf_to_json(
            args.pdf_path,
            output_path=args.output,
            doc_id=args.doc_id,
            source_uri=args.source_uri,
            source_type=args.source_type,
            use_llm=args.use_llm,
            llm_type=args.llm_type,
            llm_api_key=args.llm_api_key,
            llm_model=args.llm_model
        )
        
        if not args.output:
            # Print to stdout if no output file specified
            print(json.dumps(result, indent=2, ensure_ascii=False))
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    import sys
    main()
