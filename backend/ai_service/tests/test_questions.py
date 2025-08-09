import sys
from fastapi.testclient import TestClient
import pytest

# Add the project root to the Python path
sys.path.insert(0, ".")

from api.main import app

client = TestClient(app)

def test_generate_questions_no_ai_service():
    """
    Test that the /generate_questions endpoint returns a 503 error
    when the AI service is not available.
    """
    response = client.post("/generate_questions", json={"topic": "test", "num": 1})
    assert response.status_code == 503
    assert response.json() == {"detail": "AI service not initialized"}

def test_generate_whole_paper_no_ai_service():
    """
    Test that the /generate_whole_paper endpoint returns a 503 error
    when the AI service is not available.
    """
    response = client.post("/generate_whole_paper", json={"subject": "GS1"})
    assert response.status_code == 503
    assert response.json() == {"detail": "AI service not initialized"}
