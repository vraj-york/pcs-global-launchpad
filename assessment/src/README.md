# Assessment Module API

CRUD API for managing assessment questions, options, and BSP styles.

## 📁 Project Structure
```
assessment/
├── src/
│   ├── api/              # FastAPI application
│   ├── database/         # Database models and queries
│   ├── services/         # Business logic
│   ├── lambdas/          # Lambda handlers
│   ├── utils/            # Utilities
│   └── tests/            # Tests
├── infrastructure/       # CDK deployment code
├── scripts/             # Helper scripts
└── requirements.txt     # Python dependencies
```

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL database
- AWS account (for deployment)

### Local Development

1. **Clone and setup**
```bash
   cd assessment
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
```

2. **Configure environment**
```bash
   cp .env.example .env
   # Edit .env with your database credentials
```

3. **Test database connection**
```bash
   python scripts/test_db_connection.py
```

4. **Create sample data (optional)**
```bash
   python scripts/create_sample_data.py
```

5. **Run development server**
```bash
   python scripts/local_dev.py
   # Or: make dev
```

6. **Access API**
   - API: http://localhost:8000
   - Docs: http://localhost:8000/docs
   - Health: http://localhost:8000/health

### 404 on `GET /questions` (or any path)

- The process on that port must be **this** Assessment FastAPI app. If another service already uses the same port (e.g. chatbot on 8000), you will get **404** for `/questions`.
- Quick check from a terminal:
  - `curl -s http://localhost:8000/ | head` — should include `"service":"Assessment Module API"`.
  - `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/health` — should be `200`.
- If the wrong app is bound, **free the port** or run the assessment API on another port (e.g. 8001) and set `VITE_BSP_ASSESSMENT_API_URL` in the frontend `.env` to match. **Restart the Vite dev server** after changing env vars.

## 📚 API Endpoints

### Questions
- `GET /questions` - List all questions
- `GET /questions/{id}` - Get specific question
- `POST /questions` - Create question
- `PUT /questions/{id}` - Update question
- `DELETE /questions/{id}` - Delete question

### Options
- `GET /options` - List all options
- `GET /options/{id}` - Get specific option
- `GET /options/by-question/{question_id}` - Get options for a question
- `POST /options` - Create option
- `PUT /options/{id}` - Update option
- `DELETE /options/{id}` - Delete option

### BSP Styles
- `GET /bsp-styles` - List all BSP styles
- `GET /bsp-styles/{id}` - Get specific style
- `GET /bsp-styles/by-code/{code}` - Get style by code
- `POST /bsp-styles` - Create style
- `PUT /bsp-styles/{id}` - Update style
- `DELETE /bsp-styles/{id}` - Delete style

## 🧪 Testing
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest src/tests/unit/test_routers/test_questions.py
```

## 🏗️ Deployment

### Using CDK
```bash
cd infrastructure

# Install CDK dependencies
npm install -g aws-cdk
pip install -r requirements.txt

# Bootstrap (first time only)
cdk bootstrap

# Deploy
cdk deploy AssessmentAPIStack-dev
```

### Environment Variables

Set these in Lambda configuration:
- `DB_HOST` - Database host
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `ENVIRONMENT` - Environment (dev/staging/prod)
- `LOG_LEVEL` - Logging level (DEBUG/INFO/WARNING/ERROR)

## 📖 Development Guide

### Adding a New Endpoint

1. Create schema in `src/api/schemas/`
2. Add database queries in `src/database/queries/`
3. Implement service logic in `src/services/`
4. Create router in `src/api/routers/`
5. Register router in `src/api/main.py`
6. Add tests in `src/tests/`

### Code Style
```bash
# Format code
black src/
isort src/

# Lint
flake8 src/
mypy src/
```

## 🔍 Troubleshooting

### Database Connection Issues
```bash
# Test connection
python scripts/test_db_connection.py

# Check environment variables
echo $DB_HOST
echo $DB_NAME
```

### Lambda Deployment Issues
```bash
# Check CloudWatch logs
aws logs tail /aws/lambda/AssessmentAPILambda --follow

# Test Lambda locally
sam local start-api
```

## 📝 License

[Your License]

## 👥 Contributors

[Your Team]