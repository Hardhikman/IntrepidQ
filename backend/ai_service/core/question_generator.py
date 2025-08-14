"""
Question generation functionality - with multi-provider model selection (Groq & Gemini)
"""
import os
import time
import random
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from langchain.prompts import PromptTemplate
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_groq import ChatGroq
from langchain_community.vectorstores import SupabaseVectorStore
import requests
from diskcache import Cache
import logging
from supabase import Client

# Import the library for Gemini
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
except ImportError:
    ChatGoogleGenerativeAI = None

try:
    from together import Together
except Exception:
    Together = None  # type: ignore

logger = logging.getLogger(__name__)

class QuestionGenerator:
    def __init__(self, groq_api_key: str, google_api_key: Optional[str], together_api_key: Optional[str], vectorstore: Optional[SupabaseVectorStore], supabase_client: Optional[Client], cache_dir: str = "news_cache"):
        self.groq_api_key = groq_api_key
        self.google_api_key = google_api_key
        self.together_api_key = together_api_key
        self.vectorstore = vectorstore
        self.supabase_client = supabase_client
        self.cache = Cache(cache_dir)
        
        if vectorstore and self.supabase_client:
            self.topics_by_subject = self._build_topics_by_subject()
        else:
            self.topics_by_subject = {"GS1": [], "GS2": [], "GS3": [], "GS4": []}

        self._setup_templates()

        # Define available models and their providers
        self.available_models = {
            # Groq Models
            "llama3-70b": {"provider": "groq", "model_id": "llama3-70b-8192"},
            "llama3-8b": {"provider": "groq", "model_id": "llama3-8b-8192"},
            "mixtral-8x7b": {"provider": "groq", "model_id": "mixtral-8x7b-32768"},
            "gemma-7b": {"provider": "groq", "model_id": "gemma-7b-it"},
            "gemma2-9b": {"provider": "groq", "model_id": "gemma2-9b-it"},
            # Gemini Models
            "gemini-1.5-flash": {"provider": "google", "model_id": "gemini-1.5-flash-latest"},
        }
        
        self.together = None
        if self.together_api_key and Together is not None:
            try:
                self.together = Together(api_key=self.together_api_key)
            except Exception as e:
                logger.warning(f"Together client init failed: {e}")

    def _get_groq_client(self, model_id: str) -> ChatGroq:
        """Creates a ChatGroq client."""
        return ChatGroq(
            model=model_id,
            groq_api_key=self.groq_api_key,
            temperature=float(os.getenv("GROQ_TEMPERATURE", "0.7"))
        )

    def _get_gemini_client(self, model_id: str) -> Optional[BaseChatModel]:
        """Creates a ChatGoogleGenerativeAI client."""
        if not self.google_api_key:
            logger.warning("GOOGLE_API_KEY not set. Gemini models are unavailable.")
            return None
        if ChatGoogleGenerativeAI is None:
            logger.warning("langchain-google-genai is not installed. Gemini models are unavailable.")
            return None
        
        return ChatGoogleGenerativeAI(
            model=model_id,
            google_api_key=self.google_api_key,
            temperature=float(os.getenv("GEMINI_TEMPERATURE", "0.7"))
        )

    def _get_llm_client(self, model_name: str = "llama3-70b") -> Optional[BaseChatModel]:
        """Creates and returns an LLM client for the specified model and provider."""
        model_info = self.available_models.get(model_name)
        
        if not model_info:
            logger.warning(f"Model '{model_name}' not found. Defaulting to llama3-70b.")
            model_info = self.available_models["llama3-70b"]

        provider = model_info["provider"]
        model_id = model_info["model_id"]

        if provider == "groq":
            return self._get_groq_client(model_id)
        elif provider == "google":
            return self._get_gemini_client(model_id)
        else:
            logger.error(f"Unknown provider '{provider}' for model '{model_name}'.")
            return None

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

    def _gen_with_together(self, prompt: str) -> str:
        """Generate text using Together as a fallback, streaming tokens."""
        if not self.together:
            return ""
        try:
            messages = [{"role": "user", "content": prompt}]
            resp = self.together.chat.completions.create(
                model="meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
                messages=messages,
                stream=True,
            )
            parts: List[str] = []
            for token in resp:
                try:
                    delta_content = token.choices[0].delta.content
                    if delta_content:
                        parts.append(delta_content)
                except (AttributeError, IndexError, TypeError):
                    continue
            return "".join(parts).strip()
        except Exception as e:
            logger.error(f"Together generation failed: {e}")
            return ""

    def _build_topics_by_subject(self) -> Dict[str, List[str]]:
        """Build topics categorized by GS papers from vectorstore"""
        topics_by_subject = {"GS1": [], "GS2": [], "GS3": [], "GS4": []}
        if not self.supabase_client:
            logger.warning("Supabase client not available to build topics.")
            return topics_by_subject
        try:
            response = self.supabase_client.table("documents").select("metadata").execute()
            if response.data:
                all_metadata = [item['metadata'] for item in response.data if item.get('metadata')]
                for metadata in all_metadata:
                    if "topic" in metadata:
                        topic_name = metadata["topic"]
                        for gs_num in ["GS1", "GS2", "GS3", "GS4"]:
                            if topic_name.startswith(gs_num):
                                topics_by_subject[gs_num].append(topic_name)
                                break
        except Exception as e:
            logger.warning(f"Error building topics from vectorstore: {e}")
        
        for gs_paper in topics_by_subject:
            topics_by_subject[gs_paper] = sorted(list(set(topics_by_subject[gs_paper])))
        return topics_by_subject

    def get_topics_for_subject(self, subject: str) -> List[str]:
        return self.topics_by_subject.get(subject, [])

    def get_subject_from_topic(self, topic: str) -> str:
        for subject, topics in self.topics_by_subject.items():
            if topic in topics:
                return subject
        return "GS1"

    def fetch_recent_news(self, topic: str, months: int = 6) -> str:
        cache_key = f"{topic}_{months}"
        cached = self.cache.get(cache_key)
        if cached and time.time() - cached["timestamp"] < 3600:
            return cached["news"]
        api_key = os.getenv("NEWSAPI_KEY")
        if not api_key:
            return "NEWSAPI_KEY not configured."
        url = "https://newsapi.org/v2/everything"
        to_date = datetime.utcnow().date()
        from_date = to_date - timedelta(days=30 * int(months))
        params = {"q": topic, "language": "en", "from": from_date.isoformat(), "to": to_date.isoformat(), "sortBy": "relevancy", "pageSize": 5, "apiKey": api_key}
        try:
            response = requests.get(url, params=params, timeout=20)
            response.raise_for_status()
            data = response.json()
            if "articles" in data and data["articles"]:
                news = "\n".join([f"- {a.get('title','').strip()}: {a.get('description','').strip()}" for a in data["articles"]])
                self.cache.set(cache_key, {"news": news, "timestamp": time.time()})
                return news
            return "No news articles found."
        except Exception as e:
            return f"Error fetching news: {str(e)}"

    def format_questions(self, raw_output: str) -> str:
        lines = raw_output.strip().split('\n')
        formatted_lines = []
        question_counter = 1
        for line in lines:
            line = line.strip()
            if not line: continue
            line = re.sub(r'\*\*(.*?)\*\*', r'\1', line)
            if line.lower().startswith(('these questions', 'the questions', 'note:', 'instruction', 'this paper')): continue
            if (re.match(r'^\d+\.', line) or line.endswith('?') or any(word in line.lower() for word in ['analyze', 'examine', 'discuss', 'evaluate', 'critically', 'assess'])):
                clean_line = re.sub(r'^\d+\.\s*', '', line)
                if clean_line:
                    formatted_lines.append(f"{question_counter}. {clean_line}")
                    question_counter += 1
        return '\n\n'.join(formatted_lines)

    def generate_topic_questions(self, subject: str, topic: str, num: int, use_ca: bool, months: int, model: str) -> str:
        llm = self._get_llm_client(model)
        if not llm:
            return f"1. Error: Could not initialize model '{model}'. Please check API keys and installation."
        if use_ca:
            return self._generate_current_affairs_questions(subject, topic, num, months, llm)
        else:
            return self._generate_static_questions(subject, topic, num, llm)

    def _generate_current_affairs_questions(self, subject: str, topic: str, num: int, months: int, llm: BaseChatModel) -> str:
        news_context = self.fetch_recent_news(topic, months)
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
Generate exactly {num} questions now."""
        try:
            response = llm.invoke(ca_prompt)
            out = response.content.strip()
            return self.format_questions(out)
        except Exception as e:
            logger.warning(f"Generation failed with {getattr(llm, 'model', 'unknown model')}: {e}")
            return f"1. Analyze {topic} in the context of recent developments."

    def _generate_static_questions(self, subject: str, topic: str, num: int, llm: BaseChatModel) -> str:
        if not self.supabase_client:
            return "Error: Supabase client not available to fetch examples."
        try:
            response = self.supabase_client.table("documents").select("content").eq("metadata->>topic", topic).limit(8).execute()
            if not response.data:
                return f"No questions found for topic: {topic}"
            
            examples = [item['content'] for item in response.data]
            example_text = "\n".join([f"{i+1}. {q}" for i, q in enumerate(examples)])
            final_prompt = self.gs_prompt.format(subject=subject, topic=topic, examples=example_text, num=num)
            
            response = llm.invoke(final_prompt)
            out = response.content.strip()
            return self.format_questions(out)
        except Exception as e:
            logger.error(f"Error in _generate_static_questions: {e}")
            return f"1. Analyze the significance of {topic} in contemporary India."

    def generate_whole_paper(self, subject: str, use_ca: bool, months: int, model: str) -> str:
        llm = self._get_llm_client(model)
        if not llm:
            return f"# Error: Could not initialize model '{model}'."
        subject_topics = self.topics_by_subject.get(subject, [])
        if not subject_topics: return f"No topics found for {subject}"
        num_topics = min(len(subject_topics), 6)
        selected_topics = random.sample(subject_topics, num_topics)
        topic_examples = self._gather_topic_examples(selected_topics, subject)
        if not topic_examples: return f"No example questions found for {subject}"
        topic_examples_text = "\n".join(topic_examples)
        
        if use_ca:
            prompt = self._get_ca_paper_prompt(subject, selected_topics, topic_examples_text, months)
        else:
            prompt = self.whole_paper_prompt.format(subject=subject, topic_examples=topic_examples_text)
        
        try:
            response = llm.invoke(prompt)
            out = response.content.strip()
            formatted_questions = self.format_questions(out)
        except Exception as e:
            logger.warning(f"Whole paper generation failed: {e}")
            formatted_questions = "Generation failed. Please try a different model or check the logs."
            
        return self._format_final_paper(subject, formatted_questions)

    def _gather_topic_examples(self, selected_topics: List[str], subject: str) -> List[str]:
        if not self.supabase_client:
            return ["Error: Supabase client not available to gather examples."]
        topic_examples = []
        for topic in selected_topics:
            try:
                response = self.supabase_client.table("documents").select("content").eq("metadata->>topic", topic).limit(3).execute()
                if response.data:
                    examples = [item['content'] for item in response.data]
                    display_topic = topic.replace(f"{subject} - ", "")
                    topic_examples.append(f"**{display_topic}:**")
                    for i, example in enumerate(examples, 1):
                        topic_examples.append(f"{i}. {example}")
                    topic_examples.append("")
            except Exception as e:
                logger.warning(f"Error gathering examples for topic {topic}: {e}")
        return topic_examples

    def _get_ca_paper_prompt(self, subject: str, selected_topics: List[str], topic_examples_text: str, months: int) -> str:
        news_contexts = []
        for topic in selected_topics[:3]:
            news = self.fetch_recent_news(topic, months)
            if news and "not configured" not in news:
                news_contexts.append(f"Recent news for {topic}: {news[:200]}...")
        news_text = "\n\n".join(news_contexts) if news_contexts else ""
        return f"""You are a UPSC Mains question paper designer for {subject}.
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

    def _format_final_paper(self, subject: str, formatted_questions: str) -> str:
        return f"""# UPSC Civil Services Mains Examination - {subject}
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

def create_question_generator(
    groq_api_key: str, 
    google_api_key: Optional[str], 
    together_api_key: Optional[str], 
    vectorstore: Optional[VectorStore], 
    supabase_client: Optional[Client]
) -> "QuestionGenerator":
    """Factory function to create question generator instance"""
    # Pass all the received arguments to the class constructor
    return QuestionGenerator(
        groq_api_key=groq_api_key,
        google_api_key=google_api_key,
        together_api_key=together_api_key,
        vectorstore=vectorstore,
        supabase_client=supabase_client
    )
