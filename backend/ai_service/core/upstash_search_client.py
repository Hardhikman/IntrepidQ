import os
import logging
import re
import json
from typing import List, Dict, Optional, Any

try:
    from upstash_search import Search
    UPSTASH_AVAILABLE = True
except ImportError:
    UPSTASH_AVAILABLE = False
    Search = None

logger = logging.getLogger(__name__)

class UpstashSearchClient:
    def __init__(self):
        self.client = None
        self.index = None
        self.index_name = os.getenv("UPSTASH_SEARCH_INDEX", "keywords_index")
        
        if UPSTASH_AVAILABLE:
            self._initialize_client()
    
    def _initialize_client(self):
        """Initialize the Upstash Search client"""
        try:
            upstash_url = os.getenv("UPSTASH_SEARCH_REST_URL")
            upstash_token = os.getenv("UPSTASH_SEARCH_REST_TOKEN")
            
            if not upstash_url or not upstash_token:
                logger.warning("Upstash credentials not found in environment variables")
                return
            
            if Search is not None:
                self.client = Search(
                    url=upstash_url,
                    token=upstash_token
                )
            
                self.index = self.client.index(self.index_name)
                logger.info(f"Upstash Search client initialized with index: {self.index_name}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Upstash Search client: {e}")
            self.client = None
            self.index = None

    def _sanitize_topic_for_id(self, topic: str) -> str:
        """Sanitizes a topic string to be used as a document ID."""
        # Replace sequences of non-alphanumeric characters with a single underscore
        sanitized_topic = re.sub(r'[^a-zA-Z0-9]+', '_', topic)
        # Remove leading/trailing underscores that might result from the replacement
        sanitized_topic = sanitized_topic.strip('_')
        return f"topic_{sanitized_topic.lower()}"

    def search_keywords_by_topic(self, topic: str) -> List[str]:
        """
        Search for keywords associated with a specific topic
        
        Args:
            topic (str): The topic to search keywords for
            
        Returns:
            List[str]: List of keywords associated with the topic
        """
        if not self.index:
            logger.warning("Upstash Search client not initialized")
            return []
        
        try:
            # A more robust way to create a valid ID from the topic string
            topic_id = self._sanitize_topic_for_id(topic)
            
            try:
                # Try to fetch the exact document first for efficiency
                documents_response = self.index.fetch(ids=[topic_id])
                
                if documents_response and documents_response[0]:
                    doc = documents_response[0]
                    if doc and hasattr(doc, 'content') and isinstance(doc.content, dict):
                        content = doc.content
                        # Verify the topic matches exactly before returning
                        if content.get('topic') == topic:
                            keywords = content.get('keywords', [])
                            if isinstance(keywords, list):
                                seen = set()
                                unique_keywords = [k for k in keywords if not (k in seen or seen.add(k))]
                                logger.info(f"Found {len(unique_keywords)} keywords for topic '{topic}' (exact fetch)")
                                return unique_keywords
                
            except Exception as e:
                logger.warning(f"Error fetching exact document by ID '{topic_id}': {e}. Falling back to search.")
            
            # If exact fetch didn't work, fall back to a more resilient search
            logger.info(f"Falling back to search for topic '{topic}'")
            search_results = self.index.search(
                query=topic,
                limit=5 
            )
            
            all_keywords = []
            # Lower the score threshold to be more lenient with long, complex topics
            for result in search_results:
                if result and hasattr(result, 'score') and result.score > 0.75 and hasattr(result, 'content') and isinstance(result.content, dict):
                    content = result.content
                    retrieved_topic = content.get('topic')

                    if retrieved_topic:
                        # Instead of a strict string comparison, compare the sanitized IDs.
                        # This is robust against minor differences in punctuation or spacing.
                        retrieved_topic_id = self._sanitize_topic_for_id(retrieved_topic)
                        if retrieved_topic_id == topic_id:
                            keywords = content.get('keywords', [])
                            if isinstance(keywords, list):
                                all_keywords.extend(keywords)
                            # Since we found a match based on the ID, we can be confident and stop searching.
                            break 

            if all_keywords:
                # Remove duplicates while preserving order
                seen = set()
                unique_keywords = [k for k in all_keywords if not (k in seen or seen.add(k))]
                logger.info(f"Found {len(unique_keywords)} keywords for topic '{topic}' (search fallback)")
                return unique_keywords
            
            logger.info(f"No documents found for topic '{topic}' after fetch and search.")
            return []
            
        except Exception as e:
            logger.error(f"An unexpected error occurred while searching for topic '{topic}': {e}")
            return []

    def get_all_topics(self) -> List[str]:
        """
        Get all available topics from the Upstash index.
        Note: This is a placeholder as Upstash Search doesn't directly support listing all documents.
        """
        if not self.index:
            logger.warning("Upstash Search client not initialized")
            return []
        
        logger.info("Fetching all topics is not directly supported and is not implemented.")
        return []