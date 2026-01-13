"""
File parsing service for PDF, text, and markdown files
"""

import os
import re
from typing import Optional
import pdfplumber
import PyPDF2
import markdown

class FileParser:
    @staticmethod
    def sanitize_text(text: str) -> str:
        """
        Sanitize text to remove characters that cannot be stored in PostgreSQL TEXT columns.
        
        Removes:
        - Null bytes (\u0000) - PostgreSQL cannot store these in TEXT columns
        - Invalid Unicode escape sequences
        - Other problematic control characters (except common whitespace)
        
        Args:
            text: Raw text content to sanitize
            
        Returns:
            Sanitized text safe for database storage
        """
        if not text:
            return ""
        
        # Ensure we're working with a string (handle None/bytes if needed)
        if isinstance(text, bytes):
            try:
                text = text.decode('utf-8', errors='replace')
            except Exception:
                text = text.decode('utf-8', errors='replace')
        
        # Remove null bytes (PostgreSQL cannot store \u0000 in TEXT)
        # Use multiple methods to catch all variations
        text = text.replace('\x00', '')
        text = text.replace('\u0000', '')
        text = text.replace('\0', '')
        
        # Remove other problematic control characters (keep common whitespace: \n, \r, \t)
        # Keep: \n (LF), \r (CR), \t (TAB), space (0x20)
        # Remove: other control characters (0x00-0x1F except \n=0x0A, \r=0x0D, \t=0x09)
        cleaned_chars = []
        for char in text:
            char_code = ord(char)
            # Keep printable characters (>= 32) and common whitespace (\n, \r, \t)
            if char_code >= 32 or char in ['\n', '\r', '\t']:
                cleaned_chars.append(char)
            elif char_code == 0:  # Null byte - explicitly remove
                continue
            else:
                # Replace other control characters with space
                cleaned_chars.append(' ')
        text = ''.join(cleaned_chars)
        
        # Ensure valid UTF-8 encoding (fix any encoding issues)
        try:
            # Re-encode and decode to ensure valid UTF-8
            text = text.encode('utf-8', errors='replace').decode('utf-8', errors='replace')
        except Exception:
            # If encoding fails, use a more aggressive replacement strategy
            text = text.encode('utf-8', errors='ignore').decode('utf-8', errors='replace')
        
        # Final check: ensure no null bytes remain
        text = text.replace('\x00', '').replace('\u0000', '').replace('\0', '')
        
        return text.strip()
    @staticmethod
    def parse_pdf(file_path: str) -> str:
        """Extract text from PDF file"""
        text = ""
        
        # Try pdfplumber first (better for structured content)
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception:
            # Fallback to PyPDF2
            try:
                with open(file_path, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    for page in pdf_reader.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"
            except Exception as e:
                raise ValueError(f"Error parsing PDF: {str(e)}")
        
        # Sanitize text before returning (removes null bytes, invalid Unicode, etc.)
        return FileParser.sanitize_text(text)
    
    @staticmethod
    def parse_text(file_path: str) -> str:
        """Extract text from plain text file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                text = file.read()
        except UnicodeDecodeError:
            # If UTF-8 fails, try with error handling
            with open(file_path, 'r', encoding='utf-8', errors='replace') as file:
                text = file.read()
        
        # Sanitize text before returning (removes null bytes, invalid Unicode, etc.)
        return FileParser.sanitize_text(text)
    
    @staticmethod
    def parse_markdown(file_path: str) -> str:
        """Extract text from markdown file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                md_content = file.read()
        except UnicodeDecodeError:
            # If UTF-8 fails, try with error handling
            with open(file_path, 'r', encoding='utf-8', errors='replace') as file:
                md_content = file.read()
        
        # Convert markdown to plain text (remove formatting)
        html = markdown.markdown(md_content)
        # Simple HTML tag removal (for basic text extraction)
        text = re.sub('<[^<]+?>', '', html)
        
        # Sanitize text before returning (removes null bytes, invalid Unicode, etc.)
        return FileParser.sanitize_text(text)
    
    @staticmethod
    def parse_file(file_path: str, file_type: Optional[str] = None) -> str:
        """Parse file based on type"""
        if not file_type:
            # Infer from extension
            ext = os.path.splitext(file_path)[1].lower()
            if ext == '.pdf':
                file_type = 'pdf'
            elif ext in ['.md', '.markdown']:
                file_type = 'markdown'
            else:
                file_type = 'text'
        
        if file_type == 'pdf':
            return FileParser.parse_pdf(file_path)
        elif file_type == 'markdown':
            return FileParser.parse_markdown(file_path)
        else:
            return FileParser.parse_text(file_path)

