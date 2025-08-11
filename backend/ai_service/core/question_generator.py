"""
Question generation functionality - extracted from app.py
"""
import os
import time
import random
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from langchain.prompts import PromptTemplate
from langchain_groq import ChatGroq
from langchain_community.vectorstores import FAISS
import requests
from diskcache import Cache
import logging

logger = logging.getLogger(__name__)

class QuestionGenerator:
    def __init__(self, groq_api_key: str, vectorstore: FAISS, cache_dir: str = "news_cache"):
        self.llm = ChatGroq(
            model=os.getenv("GROQ_MODEL", "llama3-70b-8192"),
            groq_api_key=groq_api_key,
            # Slightly higher default temperature for more variety; can be overridden via env
            temperature=float(os.getenv("GROQ_TEMPERATURE", "0.7"))
        )
        self.vectorstore = vectorstore
        self.cache = Cache(cache_dir)
        self.topics_by_subject = self._build_topics_by_subject()
        self._setup_templates()

    def _setup_templates(self):
        """Setup prompt templates for question generation"""
        self.gs_template = """You are a UPSC Mains question paper designer for {subject}.
Given the following example questions from the topic: "{topic}", generate {num} new high-quality, original UPSC Mains-style questions.

Examples:
{examples}

IMPORTANT INSTRUCTIONS:
1. Generate ONLY {num} questions
2. Number each question as: 1., 2., 3., etc.
3. Do NOT use bold formatting (**text**)
4. Do NOT add any commentary or explanatory text
5. Each question should be a single clear sentence
6. Focus on analytical and critical thinking aspects

Generate exactly {num} questions now:"""

        self.whole_paper_template = """You are a UPSC Mains question paper designer for {subject}.
Based on the following topics and example questions, create a complete question paper with exactly 10 high-quality questions.

Topics and Examples:
{topic_examples}

IMPORTANT INSTRUCTIONS:
1. Generate exactly 10 questions total
2. Number all questions sequentially (1., 2., 3., ..., 10.)
3. Do NOT use bold formatting (**text**)
4. Do NOT add commentary or explanatory text
5. Mix questions from different topics naturally
6. Each question should be analytical and exam-appropriate
7. Generate ONLY the questions, no additional text

Generate the complete 10-question paper now:"""

        self.gs_prompt = PromptTemplate.from_template(self.gs_template)
        self.whole_paper_prompt = PromptTemplate.from_template(self.whole_paper_template)

    def _build_topics_by_subject(self) -> Dict[str, List[str]]:
        """Build topics categorized by GS papers from vectorstore"""
        topics_by_subject = {"GS1": [], "GS2": [], "GS3": [], "GS4": []}
        
        try:
            for _doc_id, doc in self.vectorstore.docstore._dict.items():
                if getattr(doc, "metadata", None) and "topic" in doc.metadata:
                    topic_name = doc.metadata["topic"]
                    
                    # Categorize based on GS prefix in topic name
                    for gs_num in ["GS1", "GS2", "GS3", "GS4"]:
                        if topic_name.startswith(gs_num):
                            topics_by_subject[gs_num].append(topic_name)
                            break
        except Exception as e:
            logger.warning(f"Error building topics from vectorstore: {e}")
        
        # Remove duplicates and sort
        for gs_paper in topics_by_subject:
            topics_by_subject[gs_paper] = sorted(list(set(topics_by_subject[gs_paper])))
        
        return topics_by_subject

    def get_topics_for_subject(self, subject: str) -> List[str]:
        """Get all topics for a specific subject"""
        return self.topics_by_subject.get(subject, [])

    def get_subject_from_topic(self, topic: str) -> str:
        """Determine which subject a topic belongs to"""
        for subject, topics in self.topics_by_subject.items():
            if topic in topics:
                return subject
        return "GS1"  # default

    # ✅ ADD: Missing API methods that your routes expect
    def generate_questions(self, topic: str, num_questions: int = 5) -> List[str]:
        """Generate questions for a topic - API compatibility method"""
        try:
            # Determine subject from topic
            subject = self.get_subject_from_topic(topic)
            
            # Use existing method
            result = self._generate_static_questions(subject, topic, num_questions)
            
            # Parse the formatted result back to a list
            questions = []
            for line in result.split('\n\n'):
                line = line.strip()
                if line and re.match(r'^\d+\.', line):
                    # Remove numbering and clean
                    clean_question = re.sub(r'^\d+\.\s*', '', line).strip()
                    if clean_question:
                        questions.append(clean_question)
            
            return questions[:num_questions]
            
        except Exception as e:
            logger.error(f"Error in generate_questions: {e}")
            # Fallback
            return [f"Analyze the significance of {topic} in contemporary India."]

    def generate_questions_with_ca(self, topic: str, num_questions: int, months: int) -> List[str]:
        """Generate questions with current affairs - API compatibility method"""
        try:
            subject = self.get_subject_from_topic(topic)
            result = self._generate_current_affairs_questions(subject, topic, num_questions, months)
            
            # Parse the formatted result back to a list
            questions = []
            for line in result.split('\n\n'):
                line = line.strip()
                if line and re.match(r'^\d+\.', line):
                    clean_question = re.sub(r'^\d+\.\s*', '', line).strip()
                    if clean_question:
                        questions.append(clean_question)
            
            return questions[:num_questions]
            
        except Exception as e:
            logger.error(f"Error in generate_questions_with_ca: {e}")
            return [f"Analyze {topic} in the context of recent developments from the last {months} months."]

    def generate_whole_paper_with_ca(self, subject: str, months: int) -> List[str]:
        """Generate whole paper with current affairs - API compatibility method"""
        try:
            result = self.generate_whole_paper(subject, use_ca=True, months=months)
            
            # Extract just the questions part (after "## Questions:")
            questions_section = result.split("## Questions:")[-1].split("---")[0].strip()
            
            questions = []
            for line in questions_section.split('\n\n'):
                line = line.strip()
                if line and re.match(r'^\d+\.', line):
                    clean_question = re.sub(r'^\d+\.\s*', '', line).strip()
                    if clean_question:
                        questions.append(clean_question)
            
            return questions[:10]
            
        except Exception as e:
            logger.error(f"Error in generate_whole_paper_with_ca: {e}")
            return self._fallback_paper_questions(subject)

    def _fallback_paper_questions(self, subject: str) -> List[str]:
        """Generate fallback questions for whole paper"""
        fallback_templates = [
            f"Analyze the contemporary relevance of {subject} in Indian governance.",
            f"Discuss the key challenges facing {subject} in modern India.",
            f"Evaluate the impact of recent policy changes in {subject}.",
            f"Examine the role of {subject} in India's development strategy.",
            f"Critically assess the effectiveness of {subject} related initiatives.",
            f"Comment on the future prospects of {subject} in India.",
            f"Discuss the interconnections between {subject} and other policy areas.",
            f"Analyze the historical evolution of {subject} in post-independence India.",
            f"Evaluate the implementation challenges in {subject}.",
            f"Examine the role of stakeholders in {subject} governance."
        ]
        return fallback_templates

    # ✅ Keep all your existing methods unchanged
    def fetch_recent_news(self, topic: str, months: int = 6) -> str:
        """Fetch recent news for current affairs integration"""
        cache_key = f"{topic}_{months}"
        cached = self.cache.get(cache_key)
        if cached and time.time() - cached["timestamp"] < 3600:
            return cached["news"]

        api_key = os.getenv("NEWSAPI_KEY")
        if not api_key:
            return "NEWSAPI_KEY not configured; skipping news fetch."

        url = "https://newsapi.org/v2/everything"
        to_date = datetime.utcnow().date()
        from_date = to_date - timedelta(days=30 * int(months))

        params = {
            "q": topic, "language": "en",
            "from": from_date.isoformat(), "to": to_date.isoformat(),
            "sortBy": "relevancy", "pageSize": 5, "apiKey": api_key
        }

        try:
            response = requests.get(url, params=params, timeout=20)
            response.raise_for_status()
            data = response.json()
            if "articles" in data and data["articles"]:
                news = "\n".join([
                    f"- {a.get('title','').strip()}: {a.get('description','').strip()}" 
                    for a in data["articles"]
                ])
                self.cache.set(cache_key, {"news": news, "timestamp": time.time()})
                return news
            else:
                return "No news articles found for this topic."
        except Exception as e:
            return f"Error fetching news: {str(e)}"

    def format_questions(self, raw_output: str) -> str:
        """Clean and format the question output"""
        lines = raw_output.strip().split('\n')
        formatted_lines = []
        question_counter = 1
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Remove bold formatting
            line = re.sub(r'\*\*(.*?)\*\*', r'\1', line)
            
            # Skip commentary lines
            if line.lower().startswith(('these questions', 'the questions', 'note:', 'instruction', 'this paper')):
                continue
            
            # Check if this is a question line
            if (re.match(r'^\d+\.', line) or 
                line.endswith('?') or 
                any(word in line.lower() for word in ['analyze', 'examine', 'discuss', 'evaluate', 'critically', 'assess'])):
                
                # Remove existing numbering and add proper numbering
                clean_line = re.sub(r'^\d+\.\s*', '', line)
                if clean_line:
                    formatted_lines.append(f"{question_counter}. {clean_line}")
                    question_counter += 1
        
        return '\n\n'.join(formatted_lines)

    def generate_topic_questions(self, subject: str, topic: str, num: int, use_ca: bool, months: int) -> str:
        """Generate questions for a specific topic"""
        if use_ca:
            return self._generate_current_affairs_questions(subject, topic, num, months)
        else:
            return self._generate_static_questions(subject, topic, num)

    def _generate_current_affairs_questions(self, subject: str, topic: str, num: int, months: int) -> str:
        """Generate questions incorporating current affairs"""
        news_context = self.fetch_recent_news(topic, months)
        diversity_seed = random.randint(100000, 999999)
        ca_prompt = f"""You are a UPSC Mains question paper designer for {subject}.
Based on the topic: "{topic}" and recent news, generate {num} high-quality questions incorporating current affairs.

Recent News (Last {months} months):
{news_context}

IMPORTANT INSTRUCTIONS:
1. Generate ONLY {num} questions
2. Number each question as: 1., 2., 3., etc.
3. Do NOT use bold formatting (**text**)
4. Do NOT add any commentary or explanatory text
5. Focus on analytical aspects related to current events

Generate exactly {num} questions now.

Variation guidance (do not include this line or the number in the output): seed {diversity_seed}
"""
        
        response = self.llm.invoke(ca_prompt)
        return self.format_questions(response.content.strip())

    def _generate_static_questions(self, subject: str, topic: str, num: int) -> str:
        """Generate questions using static examples from vectorstore"""
        try:
            filtered_docs = [
                doc for doc in self.vectorstore.docstore._dict.values() 
                if doc.metadata.get("topic") == topic
            ]
            # Shuffle examples for variety across runs
            random.shuffle(filtered_docs)
            # Use up to 8 examples, but at least num to provide context diversity
            examples = [doc.page_content for doc in filtered_docs[:max(1, min(max(num, 3), 8))]]

            if not examples:
                return f"No questions found for topic: {topic}"

            example_text = "\n".join([f"{i+1}. {q}" for i, q in enumerate(examples)])
            diversity_seed = random.randint(100000, 999999)
            final_prompt = self.gs_prompt.format(
                subject=subject, 
                topic=topic, 
                examples=example_text, 
                num=num
            ) + f"\n\nVariation guidance (do not include this line or the number in the output): seed {diversity_seed}"
            response = self.llm.invoke(final_prompt)
            return self.format_questions(response.content.strip())
        except Exception as e:
            logger.error(f"Error in _generate_static_questions: {e}")
            # Fallback
            return f"1. Analyze the significance of {topic} in contemporary India.\n\n2. Discuss the key challenges associated with {topic}."

    def generate_whole_paper(self, subject: str, use_ca: bool, months: int) -> str:
        """Generate a complete paper with 10 questions from random topics"""
        subject_topics = self.topics_by_subject.get(subject, [])
        if not subject_topics:
            return f"No topics found for {subject}"

        # Randomly select topics for variety
        num_topics = min(len(subject_topics), 6)
        selected_topics = random.sample(subject_topics, num_topics)
        
        # Gather example questions from selected topics
        topic_examples = self._gather_topic_examples(selected_topics, subject)
        
        if not topic_examples:
            return f"No example questions found for {subject}"
        
        topic_examples_text = "\n".join(topic_examples)
        
        if use_ca:
            formatted_questions = self._generate_current_affairs_paper(
                subject, selected_topics, topic_examples_text, months
            )
        else:
            diversity_seed = random.randint(100000, 999999)
            final_prompt = self.whole_paper_prompt.format(
                subject=subject, 
                topic_examples=topic_examples_text
            ) + f"\n\nVariation guidance (do not include this line or the number in the output): seed {diversity_seed}"
            response = self.llm.invoke(final_prompt)
            formatted_questions = self.format_questions(response.content.strip())
        
        # Create the final paper content with proper UPSC format
        return self._format_final_paper(subject, formatted_questions)

    def _gather_topic_examples(self, selected_topics: List[str], subject: str) -> List[str]:
        """Gather example questions from selected topics"""
        topic_examples = []
        
        for topic in selected_topics:
            try:
                filtered_docs = [
                    doc for doc in self.vectorstore.docstore._dict.values() 
                    if doc.metadata.get("topic") == topic
                ]
                examples = [doc.page_content for doc in filtered_docs[:3]]
                
                if examples:
                    display_topic = topic.replace(f"{subject} - ", "")
                    topic_examples.append(f"**{display_topic}:**")
                    for i, example in enumerate(examples, 1):
                        topic_examples.append(f"{i}. {example}")
                    topic_examples.append("")  # Empty line for separation
            except Exception as e:
                logger.warning(f"Error gathering examples for topic {topic}: {e}")
        
        return topic_examples

    def _generate_current_affairs_paper(self, subject: str, selected_topics: List[str], 
                                      topic_examples_text: str, months: int) -> str:
        """Generate whole paper with current affairs integration"""
        news_contexts = []
        for topic in selected_topics[:3]:
            news = self.fetch_recent_news(topic, months)
            if news and "not configured" not in news:
                news_contexts.append(f"Recent news for {topic}: {news[:200]}...")
        
        news_text = "\n\n".join(news_contexts) if news_contexts else ""
        
        ca_prompt = f"""You are a UPSC Mains question paper designer for {subject}.
Create a complete question paper with exactly 10 questions incorporating current affairs.

Topics and Examples:
{topic_examples_text}

Recent News Context:
{news_text}

IMPORTANT INSTRUCTIONS:
1. Generate exactly 10 questions total
2. Number all questions sequentially (1., 2., 3., ..., 10.)
3. Do NOT use bold formatting (**text**)
4. Do NOT add commentary or explanatory text
5. Mix questions from different topics naturally
6. Incorporate current affairs where relevant
7. Each question should be analytical and exam-appropriate

Generate the complete 10-question paper now:"""
        
        response = self.llm.invoke(ca_prompt)
        return self.format_questions(response.content.strip())

    def _format_final_paper(self, subject: str, formatted_questions: str) -> str:
        """Format the final paper with proper UPSC format"""
        paper_content = f"""# UPSC Civil Services Mains Examination - {subject}

Time Allowed:1 Hours  
Maximum Marks:100

---

## Instructions:
- Answer ALL questions
- All questions carry equal marks(10 marks each)
- Word limit: 2 A4 size pages per question
- Candidates should attempt questions in a methodical manner

---

## Questions:

{formatted_questions}

---

**END OF PAPER**

*Note: This paper has been generated using AI and is for practice purposes only.*"""
        
        return paper_content

# Factory function
def create_question_generator(groq_api_key: str, vectorstore: FAISS) -> QuestionGenerator:
    """Factory function to create question generator instance"""
    return QuestionGenerator(groq_api_key, vectorstore)