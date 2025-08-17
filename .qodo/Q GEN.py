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
"""

import os
import time
import random
import re
import json
import requests
import logging
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

try:
    from together import Together
except ImportError:
    Together = None

logger = logging.getLogger(__name__)


class QuestionGenerator:
    def __init__(
        self,
        groq_api_key: str,
        google_api_key: Optional[str],
        together_api_key: Optional[str],
        vectorstore: Optional[SupabaseVectorStore],
        supabase_client: Optional[Client],
        cache_dir: str = "news_cache"
    ):
        self.groq_api_key = groq_api_key
        self.google_api_key = google_api_key
        self.together_api_key = together_api_key
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
            "llama3-70b": {"provider": "groq", "model_id": "llama3-70b-8192"},
            "llama3-8b": {"provider": "groq", "model_id": "llama3-8b-8192"},
            "gemma2-9b": {"provider": "groq", "model_id": "gemma2-9b-it"},
            "deepseek-r1-70b": {"provider": "together", "model_id": "deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free"},
            "gemini-1.5-flash": {"provider": "google", "model_id": "gemini-1.5-flash-latest"},
            "deepseek-v3": {"provider": "openrouter", "model_id": "deepseek/deepseek-chat-v3-0324:free"},
            "moonshot-k2": {"provider": "openrouter", "model_id": "moonshotai/kimi-k2:free"},
        }

        self.together = Together(api_key=self.together_api_key) if (self.together_api_key and Together) else None
        self.priority_order = ["deepseek-r1-70b", "deepseek-v3", "llama3-70b", "gemini-1.5-flash"]

        self.model_speeds: Dict[str, List[float]] = {}
        self.min_attempts_for_avg = 3
        self._load_model_performance()

    # ---------------- Supabase Model Speed Persistence ----------------
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

    # ---------------- Model Selection ----------------
    def select_model(self, requested_model: Optional[str] = None) -> List[str]:
        if requested_model and requested_model in self.available_models:
            ordered = [requested_model] + [m for m in self.priority_order if m != requested_model]
        else:
            ordered = self.priority_order

        if any(len(times) >= self.min_attempts_for_avg for times in self.model_speeds.values()):
            ordered = sorted(
                [m for m in ordered if m in self.available_models],
                key=lambda m: sum(self.model_speeds.get(m, [float("inf")]))
                / len(self.model_speeds.get(m, [float("inf")]))
            )
            logger.info(f"Adaptive priority order: {ordered}")
        else:
            ordered = [m for m in ordered if m in self.available_models]
        return ordered

    # ---------------- Provider Clients ----------------
    def _get_groq_client(self, model_id: str) -> ChatGroq:
        return ChatGroq(model=model_id, groq_api_key=self.groq_api_key, temperature=float(os.getenv("GROQ_TEMPERATURE", "0.7")))

    def _get_gemini_client(self, model_id: str):
        if not self.google_api_key or ChatGoogleGenerativeAI is None:
            return None
        return ChatGoogleGenerativeAI(model=model_id, google_api_key=self.google_api_key, temperature=float(os.getenv("GEMINI_TEMPERATURE", "0.7")))

    def _get_together_client(self, model_id: str):
        if not self.together:
            return None
        return lambda prompt: self.together.chat.completions.create(
            model=model_id, messages=[{"role": "user", "content": prompt}],
            max_tokens=800, temperature=0.7
        ).choices[0].message.content

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
            "together": lambda: self._get_together_client(model_id),
            "openrouter": lambda: self._get_openrouter_client(model_id)
        }.get(provider, lambda: None)()

    # ---------------- Retry with Stats ----------------
    def _try_models(self, models: List[str], prompt: str) -> dict:
        for model_name in models:
            logger.info(f"Attempting model: {model_name}")
            llm = self._get_llm_client(model_name)
            if not llm:
                continue
            start = time.time()
            try:
                result = self._use_llm(llm, prompt)
                elapsed = round(time.time() - start, 2)
                self._log_model_speed(model_name, elapsed, success=True)
                avg_speed = sum(self.model_speeds[model_name]) / len(self.model_speeds[model_name])
                return {"output": result, "duration": elapsed, "avg_speed": round(avg_speed, 2),
                        "runs": len(self.model_speeds[model_name])}
            except Exception as e:
                elapsed = round(time.time() - start, 2)
                self._log_model_speed(model_name, elapsed, success=False)
                logger.warning(f"Model {model_name} failed in {elapsed:.2f}s - {e}")
                continue
        return {"output": "Error: All model attempts failed.", "duration": None, "avg_speed": None, "runs": 0}

    def _use_llm(self, llm, prompt: str) -> str:
        return llm(prompt).strip() if callable(llm) else llm.invoke(prompt).content.strip()

    # ---------------- Prompts ----------------
    def _setup_templates(self):
    # Topic questions template
        self.gs_prompt = PromptTemplate.from_template(
        """You are a UPSC Mains question paper designer for {subject}.
Generate {num} original UPSC-style Mains questions for the topic "{topic}".

Reference examples (for style only):
{examples}

IMPORTANT INSTRUCTIONS:
- Output ONLY in English
- Output MUST be a valid JSON array of strings
- Each item must be one complete numbered UPSC-style question
- No explanations, no reasoning, no commentary
- No <think> or meta text
- Exactly {num} items

Now generate only the JSON array:"""
    )

    # Whole paper template
        self.whole_paper_prompt = PromptTemplate.from_template(
        """You are a UPSC Mains paper designer for {subject}.
Generate a complete UPSC Mains paper with exactly 10 analytical questions across multiple topics.

Reference examples:
{topic_examples}

IMPORTANT INSTRUCTIONS:
- Output ONLY in English
- Output MUST be a valid JSON array of 10 strings
- Each string must be a complete numbered UPSC-style question
- No explanations, no reasoning, no commentary
- No <think> or meta text
- Exactly 10 items

Now generate only the JSON array:"""
    )

    # ---------------- Data Utils ----------------
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

    # ---------------- Safe Question Parsing ----------------
    def safe_parse_questions(self, output: str, num: int = None) -> List[str]:
        try:
            parsed = json.loads(output)
            if isinstance(parsed, list) and all(isinstance(q, str) for q in parsed):
                return parsed[:num] if num else parsed
        except Exception:
            pass
        match = re.search(r"\[.*\]", output, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(0))
                if isinstance(parsed, list) and all(isinstance(q, str) for q in parsed):
                    return parsed[:num] if num else parsed
            except Exception:
                pass
        questions = self.format_questions(output)
        if questions:
            return questions[:num] if num else questions
        fallback = [p.strip() for p in output.split("\n\n") if len(p.strip()) > 10]
        if fallback:
            return [f"{i+1}. {txt}" for i, txt in enumerate(fallback[:num] if num else fallback)]
        return ["1. ⚠️ Could not parse valid questions. Please retry."]

    # ---------------- Generation ----------------
    def generate_topic_questions(self, subject, topic, num, use_ca, months, requested_model):
        models_to_try = self.select_model(requested_model)
        if use_ca:
            return self._generate_current_affairs_questions(subject, topic, num, months, models_to_try)
        return self._generate_static_questions(subject, topic, num, models_to_try)

    def _generate_static_questions(self, subject, topic, num, models_to_try: List[str]):
        resp = self.supabase_client.table("documents").select("content").eq("metadata->>topic", topic).limit(8).execute()
        examples = [item["content"] for item in resp.data] if resp.data else []
        prompt = self.gs_prompt.format(subject=subject, topic=topic, examples="\n".join(examples), num=num)
        result = self._try_models(models_to_try, prompt)
        return {"questions": self.safe_parse_questions(result["output"], num),
                "meta": {k: result[k] for k in ("duration", "avg_speed", "runs")}}

    def _generate_current_affairs_questions(self, subject, topic, num, months, models_to_try: List[str]):
        news = self.fetch_recent_news(topic, months)
        prompt = f"{self.gs_prompt.format(subject=subject, topic=topic, examples='', num=num)}\n\nRecent News:\n{news}"
        result = self._try_models(models_to_try, prompt)
        return {"questions": self.safe_parse_questions(result["output"], num),
                "meta": {k: result[k] for k in ("duration", "avg_speed", "runs")}}

    def generate_whole_paper(self, subject: str, use_ca: bool, months: int, requested_model: str):
        models_to_try = self.select_model(requested_model)
        subject_topics = self.topics_by_subject.get(subject, [])
        if not subject_topics:
            return {"questions": ["[WARNING] No topics found."], "meta": {"duration": None, "avg_speed": None, "runs": 0}}
        num_topics = min(len(subject_topics), 6)
        selected_topics = random.sample(subject_topics, num_topics)
        topic_examples = self._gather_topic_examples(selected_topics, subject)
        topic_examples_text = "\n".join(topic_examples)
        if use_ca:
            prompt = self._get_ca_paper_prompt(subject, selected_topics, topic_examples_text, months)
        else:
            prompt = self.whole_paper_prompt.format(subject=subject, topic_examples=topic_examples_text)
        result = self._try_models(models_to_try, prompt)
        return {"questions": self.safe_parse_questions(result["output"], 10),
                "meta": {k: result[k] for k in ("duration", "avg_speed", "runs")}}

    def _gather_topic_examples(self, selected_topics: List[str], subject: str) -> List[str]:
        topic_examples = []
        if not self.supabase_client:
            return ["Error: Supabase client not available."]
        for topic in selected_topics:
            try:
                resp = self.supabase_client.table("documents").select("content").eq("metadata->>topic", topic).limit(3).execute()
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

    def _get_ca_paper_prompt(self, subject: str, selected_topics: List[str], topic_examples_text: str, months: int) -> str:
        news_contexts = []
        for topic in selected_topics[:3]:
            news = self.fetch_recent_news(topic, months)
            if news and "not configured" not in news:
                news_contexts.append(f"Recent news for {topic}:\n{news[:200]}...")
        news_text = "\n\n".join(news_contexts) if news_contexts else ""

        return f"""You are a UPSC Mains paper designer for {subject}.
Generate a UPSC Mains question paper with exactly 10 analytical questions, incorporating current affairs where appropriate.

Topics and Example Questions:
{topic_examples_text}

Recent News Context:
{news_text}

IMPORTANT INSTRUCTIONS:
- Output ONLY in English
- Output MUST be a valid JSON array of 10 strings
- Each string should be one analytical UPSC-style question, numbered
- No explanations, no reasoning, no commentary
- No <think> or thought process text
- Exactly 10 questions

Now generate only the JSON array:"""


    def format_questions(self, raw: str) -> List[str]:
        """
        Regex/heuristic cleaner used as fallback when JSON parsing fails.
        Removes reasoning text, keeps proper UPSC-style questions.
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
def create_question_generator(groq_api_key, google_api_key, together_api_key, vectorstore, supabase_client):
    return QuestionGenerator(groq_api_key, google_api_key, together_api_key, vectorstore, supabase_client)