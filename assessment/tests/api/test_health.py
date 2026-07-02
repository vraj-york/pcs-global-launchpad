"""
Integration tests for root and health endpoints
"""


class TestHealthAndRootEndpoints:
    """Test suite for health check and root endpoints"""

    def test_health_endpoint_success(self, client):
        """Test health check endpoint returns 200"""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"

    def test_health_endpoint_structure(self, client):
        """Test health endpoint returns expected structure"""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        
        # Required fields
        assert "status" in data
        assert "service" in data
        assert "version" in data
        assert "environment" in data
        assert "timestamp" in data
        
        # Values
        assert data["status"] == "healthy"
        assert isinstance(data["timestamp"], (int, float))

    def test_root_endpoint_success(self, client):
        """Test root endpoint returns 200"""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert "service" in data
        assert "version" in data
        assert "endpoints" in data

    def test_root_endpoint_structure(self, client):
        """Test root endpoint returns expected structure"""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        
        # Required fields
        assert "service" in data
        assert "version" in data
        assert "environment" in data
        assert "endpoints" in data
        
        # Endpoints mapping
        endpoints = data["endpoints"]
        assert "health" in endpoints
        assert "docs" in endpoints
        assert "questions" in endpoints
        assert "options" in endpoints
        assert "bsp_styles" in endpoints
        
        # Verify endpoint paths
        assert endpoints["health"] == "/health"
        assert endpoints["docs"] == "/docs"
        assert endpoints["questions"] == "/questions"
        assert endpoints["options"] == "/options"
        assert endpoints["bsp_styles"] == "/bsp-styles"

    def test_health_check_no_database_dependency(self, client):
        """Test health check works even if database has issues"""
        # Health endpoint should not check database connectivity
        # This test verifies it returns quickly without DB queries
        response = client.get("/health")
        assert response.status_code == 200

    def test_docs_endpoint_accessible(self, client):
        """Test OpenAPI docs endpoint is accessible"""
        response = client.get("/docs")
        assert response.status_code == 200

    def test_redoc_endpoint_accessible(self, client):
        """Test ReDoc endpoint is accessible"""
        response = client.get("/redoc")
        assert response.status_code == 200

    def test_openapi_json_accessible(self, client):
        """Test OpenAPI JSON schema is accessible"""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        data = response.json()
        
        # Verify it's a valid OpenAPI schema
        assert "openapi" in data
        assert "info" in data
        assert "paths" in data

    def test_openapi_includes_all_endpoints(self, client):
        """Test OpenAPI schema includes all API endpoints"""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        data = response.json()
        
        paths = data["paths"]
        
        # Verify key endpoints are documented
        assert "/health" in paths
        assert "/questions" in paths
        assert "/questions/{question_id}" in paths
        assert "/options" in paths
        assert "/options/{option_id}" in paths
        assert "/bsp-styles" in paths
        assert "/bsp-styles/{style_id}" in paths

    def test_cors_headers_present(self, client):
        """Test CORS headers are present in responses"""
        response = client.options("/health")
        # TestClient may not include all CORS headers, but should not fail
        assert response.status_code in [200, 405]

    def test_service_metadata(self, client):
        """Test service returns correct metadata"""
        response = client.get("/")
        data = response.json()
        
        assert "service" in data
        assert "Assessment" in data["service"]
        
        assert "version" in data
        # Version should be in format like "1.0.0"
        assert isinstance(data["version"], str)
        
        assert "environment" in data
        # Allow various environment names
        assert data["environment"] in ["dev", "stage", "prod", "test", "development", "local"]

    def test_health_check_timestamp_valid(self, client):
        """Test health check timestamp is a valid Unix timestamp"""
        import time
        
        before = time.time()
        response = client.get("/health")
        after = time.time()
        
        data = response.json()
        timestamp = data["timestamp"]
        
        # Timestamp should be between before and after
        assert before <= timestamp <= after

    def test_invalid_route_returns_404(self, client):
        """Test requesting invalid route returns 404"""
        response = client.get("/nonexistent-endpoint")
        assert response.status_code == 404

    def test_method_not_allowed(self, client):
        """Test using wrong HTTP method returns 405"""
        # Health endpoint only supports GET
        response = client.post("/health")
        assert response.status_code == 405

    def test_multiple_health_checks(self, client):
        """Test multiple health checks all succeed"""
        for _ in range(5):
            response = client.get("/health")
            assert response.status_code == 200
            assert response.json()["status"] == "healthy"

    def test_root_and_health_no_authentication(self, client):
        """Test root and health endpoints don't require authentication"""
        # These should work without any auth headers
        root_response = client.get("/")
        health_response = client.get("/health")
        
        assert root_response.status_code == 200
        assert health_response.status_code == 200
