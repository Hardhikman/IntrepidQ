"""
Vector indexing functionality - refactored from indexing.py
"""
import os
import json
from typing import List, Dict, Optional
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document


class VectorIndexer:
    def __init__(self, embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.embedding_model = embedding_model
        self.embeddings = HuggingFaceEmbeddings(model_name=embedding_model)
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50,
            length_function=len,
        )
        
    def load_documents_from_organized_chunks(self, organized_chunks_path: str) -> List[Document]:
        """Load documents from organized chunks JSON"""
        if not os.path.exists(organized_chunks_path):
            raise FileNotFoundError(f"Organized chunks file not found: {organized_chunks_path}")
        
        print("Loading from organized chunks...")
        with open(organized_chunks_path, "r", encoding="utf-8") as f:
            organized_data = json.load(f)
        
        documents = []
        for gs_paper_data in organized_data:
            gs_paper = gs_paper_data["gs_paper"]
            for topic_data in gs_paper_data["topics"]:
                topic = topic_data["topic"]
                questions = topic_data["questions"]
                
                for question in questions:
                    doc = Document(
                        page_content=question,
                        metadata={
                            "topic": topic,
                            "gs_paper": gs_paper,
                            "source": "UPSC_PYQ"
                        }
                    )
                    documents.append(doc)
        
        return documents
    
    def load_documents_from_flat_chunks(self, flat_chunks_path: str) -> List[Document]:
        """Load documents from flat chunks JSON (fallback)"""
        print("Loading from flat chunks (fallback)...")
        with open(flat_chunks_path, "r", encoding="utf-8") as f:
            chunks = json.load(f)
        
        documents = []
        for chunk in chunks:
            topic = chunk["topic"]
            questions = chunk["questions"]
            
            # Determine GS paper from topic name
            gs_paper = "GS1"  # default
            for gs_num in ["GS1", "GS2", "GS3", "GS4"]:
                if topic.startswith(gs_num):
                    gs_paper = gs_num
                    break
            
            for question in questions:
                doc = Document(
                    page_content=question,
                    metadata={
                        "topic": topic,
                        "gs_paper": gs_paper,
                        "source": "UPSC_PYQ"
                    }
                )
                documents.append(doc)
        
        return documents
    
    def load_documents(self, data_dir: str = "data") -> List[Document]:
        """Load documents from available chunk files"""
        organized_chunks_path = os.path.join(data_dir, "chunks_organized.json")
        flat_chunks_path = os.path.join(data_dir, "chunks.json")
        
        if os.path.exists(organized_chunks_path):
            return self.load_documents_from_organized_chunks(organized_chunks_path)
        elif os.path.exists(flat_chunks_path):
            return self.load_documents_from_flat_chunks(flat_chunks_path)
        else:
            raise FileNotFoundError("No chunks file found. Please run PDF parsing first.")
    
    def split_documents(self, documents: List[Document]) -> List[Document]:
        """Split long documents into smaller chunks"""
        split_docs = []
        for doc in documents:
            if len(doc.page_content) > 500:
                splits = self.text_splitter.split_documents([doc])
                split_docs.extend(splits)
            else:
                split_docs.append(doc)
        return split_docs
    
    def create_faiss_index(self, documents: List[Document], persist_dir: str) -> FAISS:
        """Create FAISS index from documents"""
        print(f"Creating FAISS index with {len(documents)} documents")
        
        # Split documents if needed
        split_docs = self.split_documents(documents)
        print(f"After splitting: {len(split_docs)} document chunks")
        
        # Create FAISS index
        vectorstore = FAISS.from_documents(split_docs, self.embeddings)
        
        # Save the index
        os.makedirs(persist_dir, exist_ok=True)
        vectorstore.save_local(persist_dir)
        print(f"FAISS index saved to {persist_dir}")
        
        # Print statistics
        self._print_statistics(split_docs)
        
        return vectorstore
    
    def load_faiss_index(self, persist_dir: str) -> FAISS:
        """Load existing FAISS index"""
        if not os.path.exists(os.path.join(persist_dir, "index.faiss")):
            raise FileNotFoundError(f"FAISS index not found in {persist_dir}")
        
        vectorstore = FAISS.load_local(
            persist_dir,
            embeddings=self.embeddings,
            allow_dangerous_deserialization=True
        )
        print(f"FAISS index loaded from {persist_dir}")
        return vectorstore
    
    def _print_statistics(self, documents: List[Document]):
        """Print document statistics by GS paper"""
        gs_stats = {}
        for doc in documents:
            gs_paper = doc.metadata.get("gs_paper", "Unknown")
            gs_stats[gs_paper] = gs_stats.get(gs_paper, 0) + 1
        
        print("\nDocument distribution by GS paper:")
        for gs_paper, count in sorted(gs_stats.items()):
            print(f"  {gs_paper}: {count} documents")


# Factory functions
def create_vector_indexer(embedding_model: str = None) -> VectorIndexer:
    """Factory function to create vector indexer"""
    model = embedding_model or os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    return VectorIndexer(model)

def create_index(data_dir: str = "data", persist_dir: str = None) -> FAISS:
    """Create FAISS index from data directory"""
    persist_dir = persist_dir or os.getenv("FAISS_DIR", os.path.join(data_dir, "faiss_db"))
    
    indexer = create_vector_indexer()
    documents = indexer.load_documents(data_dir)
    return indexer.create_faiss_index(documents, persist_dir)

def load_index(persist_dir: str = None) -> FAISS:
    """Load existing FAISS index"""
    persist_dir = persist_dir or os.getenv("FAISS_DIR", "faiss_db")
    
    indexer = create_vector_indexer()
    return indexer.load_faiss_index(persist_dir)