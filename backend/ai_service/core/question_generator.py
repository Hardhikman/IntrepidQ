
"""
Question generation functionality - multi-provider
Supports: Groq, Gemini, Together, OpenRouter
Features:
- Provider-agnostic model calls
- Automatic retry-on-failure with fallback list
- Model speed logging
- Adaptive model prioritisation at runtime
- Persistent model performance in Supabase
- Consistent stats output for topic & paper generation
- Generated questions caching with random example selection to get reliable questions
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
        cache_dir: str = "news_cache",
        questions_cache_dir: str = "questions_cache"
    ):
        self.groq_api_key = groq_api_key
        self.google_api_key = google_api_key
        self.vectorstore = vectorstore
        self.supabase_client = supabase_client
        self.cache = Cache(cache_dir)
        
        # Separate cache for generated questions
        self.questions_cache = Cache(questions_cache_dir)
        
        self.topics_by_subject = (
            self._build_topics_by_subject()
            if (vectorstore and supabase_client)
            else {"GS1": [], "GS2": [], "GS3": [], "GS4": []}
        )
        self._setup_templates()
        self.available_models = {
            "llama3-70b": {"provider": "groq", "model_id": "llama3-70b-8192"},
            "llama3-8b": {"provider": "groq", "model_id": "llama3-8b-8192"},
            "gemma2-9b": {"provider": "groq", "model_id": "gemma2-9b-it"},
            "deepseek-r1": {"provider": "openrouter", "model_id": "deepseek/deepseek-r1:free"},
            "gemini-1.5-flash": {"provider": "google", "model_id": "gemini-1.5-flash-latest"},
            "deepseek-v3": {"provider": "openrouter", "model_id": "deepseek/deepseek-chat-v3-0324:free"},
            "moonshot-k2": {"provider": "openrouter", "model_id": "moonshotai/kimi-k2:free"},
        }
        self.priority_order = ["gemma2-9b", "deepseek-v3", "llama3-70b", "moonshot-k2", "deepseek-r1"]
        self.model_speeds: Dict[str, List[float]] = {}
        self.min_attempts_for_avg = 3
        self._load_model_performance()

    # Questions Cache Management
    def _get_cache_key(self, subject: str, topic: str, num: int, use_ca: bool = False, months: int = 6) -> str:
        """Generate cache key for questions"""
        key_data = f"{subject}_{topic}_{num}_{use_ca}_{months}"
        return hashlib.md5(key_data.encode()).hexdigest()

    def _cache_questions(self, cache_key: str, questions: List[dict], subject: str, topic: str):
        """Cache generated questions with metadata"""
        cache_data = {
            "questions": questions,
            "subject": subject,
            "topic": topic,
            "timestamp": time.time(),
            "generated_at": datetime.now().isoformat()
        }
        
        # Cache with 7 days expiry (7 * 24 * 3600 seconds)
        self.questions_cache.set(cache_key, cache_data, expire=604800)
        
        # Also store in a topic-based index for easy retrieval
        topic_key = f"topic_{subject}_{topic}"
        existing_questions = self.questions_cache.get(topic_key, [])
        
        # Add new questions to the topic cache, avoiding duplicates
        for q in questions:
            if q not in existing_questions:
                existing_questions.append(q)
        
        # Keep only last 50 questions per topic to prevent unlimited growth
        if len(existing_questions) > 50:
            existing_questions = existing_questions[-50:]
        
        self.questions_cache.set(topic_key, existing_questions, expire=604800)
        logger.info(f"Cached {len(questions)} questions for {subject} - {topic}")

    def _get_cached_questions_as_examples(self, subject: str, topic: str, max_examples: int = 3) -> List[str]:
        """Get random cached questions to use as examples"""
        topic_key = f"topic_{subject}_{topic}"
        cached_questions = self.questions_cache.get(topic_key, [])
        
        if not cached_questions:
            return []
        
        # Select random questions as examples
        num_examples = min(len(cached_questions), max_examples)
        selected_questions = random.sample(cached_questions, num_examples)
        
        # Format as examples (just the question text)
        examples = []
        for i, q in enumerate(selected_questions, 1):
            question_text = q.get("question", str(q))
            examples.append(f"{i}. {question_text}")
        
        logger.info(f"Using {len(examples)} cached questions as examples for {subject} - {topic}")
        return examples

    def _get_all_cached_questions_for_examples(self, subject: str, max_examples: int = 5) -> List[str]:
        """Get random cached questions from any topic in the subject for whole paper examples"""
        all_questions = []
        
        # Collect questions from all topics in the subject
        for topic in self.topics_by_subject.get(subject, []):
            topic_key = f"topic_{subject}_{topic}"
            cached_questions = self.questions_cache.get(topic_key, [])
            all_questions.extend(cached_questions)
        
        if not all_questions:
            return []
        
        # Select random questions as examples
        num_examples = min(len(all_questions), max_examples)
        selected_questions = random.sample(all_questions, num_examples)
        
        # Format as examples
        examples = []
        for i, q in enumerate(selected_questions, 1):
            question_text = q.get("question", str(q))
            examples.append(f"{i}. {question_text}")
        
        logger.info(f"Using {len(examples)} cached questions as examples for whole paper generation")
        return examples

    def get_cache_stats(self) -> dict:
        """Get statistics about cached questions"""
        stats = {
            "total_cache_entries": len(list(self.questions_cache)),
            "subjects": {},
            "total_questions": 0
        }
        
        for subject in ["GS1", "GS2", "GS3", "GS4"]:
            subject_questions = 0
            topics_with_cache = 0
            
            for topic in self.topics_by_subject.get(subject, []):
                topic_key = f"topic_{subject}_{topic}"
                cached_questions = self.questions_cache.get(topic_key, [])
                if cached_questions:
                    subject_questions += len(cached_questions)
                    topics_with_cache += 1
            
            stats["subjects"][subject] = {
                "total_questions": subject_questions,
                "topics_with_cache": topics_with_cache
            }
            stats["total_questions"] += subject_questions
        
        return stats

    def clear_cache(self, subject: str = None, topic: str = None):
        """Clear cache - all, by subject, or by specific topic"""
        if topic and subject:
            # Clear specific topic
            topic_key = f"topic_{subject}_{topic}"
            if topic_key in self.questions_cache:
                del self.questions_cache[topic_key]
                logger.info(f"Cleared cache for {subject} - {topic}")
        elif subject:
            # Clear all topics in subject
            cleared_count = 0
            for topic in self.topics_by_subject.get(subject, []):
                topic_key = f"topic_{subject}_{topic}"
                if topic_key in self.questions_cache:
                    del self.questions_cache[topic_key]
                    cleared_count += 1
            logger.info(f"Cleared cache for {cleared_count} topics in {subject}")
        else:
            # Clear all cache
            self.questions_cache.clear()
            logger.info("Cleared all questions cache")

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
            }).execute()
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
        return ChatGroq(model=model_id, groq_api_key=self.groq_api_key, temperature=float(os.getenv("GROQ_TEMPERATURE", "0.7")))

    def _get_gemini_client(self, model_id: str):
        if not self.google_api_key or ChatGoogleGenerativeAI is None:
            return None
        return ChatGoogleGenerativeAI(model=model_id, google_api_key=self.google_api_key, temperature=float(os.getenv("GEMINI_TEMPERATURE", "0.7")))

    def _get_openrouter_client(self, model_id: str):
        key = os.getenv("OPENROUTER_API_KEY")
        if not key:
            return None
        def run(prompt: str):
            url = "https://openrouter.ai/api/v1/chat/completions"
            headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
            data = {
                "model": model_id,
                "messages": [
                    {"role": "system", "content": "You are a helpful UPSC assistant. Answer only in English."},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 800,
                "temperature": 0.7
            }
            resp = requests.post(url, headers=headers, json=data, timeout=30)
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
        return run

    def _get_llm_client(self, model_name: str):
        info = self.available_models.get(model_name)
        if not info:
            return None
        provider, model_id = info["provider"], info["model_id"]
        return {
            "groq": lambda: self._get_groq_client(model_id),
            "google": lambda: self._get_gemini_client(model_id),
            "openrouter": lambda: self._get_openrouter_client(model_id)
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
        # Case 4: Fallback → convert to string
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
        if cached and time.time() - cached["timestamp"] < 3600:
            return cached["news"]
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
    def safe_parse_questions(self, output: str, num: int = None) -> List[dict]:
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
            # Get database examples
            resp = self.supabase_client.table("documents").select("content").eq("metadata->>topic", topic).limit(5).execute()
            db_examples = [item["content"] for item in resp.data] if resp.data else []
            
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
            resp = self.supabase_client.table("documents").select("content").eq("metadata->>topic", topic).limit(3).execute()
            db_examples = [item["content"] for item in resp.data] if resp.data else []
            
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

    def _gather_topic_examples(self, selected_topics: List[str], subject: str) -> List[str]:
        topic_examples = []
        if not self.supabase_client:
            return ["Error: Supabase client not available."]
        
        for topic in selected_topics:
            try:
                resp = self.supabase_client.table("documents").select("content").eq("metadata->>topic", topic).limit(2).execute()
                if resp.data:
                    examples = [item["content"] for item in resp.data]
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

# Factory
def create_question_generator(groq_api_key, google_api_key, vectorstore, supabase_client):
    return QuestionGenerator(groq_api_key, google_api_key, vectorstore, supabase_client)