# backend/ai_service/run_indexing.py
from dotenv import load_dotenv

from core.vector_indexer import create_index

# Load environment variables from .env file
load_dotenv()

def main():
    """
    This script runs the indexing process to populate the Supabase vector store.
    It loads the documents from the JSON files in the 'data' directory,
    creates embeddings, and uploads them to your Supabase table.
    """
    print("Starting the indexing process...")
    try:
        # This function handles loading documents and creating the index in Supabase
        create_index()
        print("Indexing process completed successfully.")
        print("Your Supabase vector store is now ready to be used.")
    except Exception as e:
        print(f"An error occurred during indexing: {e}")

if __name__ == "__main__":
    main()
