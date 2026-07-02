"""
Integration tests for Options API endpoints
"""

from uuid import uuid4

from utils.option_key import make_option_key


class TestOptionsAPI:
    """Test suite for Options CRUD operations"""

    def test_create_option_success(self, client, bare_question_id, sample_option_data):
        """Test creating an option on a question that has no options yet"""
        question_id = bare_question_id()
        option_data = {**sample_option_data, "question_id": question_id}
        response = client.post("/options", json=option_data)

        assert response.status_code == 201
        data = response.json()
        assert data["question_id"] == question_id
        assert data["color"] == sample_option_data["color"]
        assert data["option_text"] == sample_option_data["option_text"]
        assert data["display_order"] == sample_option_data["display_order"]
        assert data["option_key"] == make_option_key(
            "typical", "professional", 9001, sample_option_data["color"]
        )
        assert "id" in data
        assert "created_at" in data

    def test_create_option_invalid_question_id(self, client, sample_option_data):
        """Test creating an option with non-existent question_id"""
        fake_question_id = str(uuid4())
        option_data = {**sample_option_data, "question_id": fake_question_id}

        response = client.post("/options", json=option_data)
        assert response.status_code in [400, 404, 422]

    def test_create_option_invalid_color(
        self, client, bare_question_id, sample_option_data
    ):
        """Test creating an option with invalid color"""
        question_id = bare_question_id()
        option_data = {
            **sample_option_data,
            "question_id": question_id,
            "color": "invalid_color",
        }

        response = client.post("/options", json=option_data)
        assert response.status_code == 422

    def test_create_option_invalid_display_order(
        self, client, bare_question_id, sample_option_data
    ):
        """Test display_order must be between 1 and 4"""
        question_id = bare_question_id()

        option_data = {
            **sample_option_data,
            "question_id": question_id,
            "display_order": 0,
        }
        response = client.post("/options", json=option_data)
        assert response.status_code == 422

        option_data = {
            **sample_option_data,
            "question_id": question_id,
            "display_order": 5,
        }
        response = client.post("/options", json=option_data)
        assert response.status_code == 422

    def test_get_options_empty(self, client):
        """Test getting options when database is empty"""
        response = client.get("/options")
        assert response.status_code == 200
        assert response.json() == []

    def test_get_options_with_data(self, client, create_question):
        """POST /questions creates four options; list returns them"""
        create_question()
        response = client.get("/options")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 4
        assert all("id" in opt for opt in data)

    def test_get_options_filter_by_question_id(self, client, create_question):
        """Each question has exactly four options"""
        question1 = create_question(
            question_order=1, question_text="First question for options testing here"
        )
        question2 = create_question(
            question_order=2, question_text="Second question for options testing here"
        )

        response = client.get(f"/options?question_id={question1['id']}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 4
        assert all(opt["question_id"] == question1["id"] for opt in data)

    def test_get_options_filter_by_color(self, client, create_question):
        """Two questions => two red options when filtering by color"""
        create_question(
            question_order=1,
            question_text="First question for color filter testing here",
        )
        create_question(
            question_order=2,
            question_text="Second question for color filter testing here",
        )

        response = client.get("/options?color=red")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert all(opt["color"] == "red" for opt in data)

    def test_get_options_pagination(self, client, create_question):
        """Three questions => twelve options"""
        for i in range(1, 4):
            create_question(
                question_order=i,
                question_text=f"Pagination test question {i} text here",
            )

        response = client.get("/options?skip=0&limit=5")
        assert response.status_code == 200
        assert len(response.json()) == 5

        response = client.get("/options?skip=5&limit=5")
        assert response.status_code == 200
        assert len(response.json()) == 5

        response = client.get("/options?skip=10&limit=5")
        assert response.status_code == 200
        assert len(response.json()) == 2

    def test_get_option_by_id(self, client, create_question):
        question = create_question()
        option_id = question["options"][0]["id"]

        response = client.get(f"/options/{option_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == option_id
        assert data["option_text"] == question["options"][0]["option_text"]

    def test_get_option_not_found(self, client):
        fake_id = str(uuid4())
        response = client.get(f"/options/{fake_id}")
        assert response.status_code == 404

    def test_get_options_by_question(self, client, create_question):
        question1 = create_question(
            question_order=1, question_text="Question one text here for options"
        )
        question2 = create_question(
            question_order=2, question_text="Question two text here for options"
        )

        response = client.get(f"/options/by-question/{question1['id']}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 4
        assert all(opt["question_id"] == question1["id"] for opt in data)

        response = client.get(f"/options/by-question/{question2['id']}")
        assert response.status_code == 200
        assert len(response.json()) == 4

    def test_get_options_by_question_not_found(self, client):
        fake_id = str(uuid4())
        response = client.get(f"/options/by-question/{fake_id}")
        assert response.status_code == 404

    def test_update_option(self, client, create_question):
        question = create_question()
        red = next(o for o in question["options"] if o["color"] == "red")

        update_data = {"option_text": "Updated option text for testing purposes here"}
        response = client.put(f"/options/{red['id']}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["option_text"] == update_data["option_text"]
        assert data["color"] == "red"
        assert data["display_order"] == red["display_order"]

    def test_update_option_not_found(self, client):
        fake_id = str(uuid4())
        update_data = {"option_text": "Updated text for nonexistent option here"}
        response = client.put(f"/options/{fake_id}", json=update_data)
        assert response.status_code == 404

    def test_update_option_invalid_data(self, client, create_question):
        question = create_question()
        opt_id = question["options"][0]["id"]

        invalid_data = {"option_text": ""}
        response = client.put(f"/options/{opt_id}", json=invalid_data)
        assert response.status_code in [400, 422]

    def test_delete_option(self, client, create_question):
        question = create_question()
        option_id = question["options"][0]["id"]

        response = client.delete(f"/options/{option_id}")
        assert response.status_code == 204

        response = client.get(f"/options/{option_id}")
        assert response.status_code == 404

    def test_delete_option_not_found(self, client):
        fake_id = str(uuid4())
        response = client.delete(f"/options/{fake_id}")
        assert response.status_code == 404

    def test_option_text_validation(self, client, bare_question_id, sample_option_data):
        question_id = bare_question_id()

        invalid_data = {
            **sample_option_data,
            "question_id": question_id,
            "option_text": "",
        }
        response = client.post("/options", json=invalid_data)
        assert response.status_code in [400, 422]

        invalid_data["option_text"] = "   "
        response = client.post("/options", json=invalid_data)
        assert response.status_code in [400, 422]

    def test_all_four_colors(self, client, bare_question_id, sample_option_data):
        """Add four options to a bare question via POST /options"""
        question_id = bare_question_id()
        colors = ["red", "green", "blue", "grey"]
        for i, color in enumerate(colors, 1):
            body = {
                **sample_option_data,
                "question_id": question_id,
                "color": color,
                "display_order": i,
                "option_text": f"Option with {color} color text here",
            }
            response = client.post("/options", json=body)
            assert response.status_code == 201, response.text
            assert response.json()["color"] == color

    def test_multiple_questions_with_options(self, client, create_question):
        q1 = create_question(
            question_order=1, question_text="First question here for multi test"
        )
        q2 = create_question(
            question_order=2, question_text="Second question here for multi test"
        )

        response = client.get(f"/options/by-question/{q1['id']}")
        assert response.status_code == 200
        assert len(response.json()) == 4

        response = client.get(f"/options/by-question/{q2['id']}")
        assert response.status_code == 200
        assert len(response.json()) == 4
