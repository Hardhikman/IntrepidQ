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
- Document retrieval via vector search with stratified sampling for example selection.
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
from typing import Dict, List, Optional, Any
from diskcache import Cache
from supabase import Client
from langchain.prompts import PromptTemplate
from langchain_groq import ChatGroq
from langchain_community.vectorstores import SupabaseVectorStore
from langchain_core.utils import convert_to_secret_str
from langchain_core.documents import Document

# Optional providers
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
except ImportError:
    ChatGoogleGenerativeAI = None

# Configure logger for clear output
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
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
        logger.info("Initializing QuestionGenerator...")
        self.groq_api_key = groq_api_key
        self.google_api_key = google_api_key
        self.vectorstore = vectorstore
        self.supabase_client = supabase_client
        self.cache = Cache(cache_dir)
        
        self.topics_by_subject = (
            self._build_topics_by_subject()
            if (vectorstore and supabase_client)
            else {"GS1": [], "GS2": [], "GS3": [], "GS4": []}
        )
        self._setup_templates()
        self.available_models = {
            "llama3-70b": {"provider": "groq", "model_id": "llama-3.3-70b-versatile"},
            "gemma2-9b": {"provider": "groq", "model_id": "llama-3.1-8b-instant"},
            "openai-oss-20b": {"provider": "groq", "model_id": "openai/gpt-oss-20b"},
            "gemini-2.5-flash": {"provider": "google", "model_id": "gemini-2.5-flash"},
            "moonshot-k2": {"provider": "groq", "model_id": "moonshotai/kimi-k2-instruct-0905"},
        }
        self.priority_order = ["gemma2-9b","openai-oss-20b", "llama3-70b", "moonshot-k2", "gemini-2.5-flash"]
        self.model_speeds: Dict[str, List[float]] = {}
        self.min_attempts_for_avg = 3
        self._load_model_performance()
        logger.info("QuestionGenerator initialized successfully.")

    # Supabase Questions Cache Management
    def _get_cache_key(self, subject: str, topic: str, num: int, use_ca: bool = False, months: int = 6) -> str:
        key_data = f"{subject}_{topic}_{num}_{use_ca}_{months}"
        return hashlib.md5(key_data.encode()).hexdigest()

    def _cache_questions(self, cache_key: str, questions: List[dict], subject: str, topic: str):
        if not self.supabase_client:
            logger.warning("Supabase client not available. Skipping caching.")
            return
        
        logger.info(f"Attempting to cache {len(questions)} questions for topic '{topic}' with key '{cache_key[:8]}...'")
        try:
            cache_data = {
                "cache_key": cache_key, "subject": subject, "topic": topic,
                "questions": json.dumps(questions),
                "metadata": json.dumps({"generated_at": datetime.now().isoformat(), "question_count": len(questions)}),
                "expires_at": (datetime.now() + timedelta(days=7)).isoformat()
            }
            self.supabase_client.table('questions_cache').upsert(cache_data).execute()
            
            topic_entries = [
                {"subject": subject, "topic": topic, "question_text": q.get("question", str(q)),
                 "question_data": json.dumps(q), "expires_at": (datetime.now() + timedelta(days=7)).isoformat()}
                for q in questions
            ]
            
            if topic_entries:
                self.supabase_client.table('topic_questions_index').insert(topic_entries).execute()
                self._cleanup_topic_cache(subject, topic, max_entries=50)
            
            logger.info(f"Successfully cached {len(questions)} questions in Supabase for {subject} - {topic}.")
        except Exception as e:
            logger.error(f"Failed to cache questions in Supabase: {e}")

    def _cleanup_topic_cache(self, subject: str, topic: str, max_entries: int = 50):
        if not self.supabase_client: return
        
        try:
            response = (self.supabase_client.table('topic_questions_index')
                        .select('id', count='exact').eq('subject', subject).eq('topic', topic).execute()) # type: ignore
            
            count = response.count or 0
            if count > max_entries:
                logger.info(f"Topic cache for '{topic}' has {count} entries (limit {max_entries}). Cleaning up oldest {count - max_entries}...")
                excess_count = count - max_entries
                old_entries_resp = (self.supabase_client.table('topic_questions_index')
                                   .select('id').eq('subject', subject).eq('topic', topic)
                                   .order('created_at').limit(excess_count).execute())
                
                if old_entries_resp.data:
                    ids_to_delete = [entry['id'] for entry in old_entries_resp.data]
                    for entry_id in ids_to_delete:
                        self.supabase_client.table('topic_questions_index').delete().eq('id', entry_id).execute()
                    logger.info(f"Cleaned up {len(ids_to_delete)} old cache entries for '{topic}'.")
        except Exception as e:
            logger.error(f"Failed to cleanup topic cache for '{topic}': {e}")

    def _get_cached_questions_as_examples(self, subject: str, topic: str, max_examples: int = 3) -> List[str]:
        if not self.supabase_client: return []
        
        logger.info(f"Searching for cached question examples for topic: '{topic}'")
        try:
            response = (self.supabase_client.table('topic_questions_index')
                        .select('question_text').eq('subject', subject).eq('topic', topic)
                        .gt('expires_at', datetime.now().isoformat())
                        .order('created_at', desc=True).limit(max_examples * 2).execute())
            
            if not response.data:
                logger.info(f"No valid cached examples found for '{topic}'.")
                return []
            
            questions = [item['question_text'] for item in response.data if item.get('question_text')]
            if not questions: return []
            
            num_to_sample = min(len(questions), max_examples)
            selected_questions = random.sample(questions, num_to_sample)
            
            examples = [f"{i}. {q}" for i, q in enumerate(selected_questions, 1)]
            logger.info(f"Found and sampled {len(examples)} cached examples for '{topic}'.")
            return examples
        except Exception as e:
            logger.warning(f"Failed to get cached examples for '{topic}': {e}")
            return []

    def _get_all_cached_questions_for_examples(self, subject: str, max_examples: int = 5) -> List[str]:
        if not self.supabase_client:
            return []
        
        try:
            response = (self.supabase_client
                        .table('topic_questions_index')
                        .select('question_text')
                        .eq('subject', subject)
                        .gt('expires_at', datetime.now().isoformat())
                        .order('created_at', desc=True)
                        .limit(max_examples * 3)
                        .execute())
            
            if not response.data:
                return []
            
            questions = [item['question_text'] for item in response.data if item.get('question_text')]
            
            if not questions:
                return []
            
            num_examples = min(len(questions), max_examples)
            selected_questions = random.sample(questions, num_examples)
            
            examples = [f"{i}. {question}" for i, question in enumerate(selected_questions, 1)]
            
            logger.info(f"Using {len(examples)} Supabase cached questions as examples for whole paper generation")
            return examples
            
        except Exception as e:
            logger.warning(f"Failed to get all cached examples for {subject}: {e}")
            return []

    def get_cache_stats(self) -> dict:
        stats = {
            "cache_type": "supabase_only",
            "subjects": {},
            "total_questions": 0,
            "total_cache_entries": 0
        }
        
        if not self.supabase_client:
            return stats
        
        try:
            cache_resp = self.supabase_client.table('questions_cache').select('id', count='exact').execute() # type: ignore
            stats["total_cache_entries"] = cache_resp.count or 0
            
            topic_resp = self.supabase_client.table('topic_questions_index').select('id', count='exact').execute() # type: ignore
            stats["total_questions"] = topic_resp.count or 0
            
            for subject in ["GS1", "GS2", "GS3", "GS4"]:
                try:
                    cache_subject_resp = (self.supabase_client
                                         .table('questions_cache')
                                         .select('id', count='exact') # type: ignore
                                         .eq('subject', subject)
                                         .execute())
                    
                    topic_subject_resp = (self.supabase_client
                                         .table('topic_questions_index')
                                         .select('id', count='exact') # type: ignore
                                         .eq('subject', subject)
                                         .execute())
                    
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
                    stats["subjects"][subject] = {"cache_entries": 0, "questions": 0, "topics_with_cache": 0}
        
        except Exception as e:
            logger.error(f"Failed to get cache stats: {e}")
        
        return stats

    def clear_cache(self, subject: Optional[str] = None, topic: Optional[str] = None):
        if not self.supabase_client:
            logger.warning("Supabase client not available for cache clearing")
            return
        
        try:
            if topic and subject:
                self.supabase_client.table('questions_cache').delete().eq('subject', subject).eq('topic', topic).execute()
                self.supabase_client.table('topic_questions_index').delete().eq('subject', subject).eq('topic', topic).execute()
                logger.info(f"Cleared Supabase cache for {subject} - {topic}")
            elif subject:
                self.supabase_client.table('questions_cache').delete().eq('subject', subject).execute()
                self.supabase_client.table('topic_questions_index').delete().eq('subject', subject).execute()
                logger.info(f"Cleared Supabase cache for all topics in {subject}")
            else:
                self.supabase_client.table('questions_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
                self.supabase_client.table('topic_questions_index').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
                logger.info("Cleared all Supabase cache")
        
        except Exception as e:
            logger.error(f"Failed to clear cache: {e}")

    def _load_model_performance(self):
        if not self.supabase_client: return
        try:
            resp = self.supabase_client.table("model_performance").select("*").execute()
            for row in resp.data or []:
                name = row["model_name"]
                if row.get("avg_speed") and row.get("num_runs"):
                    self.model_speeds[name] = [row["avg_speed"]] * row["num_runs"]
            logger.info(f"Loaded model performance history: {self.model_speeds}")
        except Exception as e:
            logger.warning(f"Could not load model performance: {e}")

    def _save_model_performance(self, model_name: str):
        if not self.supabase_client: return
        try:
            avg_speed = sum(self.model_speeds[model_name]) / len(self.model_speeds[model_name])
            num_runs = len(self.model_speeds[model_name])
            self.supabase_client.table("model_performance").upsert(
                {"model_name": model_name, "avg_speed": avg_speed, "num_runs": num_runs},
                on_conflict="model_name"
            ).execute()
        except Exception as e:
            logger.warning(f"Failed saving model performance: {e}")

    def _log_model_speed(self, model_name: str, elapsed: float, success: bool):
        self.model_speeds.setdefault(model_name, []).append(elapsed)
        self._save_model_performance(model_name)
        avg_speed = sum(self.model_speeds[model_name]) / len(self.model_speeds[model_name])
        status = "SUCCESS" if success else "FAIL"
        logger.info(f"[{status}] {model_name} took {elapsed:.2f}s (avg {avg_speed:.2f}s over {len(self.model_speeds[model_name])} runs)")

    def select_model(self, requested_model: Optional[str] = None) -> List[str]:
        logger.info("--- Selecting Model ---")
        if requested_model and requested_model in self.available_models:
            logger.info(f"User requested model: '{requested_model}'. Placing it first.")
            fallback = [m for m in self.priority_order if m != requested_model]
            return [requested_model] + fallback
        
        logger.info("No specific model requested. Using adaptive auto-selection based on performance.")
        if all(len(times) >= self.min_attempts_for_avg for times in self.model_speeds.values()):
            ordered = sorted(
                [m for m in self.priority_order if m in self.available_models],
                key=lambda m: sum(self.model_speeds.get(m, [float("inf")])) / len(self.model_speeds.get(m, [1]))
            )
            logger.info(f"Adaptive priority order determined: {ordered}")
            return ordered
        
        logger.info("Not enough performance data for adaptive selection. Using default priority order.")
        return [m for m in self.priority_order if m in self.available_models]

    def _get_groq_client(self, model_id: str) -> ChatGroq:
        return ChatGroq(model=model_id, api_key=convert_to_secret_str(self.groq_api_key), temperature=float(os.getenv("GROQ_TEMPERATURE", "0.7")))

    def _get_gemini_client(self, model_id: str):
        if not self.google_api_key or ChatGoogleGenerativeAI is None:
            return None
        return ChatGoogleGenerativeAI(model=model_id, api_key=convert_to_secret_str(self.google_api_key), temperature=float(os.getenv("GEMINI_TEMPERATURE", "0.7")))

    def _get_llm_client(self, model_name: str):
        info = self.available_models.get(model_name)
        if not info: return None
        provider, model_id = info["provider"], info["model_id"]
        return {"groq": lambda: self._get_groq_client(model_id), "google": lambda: self._get_gemini_client(model_id)}.get(provider, lambda: None)()

    def _try_models(self, models: List[str], prompt: str) -> dict:
        last_error = None
        for idx, model_name in enumerate(models):
            logger.info(f"Attempting model: {model_name}")
            llm = self._get_llm_client(model_name)
            if not llm: continue
            
            start = time.time()
            try:
                result = self._use_llm(llm, prompt)
                elapsed = round(time.time() - start, 2)
                self._log_model_speed(model_name, elapsed, success=True)
                avg_speed = sum(self.model_speeds[model_name]) / len(self.model_speeds[model_name])
                return {"output": result, "model": model_name, "duration": elapsed, "avg_speed": round(avg_speed, 2), "runs": len(self.model_speeds[model_name]), "status": "success"}
            except Exception as e:
                elapsed = round(time.time() - start, 2)
                self._log_model_speed(model_name, elapsed, success=False)
                logger.warning(f"Model {model_name} failed in {elapsed:.2f}s - {e}")
                if idx == 0: logger.warning(f"Selected model {model_name} failed. Falling back.")
                last_error = str(e)
        return {"output": f"Error: All model attempts failed. Last error: {last_error}", "model": "failed", "duration": 0.0, "avg_speed": 0.0, "runs": 0, "status": "all_failed"}

    def _use_llm(self, llm, prompt: str) -> str:
        response = llm.invoke(prompt)
        if hasattr(response, "content"): return response.content.strip()
        if hasattr(response, "text"): return response.text.strip()
        return str(response).strip()

    def _setup_templates(self):
        self.gs_prompt = PromptTemplate.from_template(
            """You are a UPSC Mains question paper designer for {subject}.
Generate {num} original UPSC-style Mains questions for the topic "{topic}".
Examples from database and previous generations:\n{examples}\n
IMPORTANT:\n- Output ONLY in English\n- Output MUST be a valid JSON array of objects\n- Each object must have "thinking" (short rationale) AND "question" (final UPSC-style question)\n- "thinking": max 2-3 sentences\n- "question": one exam-appropriate UPSC question\n- No commentary or text outside JSON\n- Exactly {num} items\n- Generate NEW questions, don't copy the examples\n
Now return ONLY the JSON array:"""
        )
        self.whole_paper_prompt = PromptTemplate.from_template(
            """You are a UPSC Mains paper designer for {subject}.
Generate a full UPSC paper (10 questions) covering multiple topics.
Examples from database and previous generations:\n{topic_examples}\n
IMPORTANT:\n- Output ONLY in English\n- Output MUST be a valid JSON array of 10 objects\n- Each object must have "thinking" + "question"\n- "thinking": short reasoning (max 2-3 sentences)\n- "question": one exam-appropriate UPSC question\n- No commentary/reasoning outside JSON\n- Exactly 10 items\n- Generate NEW questions, don't copy the examples\n
Now return ONLY the JSON array:"""
        )

    def _get_ca_paper_prompt(self, subject: str, selected_topics: List[str], topic_examples_text: str, months: int, news_source: str = "all") -> str:
        news_contexts = [f"Recent news for {topic}:\n{news[:200]}..." for topic in selected_topics[:3] if (news := self.fetch_recent_news(topic, months, news_source)) and "not configured" not in news]
        news_text = "\n\n".join(news_contexts)
        return f"""You are a UPSC Mains paper designer for {subject}.
Generate 10 analytical UPSC questions incorporating current affairs.
Topics and Example Questions:\n{topic_examples_text}\n
Recent News Context:\n{news_text}\n
IMPORTANT:\n- Output ONLY in English\n- Output MUST be a valid JSON array of 10 objects\n- Each object: "thinking" + "question"\n- "thinking": 1-3 sentences of reasoning\n- "question": final exam-style UPSC question\n- No commentary/reasoning outside JSON\n- Exactly 10 items\n- Generate NEW questions based on Recent News Context\n
Now return ONLY the JSON array:"""

    def _build_topics_by_subject(self) -> Dict[str, List[str]]:
        topics = {"GS1": [], "GS2": [], "GS3": [], "GS4": []}
        if not self.supabase_client: return topics
        resp = self.supabase_client.table("documents").select("metadata").execute()
        for item in resp.data or []:
            topic = item.get("metadata", {}).get("topic")
            for gs in topics:
                if topic and topic.startswith(gs):
                    topics[gs].append(topic)
        for gs in topics: topics[gs] = sorted(set(topics[gs]))
        return topics

    def get_topics_for_subject(self, subject: str) -> List[str]:
        return self.topics_by_subject.get(subject, [])

    def get_subject_from_topic(self, topic: str) -> str:
        for subject, topics in self.topics_by_subject.items():
            if topic in topics: return subject
        return "GS1"

    def fetch_recent_news(self, topic: str, months: int = 6, news_source: str = "all") -> str:
        logger.info(f"--- Fetching News for '{topic}' ---")
        return self._fetch_with_tavily(topic, months, news_source)

    def _fetch_with_tavily(self, search_topic: str, months: int = 6, news_source: str = "all") -> str:
        try:
            from tavily import TavilyClient
            end_date, start_date = datetime.utcnow().date(), (datetime.utcnow().date() - timedelta(days=30 * months))
            client = TavilyClient(os.getenv("TAVILY_API_KEY"))
            include_domains = ["https://indianexpress.com"] if news_source == "indianexpress" else ["https://thehindu.com"] if news_source == "thehindu" else []
            search_params = {"query": search_topic, "search_depth": "advanced", "start_date": start_date.isoformat(), "end_date": end_date.isoformat(), "include_raw_content": False, "max_results": 3, "chunks_per_source": 1}
            if include_domains: search_params["include_domains"] = include_domains
            logger.info(f"Fetching news from source: {news_source}")
            response = client.search(**search_params)
            articles = response.get("results", [])
            # Process the content outside of the f-string to avoid backslash errors
            news_items = []
            for article in articles:
                content = article.get('content', 'No content').strip()
                content = content.replace('\n', ' ').replace('\r', ' ')
                content = content[:300] + "..."
                news_items.append(f"- {content}")
            news = "\n".join(news_items)
            logger.info(f"Tavily fetch successful. Found {len(articles)} articles from {news_source}.")
            return news if news else "No news articles found."
        except Exception as e:
            logger.error(f"Tavily fetch failed for source {news_source}: {e}")
            return f"Error fetching news: {e}"

    def safe_parse_questions(self, output: str, num: Optional[int] = None) -> List[dict]:
        cleaned = re.sub(r"<think>.*?</think>", "", output, flags=re.DOTALL).strip()
        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, list): return [{"thinking": q.get("thinking", "").strip(), "question": q["question"].strip()} if isinstance(q, dict) and "question" in q else {"thinking": "", "question": str(q).strip()} for q in (parsed[:num] if num else parsed)]
        except Exception: pass
        match = re.search(r"\[[\s\S]*\]", cleaned)
        if match:
            try:
                parsed = json.loads(match.group(0))
                if isinstance(parsed, list): return [{"thinking": q.get("thinking", "").strip(), "question": q["question"].strip()} if isinstance(q, dict) and "question" in q else {"thinking": "", "question": str(q).strip()} for q in (parsed[:num] if num else parsed)]
            except Exception: pass
        return [{"thinking": "", "question": q} for q in (self.format_questions(cleaned)[:num] if num else self.format_questions(cleaned))]

    def generate_topic_questions(self, subject, topic, num, use_ca, months, requested_model, news_source, keyword_context=None):
        logger.info(f"\n--- STARTING TOPIC-BASED QUESTION GENERATION ---")
        logger.info(f"Parameters: Subject='{subject}', Topic='{topic}', Num='{num}', Use CA='{use_ca}'")
        models_to_try = self.select_model(requested_model)
        if use_ca: result = self._generate_current_affairs_questions(subject, topic, num, months, models_to_try, news_source, keyword_context)
        else: result = self._generate_static_questions(subject, topic, num, models_to_try)
        logger.info(f"--- COMPLETED TOPIC-BASED GENERATION ---\n")
        return result

    def _generate_static_questions(self, subject, topic, num, models_to_try: List[str]):
        try:
            initial_docs = self._get_relevant_documents_with_fallback(query=f"UPSC questions for {subject} on {topic}", k=20, topic=topic)
            sampled_docs = self._apply_stratified_sampling(initial_docs, 5)
            db_examples = [doc.page_content for doc in sampled_docs]
            cached_examples = self._get_cached_questions_as_examples(subject, topic, max_examples=3)
            all_examples = db_examples + cached_examples
            logger.info(f"Total examples for prompt: {len(all_examples)} ({len(db_examples)} from DB, {len(cached_examples)} from cache).")
            prompt = self.gs_prompt.format(subject=subject, topic=topic, examples="\n".join(all_examples), num=num)
            result = self._try_models(models_to_try, prompt)
            questions = self.safe_parse_questions(result.get("output", ""), num)
            if questions and result.get("status") == "success": self._cache_questions(self._get_cache_key(subject, topic, num, False, 0), questions, subject, topic)
            meta = {k:v for k,v in result.items() if k != 'output'}
            meta.update({"examples_used": len(all_examples), "cached_examples": len(cached_examples)})
            return {"questions": questions, "meta": meta}
        except Exception as e:
            logger.error(f"FATAL Error in _generate_static_questions: {e}", exc_info=True)
            return {"questions": [], "meta": {"status": "error", "message": str(e)}}

    def _generate_current_affairs_questions(self, subject, topic, num, months, models_to_try: List[str], news_source: str = "all", keyword_context: Optional[str] = None):
        logger.info(f"Enhancing with Current Affairs. Keyword: '{keyword_context or topic}'")
        try:
            initial_docs = self._get_relevant_documents_with_fallback(query=f"UPSC questions for {subject} on {topic}", k=20, topic=topic)
            sampled_docs = self._apply_stratified_sampling(initial_docs, 5)
            db_examples = [doc.page_content for doc in sampled_docs]
            cached_examples = self._get_cached_questions_as_examples(subject, topic, max_examples=2)
            all_examples = db_examples + cached_examples
            news = self.fetch_recent_news(keyword_context or topic, months, news_source)
            logger.info(f"Total examples for prompt: {len(all_examples)}. News content length: {len(news)} chars.")
            examples_text = "\n".join(all_examples)
            prompt = f"{self.gs_prompt.format(subject=subject, topic=topic, examples=examples_text, num=num)}\n\nRecent News:\n{news}"
            result = self._try_models(models_to_try, prompt)
            questions = self.safe_parse_questions(result.get("output", ""), num)
            if questions and result.get("status") == "success": self._cache_questions(self._get_cache_key(subject, topic, num, True, months), questions, subject, topic)
            meta = {k:v for k,v in result.items() if k != 'output'}
            meta.update({"examples_used": len(all_examples), "cached_examples": len(cached_examples), "news_included": True, "news_content_length": len(news)})
            return {"questions": questions, "meta": meta}
        except Exception as e:
            logger.error(f"FATAL Error in _generate_current_affairs_questions: {e}", exc_info=True)
            return {"questions": [], "meta": {"status": "error", "message": str(e)}}

    def generate_whole_paper(self, subject: str, use_ca: bool, months: int, requested_model: str, news_source: str = "all"):
        logger.info(f"\n--- STARTING WHOLE PAPER GENERATION (Old Method) ---")
        logger.info(f"Parameters: Subject='{subject}', Use CA='{use_ca}'")
        try:
            models_to_try = self.select_model(requested_model)
            subject_topics = self.topics_by_subject.get(subject, [])
            if not subject_topics:
                logger.warning(f"No topics found for subject '{subject}'.")
                return {"questions": [], "meta": {"status": "no_topics"}}

            num_topics = min(len(subject_topics), 6)
            selected_topics = random.sample(subject_topics, num_topics)
            logger.info(f"Randomly selected {len(selected_topics)} topics: {selected_topics}")
            
            topic_examples_list = self._gather_topic_examples(selected_topics, subject)
            cached_examples = self._get_all_cached_questions_for_examples(subject, max_examples=5)
            all_examples = topic_examples_list + cached_examples
            
            examples_text = "\n".join(all_examples)
            prompt = self.whole_paper_prompt.format(subject=subject, topic_examples=examples_text)
            if use_ca:
                logger.info("Enhancing whole paper with Current Affairs.")
                prompt = self._get_ca_paper_prompt(subject, selected_topics, "\n".join(all_examples), months, news_source)

            result = self._try_models(models_to_try, prompt)
            questions = self.safe_parse_questions(result.get("output", ""), 10)
            
            if questions and result.get("status") == "success": logger.info("Distributing generated paper questions into topic cache.")

            meta = {k:v for k,v in result.items() if k != 'output'}
            meta.update({"examples_used": len(all_examples), "cached_examples": len(cached_examples), "topics_covered": selected_topics})
            logger.info(f"--- COMPLETED WHOLE PAPER GENERATION ---\n")
            return {"questions": questions, "meta": meta}
        except Exception as e:
            logger.error(f"FATAL Error in generate_whole_paper: {e}", exc_info=True)
            return {"questions": [], "meta": {"status": "error", "message": str(e)}}

    def _find_best_topic_for_question(self, question_text: str, topics: List[str]) -> Optional[str]:
        if not question_text or not topics: return None
        question_lower = question_text.lower()
        for topic in topics:
            topic_keywords = topic.split(' - ')[-1].lower().split()
            if any(keyword in question_lower for keyword in topic_keywords): return topic
        return random.choice(topics) if topics else None

    def _apply_stratified_sampling(self, documents: List[Document], n_samples: int) -> List[Document]:
        logger.info(f"--- Applying Stratified Sampling on {len(documents)} docs to get {n_samples} ---")
        if not documents or len(documents) <= n_samples:
            logger.warning(f"Not enough documents to sample. Returning all.")
            return documents

        strata: Dict[str, List[Document]] = {}
        for doc in documents: strata.setdefault(doc.metadata.get("topic", "unknown"), []).append(doc)
        logger.info(f"Identified {len(strata)} strata.")
        
        total_docs = len(documents)
        allocation = {topic: len(docs) / total_docs * n_samples for topic, docs in strata.items()}
        
        sampled_docs = []
        for topic, docs in strata.items():
            num_to_take = min(round(allocation[topic]), len(docs))
            if num_to_take > 0: sampled_docs.extend(random.sample(docs, int(num_to_take)))

        remaining_needed = n_samples - len(sampled_docs)
        if remaining_needed > 0:
            sampled_ids = {id(doc) for doc in sampled_docs}
            remaining_docs = [doc for doc in documents if id(doc) not in sampled_ids]
            if remaining_docs:
                fill_count = min(remaining_needed, len(remaining_docs))
                sampled_docs.extend(random.sample(remaining_docs, fill_count))

        logger.info(f"Sampling complete. Final sample size: {len(sampled_docs)}.")
        return sampled_docs[:n_samples]

    def _get_relevant_documents_with_fallback(self, query: str, k: int = 5, topic: Optional[str] = None, subject_filter: Optional[str] = None) -> List[Document]:
        if not self.vectorstore or not self.supabase_client or not hasattr(self.vectorstore, 'embeddings'):
            logger.warning("Vectorstore/Supabase not available. Using fallback method.")
            return self._get_documents_current_method(query, k, topic, subject_filter)
            
        try:
            logger.info(f"Executing vector search: K={k}, Topic='{topic}'")
            query_embedding = self.vectorstore.embeddings.embed_query(query)
            doc_filter = {'topic': topic} if topic and topic.strip() else {}
            
            response = self.supabase_client.rpc("match_documents", {"filter": doc_filter, "match_count": k, "query_embedding": query_embedding}).execute()

            docs = [Document(page_content=item.get("content", ""), metadata=item.get("metadata", {})) for item in response.data] if response.data else []
            logger.info(f"Vector search with filter successful. Found {len(docs)} documents.")
            return docs
        except Exception as e:
            logger.error(f"Vector search with filter failed: {e}. Falling back to direct query.")
            return self._get_documents_current_method(query, k, topic, subject_filter)

    def _get_relevant_documents_without_filter(self, query: str, k: int = 5) -> List[str]:
        if not self.supabase_client or not self.vectorstore or not hasattr(self.vectorstore, 'embeddings'): return []
        try:
            query_embedding = self.vectorstore.embeddings.embed_query(query)
            response = self.supabase_client.rpc("match_documents", {"filter": {}, "query_embedding": query_embedding, "match_count": k}).execute()
            return [item["content"] for item in response.data] if response.data else []
        except Exception as e:
            logger.warning(f"Vector search without filter failed: {e}")
            return []

    def _get_documents_current_method(self, query: str, k: int = 5, topic: Optional[str] = None, subject_filter: Optional[str] = None) -> List[Document]:
        if not self.supabase_client: return []
        try:
            query_builder = self.supabase_client.table("documents").select("content, metadata")
            if topic: query_builder = query_builder.eq("metadata->>topic", topic)
            resp = query_builder.limit(k).execute()
            docs = [Document(page_content=item.get("content", ""), metadata=item.get("metadata", {})) for item in resp.data] if resp.data else []
            if subject_filter: docs = [doc for doc in docs if doc.metadata.get("topic", "").startswith(subject_filter)]
            return docs
        except Exception as e:
            logger.warning(f"Fallback document retrieval failed: {e}")
            return []

    def _gather_topic_examples(self, selected_topics: List[str], subject: str) -> List[str]:
        """ Gathers examples by taking the top 2 documents from each selected topic (original method). """
        logger.info("Gathering top 2 examples per topic for whole paper (original method)...")
        topic_examples = []
        for topic in selected_topics:
            try:
                docs = self._get_relevant_documents_with_fallback(query=f"UPSC questions for {subject} on {topic}", k=2, topic=topic)
                examples = [doc.page_content for doc in docs]
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
        parts = raw.strip().split("\n\n")
        out, n = [], 1
        for p in parts:
            line = p.strip()
            if not line or re.search(r"(note|instruction|thinking|reasoning|let's|alright)", line.lower()): continue
            if (line.endswith("?") or re.match(r"^(Discuss|Explain|Analyze|Evaluate|Critically|Examine|Comment|Elucidate|Illustrate|Describe|Assess|Justify|Outline|Compare|Contrast|What|Why|How|To what extent)", line)):
                out.append(f"{n}. {line}")
                n += 1
        return out

    def generate_questions_from_keywords(self, keywords: List[str], num: int, use_ca: bool, months: int, requested_model: str, subject: str = "GS1"):
        logger.info(f"\n--- STARTING KEYWORD-BASED QUESTION GENERATION ---")
        logger.info(f"Parameters: Keywords='{keywords}', Num='{num}', Use CA='{use_ca}'")
        try:
            models_to_try = self.select_model(requested_model)
            if not keywords:
                return {"questions": [], "meta": {"status": "error", "message": "No keywords provided."}}

            first_keyword = keywords[0]
            db_examples = self._get_relevant_documents_without_filter(f"UPSC questions related to {first_keyword}", k=5)
            logger.info(f"Retrieved {len(db_examples)} documents from the database for keyword '{first_keyword}' without filter.")

            cached_examples = self._get_cached_questions_as_examples(subject, first_keyword, max_examples=2)
            all_examples = db_examples + cached_examples
            
            prompt_template = PromptTemplate.from_template(
                """You are a UPSC Mains question paper designer.
Generate {num} original UPSC-style Mains questions based on the following keywords: "{keywords}".
Examples:\n{examples}\n
IMPORTANT:\n- Output ONLY in English\n- Output MUST be a valid JSON array of objects\n- Each object must have "thinking" and "question"\n- No commentary outside JSON\n- Exactly {num} items\n
Now return ONLY the JSON array:"""
            )
            prompt = prompt_template.format(num=num, keywords=", ".join(keywords), examples="\n".join(all_examples))
            
            if use_ca:
                news = self.fetch_recent_news(first_keyword, months)
                if news and "Error" not in news:
                    prompt += f"\n\nRecent News Context:\n{news}"

            result = self._try_models(models_to_try, prompt)
            questions = self.safe_parse_questions(result.get("output", ""), num)
            
            if questions and result.get("status") == "success":
                self._cache_questions(self._get_cache_key(subject, first_keyword, num, use_ca, months), questions, subject, first_keyword)
            
            meta = {k:v for k,v in result.items() if k != 'output'}
            meta.update({"examples_used": len(all_examples), "cached_examples": len(cached_examples)})
            logger.info(f"--- COMPLETED KEYWORD-BASED GENERATION ---\n")
            return {"questions": questions, "meta": meta}
        except Exception as e:
            logger.error(f"FATAL Error in generate_questions_from_keywords: {e}", exc_info=True)
            return {"questions": [], "meta": {"status": "error", "message": str(e)}}

# Factory
def create_question_generator(groq_api_key, google_api_key, vectorstore, supabase_client):
    return QuestionGenerator(groq_api_key, google_api_key, vectorstore, supabase_client)
