"""
PDF parsing functionality (from old parsing_pdfs file)
"""
import os
import json
import re
from collections import defaultdict
from typing import Dict, List, Tuple
import pdfplumber


class PDFParser:
    def __init__(self):
        self.gs_split_regexes = [
            r"^GS[1-4]\s*$",
            r"^GS\s*[1-4]\s*$",
        ]
        self.topic_split_regexes = [
            r"\btopic\s*\d*\s*[:\-–—]\s*",
            r"\bTopic\s*\d*\s*:\s*",
        ]
        self.question_split_regex = r"\s*\b\d{1,2}\.\s*"

    def normalize_text(self, text: str) -> str:
        """Normalize text by cleaning whitespace"""
        text = re.sub(r"\s*\n\s*", " ", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def clean_question(self, q: str) -> str:
        """Clean individual question text"""
        q = re.sub(r"\s*[\u0000-\u001F\u2000-\u206F]*\d{4}[\u0000-\u001F\u2000-\u206F]*\s*$", "", q)
        q = re.sub(r"^\s*Year:\s*\d{4}\s*\|?\s*", "", q, flags=re.I)
        return q.strip(" -:—").strip()

    def extract_gs_number(self, text: str) -> str:
        """Extract GS number from header text"""
        match = re.search(r"GS\s*([1-4])", text, re.IGNORECASE)
        if match:
            return f"GS{match.group(1)}"
        return "GS1"

    def process_gs_block(self, block_text: str, gs_number: str) -> Dict[str, List[str]]:
        """Process a GS block to extract topics and questions"""
        block_text = self.normalize_text(block_text)
        topic_map = defaultdict(list)
        
        # Split by topics within this GS block
        topic_combined = re.compile("|".join(f"(?:{r})" for r in self.topic_split_regexes), re.IGNORECASE)
        topic_blocks = topic_combined.split(block_text)
        
        if topic_blocks and not topic_blocks[0].strip():
            topic_blocks = topic_blocks[1:]
        
        for topic_block in topic_blocks:
            if not topic_block.strip():
                continue
                
            topic_title, questions_text = self._extract_topic_and_questions(topic_block)
            
            if topic_title and questions_text:
                questions = self._split_and_clean_questions(questions_text)
                if questions:
                    full_topic_name = f"{gs_number} - {topic_title}"
                    topic_map[full_topic_name].extend(questions)
        
        return topic_map

    def _extract_topic_and_questions(self, topic_block: str) -> Tuple[str, str]:
        """Extract topic title and questions text from a topic block"""
        topic_title = ""
        questions_text = ""
        
        # Primary: split by 'questions' label variants
        m = re.search(r"\bquestions?\s*[:\-–—]\s*", topic_block, re.IGNORECASE)
        if m:
            topic_title = topic_block[:m.start()].strip(" -:—").strip()
            questions_text = topic_block[m.end():].strip()
        else:
            # Fallback: derive topic title as text before first numbered question
            parts = re.split(self.question_split_regex, topic_block)
            if len(parts) >= 2:
                topic_title = parts[0].strip(" -:—").strip()
                questions_text = topic_block[len(parts[0]):].strip()
        
        return topic_title, questions_text

    def _split_and_clean_questions(self, questions_text: str) -> List[str]:
        """Split questions text into individual cleaned questions"""
        q_parts = re.split(self.question_split_regex, questions_text)
        q_items = [p for p in q_parts if p and not p.strip().lower().startswith(("questions", "question"))]
        
        cleaned = []
        for q in q_items:
            c = self.clean_question(q)
            if c:
                cleaned.append(c)
        
        return cleaned

    def extract_from_text(self, text: str) -> Dict[str, List[str]]:
        """Extract topics and questions from text"""
        lines = text.split('\n')
        final_topic_map = defaultdict(list)
        current_gs = "GS1"
        current_block = ""
        gs_blocks = []
        
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            
            # Check if this line is a GS header
            is_gs_header = False
            detected_gs = None
            for regex in self.gs_split_regexes:
                if re.match(regex, line, re.IGNORECASE):
                    is_gs_header = True
                    detected_gs = self.extract_gs_number(line)
                    break
            
            if is_gs_header:
                if current_block.strip():
                    gs_blocks.append((current_gs, current_block))
                current_gs = detected_gs
                current_block = ""
                i += 1
                continue
            
            current_block += line + "\n"
            i += 1
        
        # Process the last block
        if current_block.strip():
            gs_blocks.append((current_gs, current_block))
        
        # Process all GS blocks
        for gs_number, block_text in gs_blocks:
            topics = self.process_gs_block(block_text, gs_number)
            for topic, questions in topics.items():
                final_topic_map[topic].extend(questions)
        
        return final_topic_map

    def extract_from_pdf(self, pdf_path: str) -> Dict[str, List[str]]:
        """Extract text from PDF and process it"""
        text = ""
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            print(f"Error reading {pdf_path}: {e}")
            return {}
        
        if not text.strip():
            print(f"No text extracted from {pdf_path}")
            return {}
        
        return self.extract_from_text(text)

    def process_directory(self, input_dir: str = "pyq_data") -> Tuple[Dict[str, List[str]], List[Dict]]:
        """Process all PDFs in directory and return organized data"""
        if not os.path.exists(input_dir) or not os.listdir(input_dir):
            print(f"Directory '{input_dir}' is empty or does not exist.")
            return {}, []

        input_files = [
            os.path.join(input_dir, f) 
            for f in os.listdir(input_dir) 
            if f.lower().endswith(".pdf")
        ]

        final_topic_map = defaultdict(list)

        for file in input_files:
            print(f"Processing: {file}")
            topic_map = self.extract_from_pdf(file)
            for topic, questions in topic_map.items():
                final_topic_map[topic].extend(questions)

        # Organize by GS papers
        organized_output = []
        gs_topics = defaultdict(list)
        
        for topic, questions in final_topic_map.items():
            for gs_num in ["GS1", "GS2", "GS3", "GS4"]:
                if topic.startswith(gs_num):
                    gs_topics[gs_num].append({"topic": topic, "questions": questions})
                    break
            else:
                gs_topics["GS1"].append({"topic": topic, "questions": questions})
        
        # Create organized structure
        for gs_paper in ["GS1", "GS2", "GS3", "GS4"]:
            if gs_topics[gs_paper]:
                organized_output.append({
                    "gs_paper": gs_paper,
                    "topics": gs_topics[gs_paper]
                })

        return dict(final_topic_map), organized_output


# Factory function
def create_pdf_parser() -> PDFParser:
    """Factory function to create PDF parser instance"""
    return PDFParser()