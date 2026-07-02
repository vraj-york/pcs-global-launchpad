from aws_cdk import (
    Stack,
    aws_apigateway as apigw,
    CfnOutput
)
from constructs import Construct


class APIGatewayStack(Stack):
    """
    API Gateway Stack - Creates REST API endpoints for the chatbot Lambda

    Features:
    - CORS enabled for browser access (production domains + localhost for dev)
    - CloudWatch logging and metrics
    - Endpoints: health, chat, chat-rag, chat-unified, chat-stream,
                 rag-stats, chat-modes, user-types, threads (+ export),
                 proactive/employee, sessions/assessment-trigger,
                 growth-spark/generate
    - RAG-enhanced chat with vector similarity search
    - Unified chat with intelligent routing
    - SSE streaming chat (chat-stream) — note: API GW buffers the full
      response before delivery. For real token-by-token streaming use the
      Lambda Function URL (InvokeMode: RESPONSE_STREAM) in RuntimeStack.
    """
    def __init__(
        self,
        scope: Construct,
        id: str,
        chatbot_lambda,
        **kwargs
    ):
        super().__init__(scope, id, **kwargs)

        # Create REST API with CORS support
        api = apigw.RestApi(
            self,
            "ChatbotApi",
            rest_api_name="ChatbotApi",
            description="Chatbot API powered by AWS Lambda and Bedrock",
            # binary_media_types instructs API Gateway to base64-decode Lambda proxy
            # responses that have isBase64Encoded=true and a matching Content-Type.
            binary_media_types=["application/pdf", "application/octet-stream"],
            # Enable CORS for browser-based clients
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=[
                    "https://dev.bspblueprint.com",             # dev domain
                    "https://staging.bspblueprint.com",         # stage domain
                    "https://uat.bspblueprint.com",        # uat domain
                    # Local development origins
                    "http://localhost:5173",
                    "http://localhost:5174",
                    "http://localhost:3000",
                    "http://127.0.0.1:5173",
                    "http://127.0.0.1:3000",
                ],
                allow_methods=apigw.Cors.ALL_METHODS,
                allow_headers=[
                    "Content-Type",
                    "X-Amz-Date",
                    "Authorization",
                    "X-Api-Key",
                    "X-Amz-Security-Token"
                ],
                allow_credentials=False
            ),
            deploy_options=apigw.StageOptions(
                stage_name="v1",
                metrics_enabled=True,
                logging_level=apigw.MethodLoggingLevel.INFO,
                data_trace_enabled=True,
                throttling_rate_limit=100,  # requests per second
                throttling_burst_limit=200,  # burst capacity
            ),
        )

        # Lambda integration configuration
        lambda_integration = apigw.LambdaIntegration(
            chatbot_lambda,
            proxy=True,  # Pass all request data to Lambda
            allow_test_invoke=True
        )

        # Health check endpoint: GET /health
        health = api.root.add_resource("health")
        health.add_method("GET", lambda_integration)

        # Chat endpoint: POST /chat
        chat = api.root.add_resource("chat")
        chat.add_method("POST", lambda_integration)
        # Also support GET for testing
        chat.add_method("GET", lambda_integration)

        # RAG Chat endpoint: POST /chat-rag
        chat_rag = api.root.add_resource("chat-rag")
        chat_rag.add_method("POST", lambda_integration)

        # Unified Chat endpoint: POST /chat-unified
        # Intelligent routing between tool calling and RAG based on query classification
        chat_unified = api.root.add_resource("chat-unified")
        chat_unified.add_method("POST", lambda_integration)

        # Streaming Chat endpoint: POST /chat-stream  (SSE — text/event-stream)
        # NOTE: API Gateway REST API buffers the entire Lambda response before
        # delivering it to the client, so this endpoint returns all SSE frames
        # in one batch (no progressive rendering). For real token-by-token
        # streaming use the Lambda Function URL configured in RuntimeStack.
        chat_stream = api.root.add_resource("chat-stream")
        chat_stream.add_method("POST", lambda_integration)

        # RAG Stats endpoint: GET /rag-stats
        rag_stats = api.root.add_resource("rag-stats")
        rag_stats.add_method("GET", lambda_integration)

        # Chat modes endpoint: GET /chat-modes
        chat_modes = api.root.add_resource("chat-modes")
        chat_modes.add_method("GET", lambda_integration)

        # User types endpoint: GET /user-types
        user_types = api.root.add_resource("user-types")
        user_types.add_method("GET", lambda_integration)

        # Threads endpoints: /threads, /threads/{thread_id}, /threads/{thread_id}/messages
        threads = api.root.add_resource("threads")
        threads.add_method("GET", lambda_integration)   # GET  /threads
        threads.add_method("POST", lambda_integration)  # POST /threads

        thread = threads.add_resource("{thread_id}")
        thread.add_method("GET", lambda_integration)     # GET    /threads/{thread_id}
        thread.add_method("PATCH", lambda_integration)   # PATCH  /threads/{thread_id}
        thread.add_method("DELETE", lambda_integration)  # DELETE /threads/{thread_id}

        thread_messages = thread.add_resource("messages")
        thread_messages.add_method("GET", lambda_integration)  # GET /threads/{thread_id}/messages

        generate_title = thread.add_resource("generate-title")
        generate_title.add_method("POST", lambda_integration)  # POST /threads/{thread_id}/generate-title

        # PDF export endpoint: GET /threads/{thread_id}/export
        # Returns application/pdf bytes
        thread_export = thread.add_resource("export")
        thread_export.add_method("GET", lambda_integration)  # GET /threads/{thread_id}/export

        # Proactive employee endpoint: GET /proactive/employee
        proactive = api.root.add_resource("proactive")
        proactive_employee = proactive.add_resource("employee")
        proactive_employee.add_method("GET", lambda_integration)

        # Assessment-trigger session bootstrap: POST /sessions/assessment-trigger
        sessions = api.root.add_resource("sessions")
        assessment_trigger = sessions.add_resource("assessment-trigger")
        assessment_trigger.add_method("POST", lambda_integration)

        # Growth Spark: POST /growth-spark/generate
        growth_spark = api.root.add_resource("growth-spark")
        growth_spark_generate = growth_spark.add_resource("generate")
        growth_spark_generate.add_method("POST", lambda_integration)

        # Store API URL for reference
        self.api_url = api.url

        # Output the API URL so it's visible after deployment
        CfnOutput(
            self,
            "ApiUrl",
            value=api.url,
            description="Chatbot API Gateway URL",
            export_name=f"ChatbotApiUrl-{self.stack_name}"
        )

        CfnOutput(
            self,
            "HealthCheckUrl",
            value=f"{api.url}health",
            description="Health check endpoint URL"
        )

        CfnOutput(
            self,
            "ChatEndpointUrl",
            value=f"{api.url}chat",
            description="Chat endpoint URL"
        )

        CfnOutput(
            self,
            "ChatRagEndpointUrl",
            value=f"{api.url}chat-rag",
            description="RAG-enhanced chat endpoint URL"
        )

        CfnOutput(
            self,
            "ChatUnifiedEndpointUrl",
            value=f"{api.url}chat-unified",
            description="Unified chat endpoint URL with intelligent routing"
        )

        CfnOutput(
            self,
            "RagStatsUrl",
            value=f"{api.url}rag-stats",
            description="RAG statistics endpoint URL"
        )

        CfnOutput(
            self,
            "ChatStreamEndpointUrl",
            value=f"{api.url}chat-stream",
            description="SSE streaming chat endpoint (buffered — use Lambda Function URL for real streaming)"
        )

        CfnOutput(
            self,
            "ThreadsEndpointUrl",
            value=f"{api.url}threads",
            description="Conversation threads endpoint URL"
        )

        CfnOutput(
            self,
            "ProactiveEmployeeEndpointUrl",
            value=f"{api.url}proactive/employee",
            description="Proactive employee payload endpoint URL"
        )

        CfnOutput(
            self,
            "AssessmentTriggerEndpointUrl",
            value=f"{api.url}sessions/assessment-trigger",
            description="Post-assessment coaching session bootstrap endpoint URL"
        )

        CfnOutput(
            self,
            "GrowthSparkGenerateEndpointUrl",
            value=f"{api.url}growth-spark/generate",
            description="Daily Growth Spark generation endpoint URL",
        )
