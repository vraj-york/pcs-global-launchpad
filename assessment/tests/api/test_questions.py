"""
Integration tests for Questions API endpoints
"""
import pytest
from uuid import uuid4


def four_options_for_question_order(_question_order: int) -> list:
    return [
        {"color": "red", "option_text": "Sample red option text for testing purposes", "display_order": 1},
        {"color": "green", "option_text": "Sample green option text for testing purposes", "display_order": 2},
        {"color": "blue", "option_text": "Sample blue option text for testing purposes", "display_order": 3},
        {"color": "grey", "option_text": "Sample grey option text for testing purposes", "display_order": 4},
    ]


class TestQuestionsAPI:
    """Test suite for Questions CRUD operations"""

    def test_health_endpoint(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert "environment" in data

    def test_root_endpoint(self, client):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "service" in data
        assert "version" in data
        assert "endpoints" in data
        assert "questions" in data["endpoints"]

    def test_create_question_success(self, client, sample_question_data):
        """Test creating a question successfully"""
        response = client.post("/questions", json=sample_question_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["question_text"] == sample_question_data["question_text"]
        assert data["type"] == sample_question_data["type"]
        assert data["situation"] == sample_question_data["situation"]
        assert data["life_context"] == sample_question_data["life_context"]
        assert data["question_order"] == sample_question_data["question_order"]
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data
        assert "options" in data
        assert len(data["options"]) == 4
        colors = {o["color"] for o in data["options"]}
        assert colors == {"red", "green", "blue", "grey"}

    def test_create_question_invalid_data(self, client, sample_question_data):
        """Test creating a question with invalid data"""
        invalid_data = {
            **sample_question_data,
            "question_text": "Too short",  # Less than 10 chars
            "type": "invalid_type",
        }
        response = client.post("/questions", json=invalid_data)
        assert response.status_code == 422  # Validation error

    def test_create_question_missing_required_fields(self, client):
        """Test creating a question with missing required fields"""
        incomplete_data = {
            "question_text": "This is a valid question text"
        }
        response = client.post("/questions", json=incomplete_data)
        assert response.status_code == 422

    def test_get_questions_empty(self, client):
        """Test getting questions when database is empty"""
        response = client.get("/questions")
        assert response.status_code == 200
        assert response.json() == []

    def test_get_questions_with_data(self, client, create_question):
        """Test getting all questions"""
        # Create multiple questions
        create_question(question_order=1, question_text="First question here")
        create_question(question_order=2, question_text="Second question here")
        create_question(question_order=3, question_text="Third question here")
        
        response = client.get("/questions")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        assert all("id" in q for q in data)
        assert all(len(q.get("options", [])) == 4 for q in data)

    def test_get_questions_with_filters(self, client, create_question):
        """Test filtering questions by type and situation"""
        # Create questions with different types and situations
        create_question(
            type="environmental_preferences",
            situation="typical",
            question_text="Environmental typical question"
        )
        create_question(
            type="interaction_preferences",
            situation="stressful",
            question_text="Interaction stressful question"
        )
        
        # Filter by type
        response = client.get("/questions?type=environmental_preferences")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["type"] == "environmental_preferences"
        
        # Filter by situation
        response = client.get("/questions?situation=stressful")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["situation"] == "stressful"

    def test_get_questions_pagination(self, client, create_question):
        """Test pagination of questions"""
        # Create 10 questions
        for i in range(1, 11):
            create_question(
                question_order=i,
                question_text=f"Question number {i} for testing"
            )
        
        # Get first 5
        response = client.get("/questions?skip=0&limit=5")
        assert response.status_code == 200
        assert len(response.json()) == 5
        
        # Get next 5
        response = client.get("/questions?skip=5&limit=5")
        assert response.status_code == 200
        assert len(response.json()) == 5

    def test_get_question_by_id(self, client, create_question):
        """Test getting a specific question by ID"""
        question = create_question()
        question_id = question["id"]
        
        response = client.get(f"/questions/{question_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == question_id
        assert data["question_text"] == question["question_text"]

    def test_get_question_not_found(self, client):
        """Test getting a non-existent question"""
        fake_id = str(uuid4())
        response = client.get(f"/questions/{fake_id}")
        assert response.status_code == 404

    def test_get_question_with_options(self, client, create_question):
        """Test getting a question with its options"""
        question = create_question()
        question_id = question["id"]

        response = client.get(f"/questions/{question_id}/with-options")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == question_id
        assert "options" in data
        assert len(data["options"]) == 4
        assert all("color" in opt for opt in data["options"])

    def test_update_question(self, client, create_question):
        """Test updating a question"""
        question = create_question()
        question_id = question["id"]
        
        update_data = {
            "question_text": "Updated question text for testing purposes here",
            "is_active": False
        }
        
        response = client.put(f"/questions/{question_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["question_text"] == update_data["question_text"]
        assert data["is_active"] is False
        assert data["type"] == question["type"]  # Unchanged fields remain
        assert len(data["options"]) == 4

    def test_update_question_with_options(self, client, create_question):
        """PUT with four options replaces all option rows (matched by color)"""
        question = create_question(question_order=7)
        qid = question["id"]
        new_opts = four_options_for_question_order(7)
        for o in new_opts:
            o["option_text"] = f"Updated {o['color']} text for testing purposes"
        response = client.put(
            f"/questions/{qid}",
            json={"options": new_opts},
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["options"]) == 4
        by_color = {o["color"]: o for o in data["options"]}
        assert "Updated red text" in by_color["red"]["option_text"]

    def test_update_question_not_found(self, client):
        """Test updating a non-existent question"""
        fake_id = str(uuid4())
        update_data = {"question_text": "Updated text for nonexistent question here"}
        response = client.put(f"/questions/{fake_id}", json=update_data)
        assert response.status_code == 404

    def test_update_question_invalid_data(self, client, create_question):
        """Test updating question with invalid data"""
        question = create_question()
        question_id = question["id"]
        
        invalid_data = {
            "question_text": "short",  # Too short
        }
        response = client.put(f"/questions/{question_id}", json=invalid_data)
        assert response.status_code == 422

    def test_delete_question(self, client, create_question):
        """Test deleting a question"""
        question = create_question()
        question_id = question["id"]
        
        response = client.delete(f"/questions/{question_id}")
        assert response.status_code == 204
        
        # Verify it's deleted
        response = client.get(f"/questions/{question_id}")
        assert response.status_code == 404

    def test_delete_question_not_found(self, client):
        """Test deleting a non-existent question"""
        fake_id = str(uuid4())
        response = client.delete(f"/questions/{fake_id}")
        assert response.status_code == 404

    def test_get_question_count(self, client, create_question):
        """Test getting question count"""
        # Initially zero
        response = client.get("/questions/stats/count")
        assert response.status_code == 200
        assert response.json()["count"] == 0
        
        # Create some questions
        create_question(type="environmental_preferences", question_text="Env pref question one")
        create_question(type="environmental_preferences", question_text="Env pref question two")
        create_question(type="interaction_preferences", question_text="Inter pref question")
        
        # Total count
        response = client.get("/questions/stats/count")
        assert response.status_code == 200
        assert response.json()["count"] == 3
        
        # Count by type
        response = client.get("/questions/stats/count?type=environmental_preferences")
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 2
        assert data["type"] == "environmental_preferences"

    def test_question_order_validation(self, client, sample_question_data):
        """Test question_order must be between 1 and 60"""
        # Invalid: 0
        invalid_data = {
            **sample_question_data,
            "question_order": 0,
            "options": four_options_for_question_order(1),
        }
        response = client.post("/questions", json=invalid_data)
        assert response.status_code == 422

        # Invalid: 61
        invalid_data = {
            **sample_question_data,
            "question_order": 61,
            "options": four_options_for_question_order(61),
        }
        response = client.post("/questions", json=invalid_data)
        assert response.status_code == 422

        # Valid: 1
        valid_data = {**sample_question_data, "question_order": 1, "options": four_options_for_question_order(1)}
        response = client.post("/questions", json=valid_data)
        assert response.status_code == 201

        # Valid: 60
        valid_data = {**sample_question_data, "question_order": 60, "options": four_options_for_question_order(60)}
        response = client.post("/questions", json=valid_data)
        assert response.status_code == 201

    def test_create_question_requires_four_options(self, client, sample_question_data):
        """Fewer than four options is rejected"""
        payload = {**sample_question_data, "options": sample_question_data["options"][:3]}
        assert client.post("/questions", json=payload).status_code == 422

    def test_create_question_duplicate_color(self, client, sample_question_data):
        """Duplicate colors across options rejected"""
        opts = four_options_for_question_order(99)
        opts[1]["color"] = "red"
        payload = {**sample_question_data, "question_order": 99, "options": opts}
        assert client.post("/questions", json=payload).status_code == 422

    def test_create_question_invalid_display_orders(self, client, sample_question_data):
        """display_order must be 1–4 each once"""
        opts = four_options_for_question_order(98)
        opts[0]["display_order"] = 2
        opts[1]["display_order"] = 2
        payload = {**sample_question_data, "question_order": 98, "options": opts}
        assert client.post("/questions", json=payload).status_code == 422

    def test_update_question_wrong_option_count(self, client, create_question):
        """PUT with options must send exactly four"""
        q = create_question()
        response = client.put(
            f"/questions/{q['id']}",
            json={"options": four_options_for_question_order(1)[:2]},
        )
        assert response.status_code == 422
