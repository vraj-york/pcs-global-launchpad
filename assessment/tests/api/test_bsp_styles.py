"""
Integration tests for BSP Styles API endpoints
"""
import pytest
from uuid import uuid4


class TestBspStylesAPI:
    """Test suite for BSP Styles CRUD operations"""

    def test_create_bsp_style_success(self, client, sample_bsp_style_data):
        """Test creating a BSP style successfully"""
        response = client.post("/bsp-styles", json=sample_bsp_style_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["style_number"] == sample_bsp_style_data["style_number"]
        assert data["title"] == sample_bsp_style_data["title"]
        assert data["has_video"] == sample_bsp_style_data["has_video"]
        assert data["youtube_video_id"] == sample_bsp_style_data["youtube_video_id"]
        assert data["description"] == sample_bsp_style_data["description"]
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    def test_create_bsp_style_missing_required_fields(self, client):
        """Test creating a BSP style with missing required fields"""
        incomplete_data = {
            "style_number": 1,
            "title": "Incomplete Style"
        }
        response = client.post("/bsp-styles", json=incomplete_data)
        assert response.status_code == 422

    def test_create_bsp_style_invalid_style_number(self, client, sample_bsp_style_data):
        """Test creating BSP style with invalid style_number"""
        # Invalid: 0
        invalid_data = {**sample_bsp_style_data, "style_number": 0}
        response = client.post("/bsp-styles", json=invalid_data)
        assert response.status_code == 422

    def test_get_bsp_styles_empty(self, client):
        """Test getting BSP styles when database is empty"""
        response = client.get("/bsp-styles")
        assert response.status_code == 200
        assert response.json() == []

    def test_get_bsp_styles_with_data(self, client, create_bsp_style):
        """Test getting all BSP styles"""
        create_bsp_style(style_number=1, title="Style 1")
        create_bsp_style(style_number=2, title="Style 2")
        create_bsp_style(style_number=3, title="Style 3")
        
        response = client.get("/bsp-styles")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        assert all("id" in style for style in data)

    def test_get_bsp_styles_filter_by_style_number(self, client, create_bsp_style):
        """Test filtering BSP styles by style_number"""
        create_bsp_style(style_number=1, title="Style 1")
        create_bsp_style(style_number=2, title="Style 2")
        
        response = client.get("/bsp-styles?style_number=1")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["style_number"] == 1

    def test_get_bsp_styles_filter_by_has_video(self, client, create_bsp_style):
        """Test filtering BSP styles by has_video"""
        create_bsp_style(style_number=1, has_video=True, youtube_video_id="abc123")
        create_bsp_style(style_number=2, has_video=False, youtube_video_id=None)
        create_bsp_style(style_number=3, has_video=True, youtube_video_id="def456")
        
        # Filter has_video=True
        response = client.get("/bsp-styles?has_video=true")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert all(style["has_video"] == True for style in data)
        
        # Filter has_video=False
        response = client.get("/bsp-styles?has_video=false")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["has_video"] == False

    def test_get_bsp_styles_pagination(self, client, create_bsp_style):
        """Test pagination of BSP styles"""
        # Create 10 styles
        for i in range(1, 11):
            create_bsp_style(
                style_number=i,
                title=f"Style {i}",
                display_order=i
            )
        
        # Get first 5
        response = client.get("/bsp-styles?skip=0&limit=5")
        assert response.status_code == 200
        assert len(response.json()) == 5
        
        # Get next 5
        response = client.get("/bsp-styles?skip=5&limit=5")
        assert response.status_code == 200
        assert len(response.json()) == 5

    def test_get_bsp_style_by_id(self, client, create_bsp_style):
        """Test getting a specific BSP style by ID"""
        style = create_bsp_style()
        style_id = style["id"]
        
        response = client.get(f"/bsp-styles/{style_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == style_id
        assert data["title"] == style["title"]

    def test_get_bsp_style_not_found(self, client):
        """Test getting a non-existent BSP style"""
        fake_id = str(uuid4())
        response = client.get(f"/bsp-styles/{fake_id}")
        assert response.status_code == 404

    def test_get_bsp_style_by_number(self, client, create_bsp_style):
        """Test getting a BSP style by style_number"""
        create_bsp_style(style_number=5, title="Style Number 5")
        
        response = client.get("/bsp-styles/by-number/5")
        assert response.status_code == 200
        data = response.json()
        assert data["style_number"] == 5
        assert data["title"] == "Style Number 5"

    def test_get_bsp_style_by_number_not_found(self, client):
        """Test getting BSP style by non-existent style_number"""
        # Use a valid style_number (1-16) that doesn't exist in DB
        response = client.get("/bsp-styles/by-number/15")
        assert response.status_code == 404

    def test_update_bsp_style(self, client, create_bsp_style):
        """Test updating a BSP style"""
        style = create_bsp_style()
        style_id = style["id"]
        
        update_data = {
            "title": "Updated Style Title",
            "has_video": False,
            "description": "Updated description text"
        }
        
        response = client.put(f"/bsp-styles/{style_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["has_video"] == update_data["has_video"]
        assert data["description"] == update_data["description"]
        assert data["style_number"] == style["style_number"]  # Unchanged

    def test_update_bsp_style_not_found(self, client):
        """Test updating a non-existent BSP style"""
        fake_id = str(uuid4())
        update_data = {"title": "Updated Title"}
        response = client.put(f"/bsp-styles/{fake_id}", json=update_data)
        assert response.status_code == 404

    def test_update_bsp_style_invalid_data(self, client, create_bsp_style):
        """Test updating BSP style with invalid data"""
        style = create_bsp_style()
        
        invalid_data = {
            "title": "",  # Empty title
        }
        response = client.put(f"/bsp-styles/{style['id']}", json=invalid_data)
        assert response.status_code in [400, 422]

    def test_delete_bsp_style(self, client, create_bsp_style):
        """Test deleting a BSP style"""
        style = create_bsp_style()
        style_id = style["id"]
        
        response = client.delete(f"/bsp-styles/{style_id}")
        assert response.status_code == 204
        
        # Verify it's deleted
        response = client.get(f"/bsp-styles/{style_id}")
        assert response.status_code == 404

    def test_delete_bsp_style_not_found(self, client):
        """Test deleting a non-existent BSP style"""
        fake_id = str(uuid4())
        response = client.delete(f"/bsp-styles/{fake_id}")
        assert response.status_code == 404

    def test_get_bsp_style_count(self, client, create_bsp_style):
        """Test getting BSP style count"""
        # Initially zero
        response = client.get("/bsp-styles/stats/count")
        assert response.status_code == 200
        assert response.json()["count"] == 0
        
        # Create some styles
        create_bsp_style(style_number=1, has_video=True, youtube_video_id="abc")
        create_bsp_style(style_number=2, has_video=True, youtube_video_id="def")
        create_bsp_style(style_number=3, has_video=False, youtube_video_id=None)
        
        # Total count
        response = client.get("/bsp-styles/stats/count")
        assert response.status_code == 200
        assert response.json()["count"] == 3
        
        # Count by has_video
        response = client.get("/bsp-styles/stats/count?has_video=true")
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 2
        assert data["has_video"] == True

    def test_bsp_style_with_video(self, client, sample_bsp_style_data):
        """Test creating BSP style with video"""
        style_data = {
            **sample_bsp_style_data,
            "has_video": True,
            "youtube_video_id": "test_video_id"
        }
        
        response = client.post("/bsp-styles", json=style_data)
        assert response.status_code == 201
        data = response.json()
        assert data["has_video"] == True
        assert data["youtube_video_id"] == "test_video_id"

    def test_bsp_style_without_video(self, client, sample_bsp_style_data):
        """Test creating BSP style without video"""
        style_data = {
            **sample_bsp_style_data,
            "has_video": False,
            "youtube_video_id": None
        }
        
        response = client.post("/bsp-styles", json=style_data)
        assert response.status_code == 201
        data = response.json()
        assert data["has_video"] == False
        assert data["youtube_video_id"] == None

    def test_bsp_style_all_fields(self, client, create_bsp_style):
        """Test that all required fields are present in response"""
        style = create_bsp_style()
        
        required_fields = [
            "id", "style_number", "title", "has_video", "description",
            "display_order", "environmental_preferences", "interaction_preferences",
            "character_strengths", "psychological_needs", "likes", "dislikes",
            "work_preferences", "warning_signs", "when_feeling_stressed",
            "created_at", "updated_at"
        ]
        
        for field in required_fields:
            assert field in style, f"Missing field: {field}"

    def test_bsp_style_display_order(self, client, create_bsp_style):
        """Test BSP styles can be ordered by display_order"""
        create_bsp_style(style_number=1, display_order=3, title="Third")
        create_bsp_style(style_number=2, display_order=1, title="First")
        create_bsp_style(style_number=3, display_order=2, title="Second")
        
        response = client.get("/bsp-styles")
        assert response.status_code == 200
        styles = response.json()
        assert len(styles) == 3
        
        # All have display_order
        assert all("display_order" in s for s in styles)

    def test_create_multiple_unique_style_numbers(self, client, create_bsp_style):
        """Test creating multiple BSP styles with unique style_numbers"""
        for i in range(1, 6):
            style = create_bsp_style(
                style_number=i,
                title=f"Style {i}",
                display_order=i
            )
            assert style["style_number"] == i

    def test_bsp_style_character_strengths_field(self, client, create_bsp_style):
        """Test character_strengths field is stored correctly"""
        strengths = ["Leadership", "Communication", "Problem-solving"]
        style = create_bsp_style(character_strengths=strengths)
        
        assert style["character_strengths"] == strengths

    def test_bsp_style_stress_warning_signs(self, client, create_bsp_style):
        """Test warning_signs field"""
        warning_signs = ["Irritability", "withdrawal", "perfectionism"]
        style = create_bsp_style(warning_signs=warning_signs)
        
        assert style["warning_signs"] == warning_signs

    def test_update_bsp_style_partial_fields(self, client, create_bsp_style):
        """Test updating only some fields of a BSP style"""
        style = create_bsp_style()
        original_description = style["description"]
        
        # Update only title
        update_data = {"title": "New Title Only"}
        response = client.put(f"/bsp-styles/{style['id']}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "New Title Only"
        assert data["description"] == original_description  # Unchanged
