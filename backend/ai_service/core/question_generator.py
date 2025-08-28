"""
Question generation functionality - multi-provider
Supports: Groq, Gemini
Features:
- Provider-agnostic model calls
- Automatic retry-on-failure with fallback list
- Model speed logging
- Adaptive model prioritisation at runtime
- Persistent model performance in Supabase
- Consistent stats output for topic & paper generation
- Generated questions caching with random example selection to get reliable questions
- Document retrieval exclusively via vector search with fallback to direct query.
"""
import os
import time
import random
import re
import json
import requests
import logging
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from diskcache import Cache
from supabase import Client
from langchain.prompts import PromptTemplate
from langchain_groq import ChatGroq
from langchain_community.vectorstores import SupabaseVectorStore
from langchain_core.utils import convert_to_secret_str

# Optional providers
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
except ImportError:
    ChatGoogleGenerativeAI = None

logger = logging.getLogger(__name__)

class QuestionGenerator:
    def __init__(
        self,
        groq_api_key: str,
        google_api_key: Optional[str],
        vectorstore: Optional[SupabaseVectorStore],
        supabase_client: Optional[Client],
        cache_dir: str = "news_cache"
    ):
        self.groq_api_key = groq_api_key
        self.google_api_key = google_api_key
        self.vectorstore = vectorstore
        self.supabase_client = supabase_client
        self.cache = Cache(cache_dir)  # Keep only news cache
        
        self.topics_by_subject = (
            self._build_topics_by_subject()
            if (vectorstore and supabase_client)
            else {"GS1": [], "GS2": [], "GS3": [], "GS4": []}
        )
        self._setup_templates()
        self.available_models = {
            "llama3-70b": {"provider": "groq", "model_id": "llama3-70b-8192"},
            "deepseek-r1": {"provider": "groq", "model_id": "deepseek-r1-distill-llama-70b"},
            "llama3-8b": {"provider": "groq", "model_id": "llama3-8b-8192"},
            "gemma2-9b": {"provider": "groq", "model_id": "gemma2-9b-it"},
            "openai-oss-20b": {"provider": "groq", "model_id": "openai/gpt-oss-20b"},
            "gemini-2.0-flash": {"provider": "google", "model_id": "models/gemini-2.0-flash"},
            "gemini-2.5-flash": {"provider": "google", "model_id": "gemini-2.5-flash"},
            "moonshot-k2": {"provider": "groq", "model_id": "moonshotai/kimi-k2-instruct"},
        }
        self.priority_order = ["gemma2-9b","openai-oss-20b", "llama3-70b", "moonshot-k2", "gemini-2.5-flash", "gemini-2.0-flash","deepseek-r1"]
        self.model_speeds: Dict[str, List[float]] = {}
        self.min_attempts_for_avg = 3
        self._load_model_performance()

    # Supabase Questions Cache Management
    def _get_cache_key(self, subject: str, topic: str, num: int, use_ca: bool = False, months: int = 6) -> str:
        """Generate cache key for questions"""
        key_data = f"{subject}_{topic}_{num}_{use_ca}_{months}"
        return hashlib.md5(key_data.encode()).hexdigest()

    def _cache_questions(self, cache_key: str, questions: List[dict], subject: str, topic: str):
        """Cache generated questions in Supabase with metadata"""
        if not self.supabase_client:
            logger.warning("Supabase client not available for caching")
            return
        
        try:
            # Store in main cache table
            cache_data = {
                "cache_key": cache_key,
                "subject": subject,
                "topic": topic,
                "questions": json.dumps(questions),
                "metadata": json.dumps({
                    "generated_at": datetime.now().isoformat(),
                    "question_count": len(questions)
                }),
                "expires_at": (datetime.now() + timedelta(days=7)).isoformat()
            }
            
            self.supabase_client.table('questions_cache').upsert(cache_data).execute()
            
            # Add individual questions to topic index for random sampling
            topic_entries = []
            for q in questions:
                topic_entries.append({
                    "subject": subject,
                    "topic": topic,
                    "question_text": q.get("question", str(q)),
                    "question_data": json.dumps(q),
                    "expires_at": (datetime.now() + timedelta(days=7)).isoformat()
                })
            
            if topic_entries:
                # Insert new entries
                self.supabase_client.table('topic_questions_index').insert(topic_entries).execute()
                
                # Clean up old entries to maintain size limit (50 per topic)
                self._cleanup_topic_cache(subject, topic, max_entries=50)
            
            logger.info(f"Cached {len(questions)} questions in Supabase for {subject} - {topic}")
            
        except Exception as e:
            logger.error(f"Failed to cache questions in Supabase: {e}")

    def _cleanup_topic_cache(self, subject: str, topic: str, max_entries: int = 50):
        """Remove old entries to maintain cache size limit"""
        if not self.supabase_client:
            return
        
        try:
            # Get count of entries for this topic
            response = (self.supabase_client
                        .table('topic_questions_index')
                        .select('id')
                        .eq('subject', subject)
                        .eq('topic', topic)
                        .execute())
            
            count = len(response.data) if response.data else 0
            if count > max_entries:
                # Delete oldest entries beyond the limit
                excess_count = count - max_entries
                old_entries = (self.supabase_client
                               .table('topic_questions_index')
                               .select('id')
                               .eq('subject', subject)
                               .eq('topic', topic)
                               .order('created_at')
                               .limit(excess_count)
                               .execute())
                
                if old_entries.data:
                    ids_to_delete = [entry['id'] for entry in old_entries.data]
                    for entry_id in ids_to_delete:
                        self.supabase_client.table('topic_questions_index').delete().eq('id', entry_id).execute()
                    
                    logger.info(f"Cleaned up {len(ids_to_delete)} old cache entries for {subject}-{topic}")
        
        except Exception as e:
            logger.error(f"Failed to cleanup topic cache: {e}")

    def _get_cached_questions_as_examples(self, subject: str, topic: str, max_examples: int = 3) -> List[str]:
        """Get random cached questions from Supabase to use as examples"""
        if not self.supabase_client:
            return []
        
        try:
            # Get random questions from topic index
            response = (self.supabase_client
                        .table('topic_questions_index')
                        .select('question_text')
                        .eq('subject', subject)
                        .eq('topic', topic)
                        .gt('expires_at', datetime.now().isoformat())
                        .order('created_at', desc=True)
                        .limit(max_examples * 2)  # Get more to allow random sampling
                        .execute())
            
            if not response.data:
                return []
            
            # Extract question texts
            questions = [item['question_text'] for item in response.data if item.get('question_text')]
            
            if not questions:
                return []
            
            # Random sampling
            num_examples = min(len(questions), max_examples)
            selected_questions = random.sample(questions, num_examples)
            
            # Format as examples
            examples = []
            for i, question in enumerate(selected_questions, 1):
                examples.append(f"{i}. {question}")
            
            logger.info(f"Using {len(examples)} Supabase cached questions as examples for {subject} - {topic}")
            return examples
            
        except Exception as e:
            logger.warning(f"Failed to get cached examples for {subject}-{topic}: {e}")
            return []

    def _get_all_cached_questions_for_examples(self, subject: str, max_examples: int = 5) -> List[str]:
        """Get random cached questions from any topic in the subject for whole paper examples"""
        if not self.supabase_client:
            return []
        
        try:
            # Get questions from any topic in the subject
            response = (self.supabase_client
                        .table('topic_questions_index')
                        .select('question_text')
                        .eq('subject', subject)
                        .gt('expires_at', datetime.now().isoformat())
                        .order('created_at', desc=True)
                        .limit(max_examples * 3)  # Get more to allow random sampling
                        .execute())
            
            if not response.data:
                return []
            
            # Extract question texts
            questions = [item['question_text'] for item in response.data if item.get('question_text')]
            
            if not questions:
                return []
            
            # Random sampling
            num_examples = min(len(questions), max_examples)
            selected_questions = random.sample(questions, num_examples)
            
            # Format as examples
            examples = []
            for i, question in enumerate(selected_questions, 1):
                examples.append(f"{i}. {question}")
            
            logger.info(f"Using {len(examples)} Supabase cached questions as examples for whole paper generation")
            return examples
            
        except Exception as e:
            logger.warning(f"Failed to get all cached examples for {subject}: {e}")
            return []

    def get_cache_stats(self) -> dict:
        """Get statistics about cached questions in Supabase"""
        stats = {
            "cache_type": "supabase_only",
            "subjects": {},
            "total_questions": 0,
            "total_cache_entries": 0
        }
        
        if not self.supabase_client:
            return stats
        
        try:
            # Get total cache entries
            cache_resp = self.supabase_client.table('questions_cache').select('id', count=None).execute()
            stats["total_cache_entries"] = cache_resp.count or 0
            
            # Get total questions in topic index
            topic_resp = self.supabase_client.table('topic_questions_index').select('id', count=None).execute()
            stats["total_questions"] = topic_resp.count or 0
            
            # Get stats per subject
            for subject in ["GS1", "GS2", "GS3", "GS4"]:
                try:
                    # Cache entries per subject
                    cache_subject_resp = (self.supabase_client
                                         .table('questions_cache')
                                         .select('id', count=None)
                                         .eq('subject', subject)
                                         .execute())
                    
                    # Topic index questions per subject
                    topic_subject_resp = (self.supabase_client
                                         .table('topic_questions_index')
                                         .select('id', count=None)
                                         .eq('subject', subject)
                                         .execute())
                    
                    # Topics with cache
                    topics_resp = (self.supabase_client
                                     .table('topic_questions_index')
                                     .select('topic')
                                     .eq('subject', subject)
                                     .execute())
                    
                    unique_topics = len(set(item['topic'] for item in topics_resp.data)) if topics_resp.data else 0
                    
                    stats["subjects"][subject] = {
                        "cache_entries": cache_subject_resp.count or 0,
                        "questions": topic_subject_resp.count or 0,
                        "topics_with_cache": unique_topics
                    }
                    
                except Exception as e:
                    logger.warning(f"Failed to get stats for {subject}: {e}")
                    stats["subjects"][subject] = {
                        "cache_entries": 0,
                        "questions": 0,
                        "topics_with_cache": 0
                    }
        
        except Exception as e:
            logger.error(f"Failed to get cache stats: {e}")
        
        return stats

    def clear_cache(self, subject: Optional[str] = None, topic: Optional[str] = None):
        """Clear cache - all, by subject, or by specific topic"""
        if not self.supabase_client:
            logger.warning("Supabase client not available for cache clearing")
            return
        
        try:
            if topic and subject:
                # Clear specific topic
                self.supabase_client.table('questions_cache').delete().eq('subject', subject).eq('topic', topic).execute()
                self.supabase_client.table('topic_questions_index').delete().eq('subject', subject).eq('topic', topic).execute()
                logger.info(f"Cleared Supabase cache for {subject} - {topic}")
            elif subject:
                # Clear all topics in subject
                cache_resp = self.supabase_client.table('questions_cache').delete().eq('subject', subject).execute()
                topic_resp = self.supabase_client.table('topic_questions_index').delete().eq('subject', subject).execute()
                logger.info(f"Cleared Supabase cache for all topics in {subject}")
            else:
                # Clear all cache
                self.supabase_client.table('questions_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
                self.supabase_client.table('topic_questions_index').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
                logger.info("Cleared all Supabase cache")
        
        except Exception as e:
            logger.error(f"Failed to clear cache: {e}")

    #Supabase Model Speed Persistence
    def _load_model_performance(self):
        if not self.supabase_client:
            return
        try:
            resp = self.supabase_client.table("model_performance").select("*").execute()
            for row in resp.data or []:
                name = row["model_name"]
                if row.get("avg_speed") and row.get("num_runs"):
                    avg_speed = row["avg_speed"]
                    self.model_speeds[name] = [avg_speed] * row["num_runs"]
            logger.info(f"Loaded model performance history: {self.model_speeds}")
        except Exception as e:
            logger.warning(f"Could not load model performance: {e}")

    def _save_model_performance(self, model_name: str):
        if not self.supabase_client:
            return
        try:
            avg_speed = sum(self.model_speeds[model_name]) / len(self.model_speeds[model_name])
            num_runs = len(self.model_speeds[model_name])
            self.supabase_client.table("model_performance").upsert({
                "model_name": model_name,
                "avg_speed": avg_speed,
                "num_runs": num_runs
            }, on_conflict="model_name").execute()
        except Exception as e:
            logger.warning(f"Failed saving model performance: {e}")

    def _log_model_speed(self, model_name: str, elapsed: float, success: bool):
        self.model_speeds.setdefault(model_name, []).append(elapsed)
        self._save_model_performance(model_name)
        avg_speed = sum(self.model_speeds[model_name]) / len(self.model_speeds[model_name])
        status = "SUCCESS" if success else "FAIL"
        logger.info(f"[{status}] {model_name} took {elapsed:.2f}s (avg {avg_speed:.2f}s over {len(self.model_speeds[model_name])} runs)")

    #Model Selection
    def select_model(self, requested_model: Optional[str] = None) -> List[str]:
        """Return ordered list of models: user's model FIRST, rest as fallback."""
        if requested_model and requested_model in self.available_models:
            # Keep user's choice as first
            fallback = [m for m in self.priority_order if m != requested_model]
            
            # Adaptive re-ordering only applies to the fallback list
            if all(len(times) >= self.min_attempts_for_avg for times in self.model_speeds.values()):
                fallback = sorted(
                    [m for m in fallback if m in self.available_models],
                    key=lambda m: sum(self.model_speeds.get(m, [float("inf")])) / len(self.model_speeds.get(m, [float("inf")]))
                )
                logger.info(f"Adaptive fallback order: {fallback}")
            
            return [requested_model] + fallback  # Chosen model forced at #1
        
        # Auto mode (no model selected): full adaptive
        if all(len(times) >= self.min_attempts_for_avg for times in self.model_speeds.values()):
            ordered = sorted(
                [m for m in self.priority_order if m in self.available_models],
                key=lambda m: sum(self.model_speeds[m]) / len(self.model_speeds[m])
            )
            logger.info(f"Adaptive auto priority order: {ordered}")
            return ordered
        
        return [m for m in self.priority_order if m in self.available_models]

    #LLM Provider Clients
    def _get_groq_client(self, model_id: str) -> ChatGroq:
        return ChatGroq(model=model_id, api_key=convert_to_secret_str(self.groq_api_key), temperature=float(os.getenv("GROQ_TEMPERATURE", "0.7")))

    def _get_gemini_client(self, model_id: str):
        if not self.google_api_key or ChatGoogleGenerativeAI is None:
            return None
        return ChatGoogleGenerativeAI(model=model_id, api_key=convert_to_secret_str(self.google_api_key), temperature=float(os.getenv("GEMINI_TEMPERATURE", "0.7")))

    def _get_llm_client(self, model_name: str):
        info = self.available_models.get(model_name)
        if not info:
            return None
        provider, model_id = info["provider"], info["model_id"]
        return {
            "groq": lambda: self._get_groq_client(model_id),
            "google": lambda: self._get_gemini_client(model_id)
        }.get(provider, lambda: None)()

    #Model Retry with Stats 
    def _try_models(self, models: List[str], prompt: str) -> dict:
        last_error = None
        first_model = models[0] if models else "unknown"
        
        for idx, model_name in enumerate(models):
            logger.info(f"Attempting model: {model_name}")
            llm = self._get_llm_client(model_name)
            if not llm:
                continue
                
            start = time.time()
            try:
                result = self._use_llm(llm, prompt)
                elapsed = round(time.time() - start, 2)
                self._log_model_speed(model_name, elapsed, success=True)
                
                # DEBUG LINE HERE
                logger.debug(f"[try_models] Raw response from {model_name}:\n{result[:1000]}...\n")
                
                avg_speed = sum(self.model_speeds[model_name]) / len(self.model_speeds[model_name])
                return {
                    "output": result,
                    "model": model_name,
                    "duration": elapsed,
                    "avg_speed": round(avg_speed, 2),
                    "runs": len(self.model_speeds[model_name]),
                    "status": "success"
                }
            except Exception as e:
                elapsed = round(time.time() - start, 2)
                self._log_model_speed(model_name, elapsed, success=False)
                msg = f"Model {model_name} failed in {elapsed:.2f}s - {e}"
                logger.warning(msg)
                
                # Special notice if requested model failed
                if idx == 0 and model_name == first_model:
                    logger.warning(f"WARNING Selected model {model_name} failed. Falling back to {models[1:]}")
                last_error = str(e)
                continue
        
        # Return consistent structure when all models fail
        return {
            "output": f"Error: All model attempts failed. Last error: {last_error}",
            "model": "failed",
            "duration": 0.0,
            "avg_speed": 0.0,
            "runs": 0,
            "status": "all_failed"
        }

    def _use_llm(self, llm, prompt: str) -> str:
        # Fix the deprecated call - use invoke() instead of __call__()
        response = llm.invoke(prompt) if hasattr(llm, 'invoke') else llm(prompt)
        
        # Case 1: LangChain message object (AIMessage with .content)
        if hasattr(response, "content"):
            return response.content.strip()
        # Case 2: Generation object with .text
        if hasattr(response, "text"):
            return response.text.strip()
        # Case 3: Raw string already
        if isinstance(response, str):
            return response.strip()
        # Case 4: Fallback -> convert to string
        return str(response).strip()

    # ---------------- Prompts ----------------
    def _setup_templates(self):
        # Topic questions w/ thinking + question
        self.gs_prompt = PromptTemplate.from_template(
            """You are a UPSC Mains question paper designer for {subject}.
Generate {num} original UPSC-style Mains questions for the topic "{topic}".

Examples from database and previous generations:
{examples}

IMPORTANT:
- Output ONLY in English
- Output MUST be a valid JSON array of objects
- Each object must have "thinking" (short rationale) AND "question" (final UPSC-style question)
- "thinking": max 2-3 sentences
- "question": one exam-appropriate UPSC question
- No commentary or text outside JSON
- Exactly {num} items
- Generate NEW questions, don't copy the examples

Now return ONLY the JSON array:"""
        )
        
        # Whole paper template
        self.whole_paper_prompt = PromptTemplate.from_template(
            """You are a UPSC Mains paper designer for {subject}.
Generate a full UPSC paper (10 questions) covering multiple topics.

Examples from database and previous generations:
{topic_examples}

IMPORTANT:
- Output ONLY in English
- Output MUST be a valid JSON array of 10 objects
- Each object must have "thinking" + "question"
- "thinking": short reasoning (max 2-3 sentences)
- "question": final numbered UPSC-style question
- No commentary/reasoning outside JSON
- Exactly 10 items
- Generate NEW questions, don't copy the examples

Now return ONLY the JSON array:"""
        )

    def _get_ca_paper_prompt(self, subject: str, selected_topics: List[str], topic_examples_text: str, months: int) -> str:
        news_contexts = []
        for topic in selected_topics[:3]:
            news = self.fetch_recent_news(topic, months)
            if news and "not configured" not in news:
                news_contexts.append(f"Recent news for {topic}:\n{news[:200]}...")
        news_text = "\n\n".join(news_contexts) if news_contexts else ""
        
        return f"""You are a UPSC Mains paper designer for {subject}.
Generate 10 analytical UPSC questions incorporating current affairs.

Topics and Example Questions:
{topic_examples_text}

Recent News Context:
{news_text}

IMPORTANT:
- Output ONLY in English
- Output MUST be a valid JSON array of 10 objects
- Each object: "thinking" + "question"
- "thinking": 1-3 sentences of reasoning
- "question": final exam-style UPSC question
- No <think>, no meta, no extra commentary
- Exactly 10 items
- Generate NEW questions based on current affairs

Now return ONLY the JSON array:"""

    #Data Utils
    def _build_topics_by_subject(self) -> Dict[str, List[str]]:
        topics = {"GS1": [], "GS2": [], "GS3": [], "GS4": []}
        if not self.supabase_client:
            return topics
        resp = self.supabase_client.table("documents").select("metadata").execute()
        for item in resp.data or []:
            topic = item.get("metadata", {}).get("topic")
            for gs in topics:
                if topic and topic.startswith(gs):
                    topics[gs].append(topic)
        for gs in topics:
            topics[gs] = sorted(set(topics[gs]))
        return topics

    def get_topics_for_subject(self, subject: str) -> List[str]:
        return self.topics_by_subject.get(subject, [])

    def get_subject_from_topic(self, topic: str) -> str:
        for subject, topics in self.topics_by_subject.items():
            if topic in topics:
                return subject
        return "GS1"

    def fetch_recent_news(self, topic: str, months: int = 6) -> str:
        key = os.getenv("NEWSAPI_KEY")
        if not key:
            return "NEWSAPI_KEY not configured"
        cache_key = f"{topic}_{months}"
        cached = self.cache.get(cache_key)
        if cached and isinstance(cached, dict) and time.time() - cached.get("timestamp", 0) < 3600:
            return cached.get("news", "")
        from_date = (datetime.utcnow() - timedelta(days=30 * months)).date()
        params = {"q": topic, "from": from_date.isoformat(), "to": datetime.utcnow().date().isoformat(),
                  "sortBy": "relevancy", "language": "en", "pageSize": 5, "apiKey": key}
        try:
            resp = requests.get("https://newsapi.org/v2/everything", params=params, timeout=20)
            data = resp.json()
            news = "\n".join([f"- {a['title']}: {a['description']}" for a in data.get("articles", [])])
            self.cache.set(cache_key, {"news": news, "timestamp": time.time()})
            return news or "No news found"
        except Exception as e:
            return f"Error fetching news: {e}"

    # Safe Question Parsing
    def safe_parse_questions(self, output: str, num: Optional[int] = None) -> List[dict]:
        """
        Tries to safely parse LLM output into a list of {"thinking": ..., "question": ...}.
        Handles messy outputs, <think> blocks, stray text, and fallback cases.
        """
        logger.debug(f"[safe_parse_questions] Raw LLM output:\n{output[:1000]}...\n")
        
        # 1. Remove DeepSeek-style <think> blocks
        cleaned = re.sub(r"<think>.*?</think>", "", output, flags=re.DOTALL).strip()
        
        # 2. Try direct JSON parse
        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, list):
                results = []
                for q in (parsed[:num] if num else parsed):
                    if isinstance(q, dict) and "question" in q:
                        results.append({
                            "thinking": q.get("thinking", "").strip(),
                            "question": q["question"].strip()
                        })
                    elif isinstance(q, str):
                        results.append({"thinking": "", "question": q.strip()})
                if results:
                    return results
        except Exception as e:
            logger.warning(f"JSON parsing failed: {e}")
        
        # 3. Try extracting embedded JSON array (inside text)
        match = re.search(r"\[[\s\S]*\]", cleaned)
        if match:
            try:
                parsed = json.loads(match.group(0))
                if isinstance(parsed, list):
                    results = []
                    for q in (parsed[:num] if num else parsed):
                        if isinstance(q, dict) and "question" in q:
                            results.append({
                                "thinking": q.get("thinking", "").strip(),
                                "question": q["question"].strip()
                            })
                        elif isinstance(q, str):
                            results.append({"thinking": "", "question": q.strip()})
                    if results:
                        return results
            except Exception as e:
                logger.warning(f"Embedded JSON parse failed: {e}")
        
        # 4. Regex fallback: clean free-text questions
        candidate_questions = self.format_questions(cleaned)
        if candidate_questions:
            return [{"thinking": "", "question": q} for q in (candidate_questions[:num] if num else candidate_questions)]
        
        # 5. Final brute fallback: split by paragraphs
        fallback = [p.strip() for p in cleaned.split("\n\n") if len(p.strip()) > 10]
        return [{"thinking": "", "question": f"{i+1}. {txt}"} for i, txt in enumerate(fallback[:num] if num else fallback)]

    #Generation Qs
    def generate_topic_questions(self, subject, topic, num, use_ca, months, requested_model):
        models_to_try = self.select_model(requested_model)
        if use_ca:
            return self._generate_current_affairs_questions(subject, topic, num, months, models_to_try)
        return self._generate_static_questions(subject, topic, num, models_to_try)

    def _generate_static_questions(self, subject, topic, num, models_to_try: List[str]):
        try:
            # Get database examples using vector similarity search
            db_examples = self._get_relevant_documents_with_fallback(
                topic, 
                f"UPSC questions for {subject} on {topic}", 
                k=5
            )
            
            # Get cached questions as examples
            cached_examples = self._get_cached_questions_as_examples(subject, topic, max_examples=3)
            
            # Combine examples
            all_examples = db_examples + cached_examples
            examples_text = "\n".join(all_examples) if all_examples else "No examples available."
            
            prompt = self.gs_prompt.format(subject=subject, topic=topic, examples=examples_text, num=num)
            result = self._try_models(models_to_try, prompt)
            
            # Parse questions
            questions = self.safe_parse_questions(result.get("output", ""), num)
            
            # Cache the new questions if generation was successful
            if questions and result.get("status") == "success":
                cache_key = self._get_cache_key(subject, topic, num, False, 0)
                self._cache_questions(cache_key, questions, subject, topic)
            
            return {
                "questions": questions,
                "meta": {
                    "model": result.get("model", "unknown"),
                    "duration": result.get("duration", 0.0),
                    "avg_speed": result.get("avg_speed", 0.0),
                    "runs": result.get("runs", 0),
                    "status": result.get("status", "unknown"),
                    "examples_used": len(all_examples),
                    "cached_examples": len(cached_examples)
                }
            }
        except Exception as e:
            logger.error(f"Error in _generate_static_questions: {e}")
            return {
                "questions": [{"thinking": "", "question": f"Error generating questions: {str(e)}"}],
                "meta": {
                    "model": "error",
                    "duration": 0.0,
                    "avg_speed": 0.0,
                    "runs": 0,
                    "status": "error"
                }
            }

    def _generate_current_affairs_questions(self, subject, topic, num, months, models_to_try: List[str]):
        try:
            # Get database examples
            db_examples = self._get_relevant_documents_with_fallback(topic, f"UPSC questions for {subject} on {topic}", k=3)
            
            # Get cached questions as examples
            cached_examples = self._get_cached_questions_as_examples(subject, topic, max_examples=2)
            
            # Combine examples
            all_examples = db_examples + cached_examples
            examples_text = "\n".join(all_examples) if all_examples else "No examples available."
            
            news = self.fetch_recent_news(topic, months)
            prompt = f"{self.gs_prompt.format(subject=subject, topic=topic, examples=examples_text, num=num)}\n\nRecent News:\n{news}"
            
            result = self._try_models(models_to_try, prompt)
            
            # Parse questions
            questions = self.safe_parse_questions(result.get("output", ""), num)
            
            # Cache the new questions if generation was successful
            if questions and result.get("status") == "success":
                cache_key = self._get_cache_key(subject, topic, num, True, months)
                self._cache_questions(cache_key, questions, subject, topic)
            
            return {
                "questions": questions,
                "meta": {
                    "model": result.get("model", "unknown"),
                    "duration": result.get("duration", 0.0),
                    "avg_speed": result.get("avg_speed", 0.0),
                    "runs": result.get("runs", 0),
                    "status": result.get("status", "unknown"),
                    "examples_used": len(all_examples),
                    "cached_examples": len(cached_examples)
                }
            }
        except Exception as e:
            logger.error(f"Error in _generate_current_affairs_questions: {e}")
            return {
                "questions": [{"thinking": "", "question": f"Error generating questions: {str(e)}"}],
                "meta": {
                    "model": "error",
                    "duration": 0.0,
                    "avg_speed": 0.0,
                    "runs": 0,
                    "status": "error"
                }
            }

    def generate_whole_paper(self, subject: str, use_ca: bool, months: int, requested_model: str):
        try:
            models_to_try = self.select_model(requested_model)
            subject_topics = self.topics_by_subject.get(subject, [])
            
            if not subject_topics:
                return {
                    "questions": [{"thinking": "", "question": "[WARNING] No topics found."}], 
                    "meta": {
                        "model": "none",
                        "duration": 0.0,
                        "avg_speed": 0.0,
                        "runs": 0,
                        "status": "no_topics"
                    }
                }
            
            num_topics = min(len(subject_topics), 6)
            selected_topics = random.sample(subject_topics, num_topics)
            
            # Get database examples
            topic_examples = self._gather_topic_examples(selected_topics, subject)
            
            # Get cached questions as examples
            cached_examples = self._get_all_cached_questions_for_examples(subject, max_examples=5)
            
            # Combine examples
            all_examples = topic_examples + cached_examples
            topic_examples_text = "\n".join(all_examples)
            
            if use_ca:
                prompt = self._get_ca_paper_prompt(subject, selected_topics, topic_examples_text, months)
            else:
                prompt = self.whole_paper_prompt.format(subject=subject, topic_examples=topic_examples_text)
            
            result = self._try_models(models_to_try, prompt)
            
            # Parse questions
            questions = self.safe_parse_questions(result.get("output", ""), 10)
            
            # Cache questions by distributing them to topics (for future use)
            if questions and result.get("status") == "success" and len(questions) >= 5:
                # Distribute questions among selected topics for caching
                questions_per_topic = len(questions) // len(selected_topics)
                for i, topic in enumerate(selected_topics):
                    start_idx = i * questions_per_topic
                    end_idx = start_idx + questions_per_topic if i < len(selected_topics) - 1 else len(questions)
                    topic_questions = questions[start_idx:end_idx]
                    
                    if topic_questions:
                        cache_key = f"paper_{subject}_{topic}_{int(time.time())}"
                        self._cache_questions(cache_key, topic_questions, subject, topic)
            
            return {
                "questions": questions,
                "meta": {
                    "model": result.get("model", "unknown"),
                    "duration": result.get("duration", 0.0),
                    "avg_speed": result.get("avg_speed", 0.0),
                    "runs": result.get("runs", 0),
                    "status": result.get("status", "unknown"),
                    "examples_used": len(all_examples),
                    "cached_examples": len(cached_examples),
                    "topics_covered": len(selected_topics)
                }
            }
        except Exception as e:
            logger.error(f"Error in generate_whole_paper: {e}")
            return {
                "questions": [{"thinking": "", "question": f"Error generating paper: {str(e)}"}],
                "meta": {
                    "model": "error",
                    "duration": 0.0,
                    "avg_speed": 0.0,
                    "runs": 0,
                    "status": "error"
                }
            }
            
    def _get_relevant_documents_with_fallback(self, topic: str, query: str, k: int = 5) -> List[str]:
        """
        Get relevant documents using vector similarity search, with fallback.
        """
        if not self.vectorstore:
            logger.warning("Vector store not available, falling back to direct query.")
            return self._get_documents_current_method(topic, k)
            
        try:
            logger.info(f"Attempting vector similarity search for query: '{query}'")
            # Perform similarity search using vectorstore
            docs = self.vectorstore.similarity_search(
                query, 
                k=k,
                filter={"topic": topic}
            )
            
            # Extract content
            documents = [doc.page_content for doc in docs]
            logger.info(f"Vector search successful. Found {len(documents)} documents.")
            
            return documents
            
        except Exception as e:
            logger.warning(f"Vector search failed, falling back to direct query: {e}")
            return self._get_documents_current_method(topic, k)

    def _get_relevant_documents_without_filter(self, query: str, k: int = 5) -> List[str]:
        """
        Get relevant documents using vector similarity search without strict topic filtering.
        This is used for keyword-based searches where we want semantic matching.
        """
        if not self.supabase_client:
            logger.warning("Supabase client not available.")
            return []
            
        try:
            logger.info(f"Attempting vector similarity search without filter for query: '{query}'")
            # Generate embedding for the query
            if not self.vectorstore or not hasattr(self.vectorstore, 'embeddings') or not self.vectorstore.embeddings:
                logger.warning("Embeddings not available for vector search.")
                return []
                
            # Generate query embedding
            query_embedding = self.vectorstore.embeddings.embed_query(query)
            
            # Call our match_documents function directly with an empty filter to match all documents
            response = self.supabase_client.rpc(
                "match_documents",
                {
                    "filter": {},  # Empty filter to match all documents
                    "query_embedding": query_embedding,
                    "match_count": k
                }
            ).execute()
            
            # Extract content from the response
            documents = [item["content"] for item in response.data] if response.data else []
            logger.info(f"Vector search successful. Found {len(documents)} documents.")
            
            return documents
            
        except Exception as e:
            logger.warning(f"Vector search without filter failed: {e}")
            return []

    def _get_documents_current_method(self, topic: str, k: int = 5) -> List[str]:
        """
        Current method of retrieving documents - kept for backward compatibility.
        """
        if not self.supabase_client:
            return []
            
        try:
            resp = self.supabase_client.table("documents").select("content").eq("metadata->>topic", topic).limit(k).execute()
            return [item["content"] for item in resp.data] if resp.data else []
        except Exception as e:
            logger.warning(f"Failed to get documents using current method: {e}")
            return []

    def _gather_topic_examples(self, selected_topics: List[str], subject: str) -> List[str]:
        topic_examples = []
        if not self.supabase_client:
            return ["Error: Supabase client not available."]
        
        for topic in selected_topics:
            try:
                # Use the new method for document retrieval
                examples = self._get_relevant_documents_with_fallback(topic, f"UPSC questions for {subject} on {topic}", k=2)
                
                if examples:
                    display_topic = topic.replace(f"{subject} - ", "")
                    topic_examples.append(f"{display_topic}:")
                    for i, example in enumerate(examples, 1):
                        topic_examples.append(f"{i}. {example}")
                    topic_examples.append("")
            except Exception as e:
                logger.warning(f"Error gathering examples for topic {topic}: {e}")
        return topic_examples

    def format_questions(self, raw: str) -> List[str]:
        """
        Regex fallback cleaner for legacy free-text outputs
        """
        parts = raw.strip().split("\n\n")
        out, n = [], 1
        for p in parts:
            line = p.strip()
            if not line or re.search(r"(note|instruction|thinking|reasoning|let's|alright)", line.lower()):
                continue
            if (line.endswith("?")
                or re.match(r"^(Discuss|Explain|Analyze|Evaluate|Critically|Examine|Comment|Elucidate|Illustrate|"
                                r"Describe|Assess|Justify|Outline|Compare|Contrast|What|Why|How|To what extent)", line)):
                out.append(f"{n}. {line}")
                n += 1
        return out

    def generate_questions_from_keywords(self, keywords: List[str], num: int, use_ca: bool, months: int, requested_model: str, subject: str = "GS1"):
        """
        Generate UPSC-style questions based on provided keywords using vector search and LLM prompting.
        """
        try:
            models_to_try = self.select_model(requested_model)
            
            # Convert keywords to a search query
            keyword_query = ", ".join(keywords)
            
            # Get relevant documents using vector similarity search based on keywords
            db_examples = []
            for keyword in keywords[:3]:  # Limit to first 3 keywords for efficiency
                # Use the new method without strict filtering for keyword-based search
                examples = self._get_relevant_documents_without_filter(
                    f"UPSC questions related to {keyword}", 
                    k=2
                )
                db_examples.extend(examples)
            
            # Get cached questions as examples
            cached_examples = []
            for keyword in keywords[:2]:  # Limit to first 2 keywords for efficiency
                examples = self._get_cached_questions_as_examples(subject, keyword, max_examples=1)  # Use provided subject
                cached_examples.extend(examples)
            
            # Combine examples
            all_examples = db_examples + cached_examples
            examples_text = "\n".join(all_examples) if all_examples else "No examples available."
            
            # Create prompt for keyword-based question generation
            prompt_template = PromptTemplate.from_template(
                """You are a UPSC Mains question paper designer.
Generate {num} original UPSC-style Mains questions based on the following keywords: "{keywords}".

Examples from database and previous generations:
{examples}

IMPORTANT:
- Output ONLY in English
- Output MUST be a valid JSON array of objects
- Each object must have "thinking" (short rationale) AND "question" (final UPSC-style question)
- "thinking": max 2-3 sentences
- "question": one exam-appropriate UPSC question
- No commentary or text outside JSON
- Exactly {num} items
- Generate NEW questions, don't copy the examples
- Ensure questions are relevant to the provided keywords

Now return ONLY the JSON array:"""
            )
            
            prompt = prompt_template.format(
                num=num,
                keywords=keyword_query,
                examples=examples_text
            )
            
            if use_ca:
                # Add current affairs context if requested
                news_contexts = []
                for keyword in keywords[:2]:  # Limit to first 2 keywords for efficiency
                    news = self.fetch_recent_news(keyword, months)
                    if news and "not configured" not in news:
                        news_contexts.append(f"Recent news for {keyword}:\n{news[:200]}...")
                news_text = "\n\n".join(news_contexts) if news_contexts else ""
                
                if news_text:
                    prompt += f"\n\nRecent News Context:\n{news_text}"
            
            result = self._try_models(models_to_try, prompt)
            
            # Parse questions
            questions = self.safe_parse_questions(result.get("output", ""), num)
            
            # Cache the new questions if generation was successful
            if questions and result.get("status") == "success":
                # Use the first keyword as the topic for caching
                cache_topic = keywords[0] if keywords else "general"
                cache_key = self._get_cache_key(subject, cache_topic, num, use_ca, months)  # Use provided subject
                self._cache_questions(cache_key, questions, subject, cache_topic)  # Use provided subject
            
            return {
                "questions": questions,
                "meta": {
                    "model": result.get("model", "unknown"),
                    "duration": result.get("duration", 0.0),
                    "avg_speed": result.get("avg_speed", 0.0),
                    "runs": result.get("runs", 0),
                    "status": result.get("status", "unknown"),
                    "examples_used": len(all_examples),
                    "cached_examples": len(cached_examples)
                }
            }
        except Exception as e:
            logger.error(f"Error in generate_questions_from_keywords: {e}")
            return {
                "questions": [{"thinking": "", "question": f"Error generating questions from keywords: {str(e)}"}],
                "meta": {
                    "model": "error",
                    "duration": 0.0,
                    "avg_speed": 0.0,
                    "runs": 0,
                    "status": "error"
                }
            }

# Factory
def create_question_generator(groq_api_key, google_api_key, vectorstore, supabase_client):
    return QuestionGenerator(groq_api_key, google_api_key, vectorstore, supabase_client)
