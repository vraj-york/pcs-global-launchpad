from aws_cdk import (
    Stack,
    Duration,
    CfnOutput,
    aws_lambda as _lambda,
    aws_ec2 as ec2,
    aws_logs as logs,
)
from constructs import Construct
from aws_cdk.aws_ecr_assets import Platform


def _bool_env(value: bool) -> str:
    return "true" if value else "false"


def build_shared_lambda_env(config: dict, *, db_endpoint, db_port, db_name, db_secret_arn, kms_key_arn) -> dict:
    """Build environment variables shared by runtime and stream Lambdas."""
    optimization = config.get("optimization") or {}

    shared_env = {
        "BEDROCK_CHAT_MODEL": config["bedrock_chat_model"],
        "BEDROCK_SUMMARY_MODEL": config.get(
            "bedrock_summary_model",
            "us.anthropic.claude-haiku-4-5-20251001-v1:0",
        ),
        "ENVIRONMENT": config["env"]["name"],
        "LOG_LEVEL": config.get("log_level", "INFO"),
        "BEDROCK_PROMPT_ID": config.get("bedrock_prompt_id", ""),
        "BEDROCK_PROMPT_VERSION": config.get("bedrock_prompt_version", "1"),
        "BEDROCK_COACH_PROMPT_ID": config.get("bedrock_coach_prompt_id", ""),
        "BEDROCK_COACH_PROMPT_VERSION": config.get("bedrock_coach_prompt_version", "1"),
        "ENABLE_BEDROCK_PROMPT_CACHING": _bool_env(
            optimization.get("enable_bedrock_prompt_caching", True)
        ),
        "USE_COACH_PERSONA_SHELL": _bool_env(
            optimization.get("use_coach_persona_shell", True)
        ),
        "WARM_CONTEXT_HTTP_TIMEOUT": str(
            optimization.get("warm_context_http_timeout", 3)
        ),
        "ENABLE_SPECULATIVE_WARM_PREFETCH": _bool_env(
            optimization.get("enable_speculative_warm_prefetch", False)
        ),
        "ENABLE_MEMORY_RETRIEVAL": _bool_env(
            optimization.get("enable_memory_retrieval", True)
        ),
        "ENABLE_MEMORY_EXTRACTION": _bool_env(
            optimization.get("enable_memory_extraction", True)
        ),
        "MEMORY_RETRIEVE_TIMEOUT_MS": str(
            optimization.get("memory_retrieve_timeout_ms", 1200)
        ),
        "MEMORY_DEFAULT_STATUS": optimization.get("memory_default_status", "candidate"),
        "MEMORY_IMPORTANCE_MIN": str(optimization.get("memory_importance_min", 0.3)),
        "MEMORY_CONSENT_DEFAULT_GRANTED": _bool_env(
            optimization.get("memory_consent_default_granted", False)
        ),
        "USE_MOCK_CLIENT_SNAPSHOT": _bool_env(
            optimization.get("use_mock_client_snapshot", True)
        ),
        "BACKEND_API_URL": config.get("backend_api_url", ""),
        "BACKEND_API_KEY": config.get("backend_api_key", ""),
        "RAG_MIN_SIMILARITY": str(config.get("rag_min_similarity", 0.5)),
        "RAG_TOP_K": str(config.get("rag_top_k", 3)),
        **({"DB_HOST": db_endpoint} if db_endpoint else {}),
        **({"DB_PORT": db_port} if db_port else {}),
        **({"DB_NAME": db_name} if db_name else {}),
        **({"DB_SECRET_ARN": db_secret_arn} if db_secret_arn else {}),
        **({"KMS_MESSAGES_KEY_ARN": kms_key_arn} if kms_key_arn else {}),
    }

    guardrail_id = config.get("bedrock_guardrail_id", "")
    if guardrail_id:
        shared_env["BEDROCK_GUARDRAIL_ID"] = guardrail_id
        shared_env["BEDROCK_GUARDRAIL_VERSION"] = config.get(
            "bedrock_guardrail_version", "DRAFT"
        )

    # Cognito JWT verification. The streaming Lambda is exposed via a public
    # Function URL (auth_type=NONE), so the app itself must be able to verify
    # tokens. verify_jwt defaults false (decode-only) for environments fronted
    # by an API Gateway Cognito authorizer; enable it for any directly-reachable
    # deployment. Region defaults to the Lambda's own AWS_REGION when unset.
    cognito = config.get("cognito") or {}
    shared_env["CHATBOT_VERIFY_JWT"] = _bool_env(cognito.get("verify_jwt", False))
    for env_key, cfg_key in (
        ("COGNITO_USER_POOL_ID", "user_pool_id"),
        ("COGNITO_REGION", "region"),
        ("COGNITO_ISSUER", "issuer"),
        ("COGNITO_JWKS_URL", "jwks_url"),
    ):
        value = cognito.get(cfg_key)
        if value:
            shared_env[env_key] = str(value)

    return shared_env


def _maybe_provisioned_alias(
    scope: Construct,
    construct_id: str,
    function: _lambda.DockerImageFunction,
    *,
    count: int,
) -> _lambda.IFunction:
    """Return a provisioned alias when count > 0, otherwise the bare function."""
    if not count or count <= 0:
        return function

    version = function.current_version
    return _lambda.Alias(
        scope,
        construct_id,
        alias_name="live",
        version=version,
        provisioned_concurrent_executions=count,
    )


class RuntimeStack(Stack):
    """
    Runtime Stack — Lambda functions for the chatbot service.

    Creates two Lambda functions from the same Docker image:

    1. ChatbotRuntimeLambda
       Handler : app.main.handler  (Mangum + FastAPI)
       Purpose : all routes except /chat-stream — invoked by API Gateway
       Invoke  : standard (buffered) — API Gateway doesn't support streaming

    2. ChatbotStreamLambda
       Handler : app.streaming_main.streaming_handler
                 (awslambdaric StreamifyResponse + async→sync queue bridge)
       Purpose : /chat-stream SSE endpoint — invoked directly by the browser
       Invoke  : RESPONSE_STREAM — each SSE frame is forwarded to the client
                 as soon as the agentic loop yields it (true progressive rendering)
       URL     : Lambda Function URL (no API Gateway — GW buffers, defeating streaming)

    CORS is handled solely by FastAPI's CORSMiddleware (config.py CORS_ORIGINS).
    No CORS is configured on the Function URL to avoid duplicate
    Access-Control-Allow-Origin headers that browsers reject.

    Auth on the Function URL uses NONE — the FastAPI app validates the JWT
    in the Authorization header, consistent with all other chatbot routes.
    """

    def __init__(
        self,
        scope: Construct,
        id: str,
        vpc: ec2.Vpc,
        lambda_sg: ec2.SecurityGroup,
        private_subnets: list[ec2.ISubnet],
        iam_stack,
        config: dict,
        db_endpoint: str = None,
        db_port: str = None,
        db_name: str = None,
        db_secret_arn: str = None,
        kms_key_arn: str = None,
        **kwargs
    ):
        super().__init__(scope, id, **kwargs)

        chat_lambda_config = config["lambda"]["chat"]
        stream_provisioned = int(
            chat_lambda_config.get("stream_provisioned_concurrency", 0) or 0
        )
        runtime_provisioned = int(
            chat_lambda_config.get("runtime_provisioned_concurrency", 0) or 0
        )

        shared_env = build_shared_lambda_env(
            config,
            db_endpoint=db_endpoint,
            db_port=db_port,
            db_name=db_name,
            db_secret_arn=db_secret_arn,
            kms_key_arn=kms_key_arn,
        )

        shared_kwargs = dict(
            role=iam_stack.lambda_runtime_role,
            vpc=vpc,
            security_groups=[lambda_sg],
            vpc_subnets=ec2.SubnetSelection(subnets=private_subnets),
            environment=shared_env,
            log_retention=logs.RetentionDays.ONE_MONTH,
        )

        self.chatbot_lambda = _lambda.DockerImageFunction(
            self,
            "ChatbotRuntimeLambda",
            description="Chatbot — FastAPI/Mangum handler for all API Gateway routes",
            code=_lambda.DockerImageCode.from_image_asset(
                "../src",
                platform=Platform.LINUX_AMD64,
            ),
            memory_size=chat_lambda_config["memory"],
            timeout=Duration.seconds(chat_lambda_config["timeout"]),
            **shared_kwargs,
        )

        stream_memory = max(chat_lambda_config["memory"], 512)

        self.stream_lambda = _lambda.DockerImageFunction(
            self,
            "ChatbotStreamLambda",
            description=(
                "Chatbot — streaming SSE via Lambda Web Adapter + uvicorn (RESPONSE_STREAM)"
            ),
            code=_lambda.DockerImageCode.from_image_asset(
                "../src",
                platform=Platform.LINUX_AMD64,
                file="Dockerfile.streaming",
            ),
            memory_size=stream_memory,
            timeout=Duration.seconds(chat_lambda_config["timeout"]),
            **shared_kwargs,
        )

        self.chatbot_invoke_target = _maybe_provisioned_alias(
            self,
            "RuntimeLambdaLiveAlias",
            self.chatbot_lambda,
            count=runtime_provisioned,
        )
        stream_invoke_target = _maybe_provisioned_alias(
            self,
            "StreamLambdaLiveAlias",
            self.stream_lambda,
            count=stream_provisioned,
        )

        stream_function_url = stream_invoke_target.add_function_url(
            auth_type=_lambda.FunctionUrlAuthType.NONE,
            invoke_mode=_lambda.InvokeMode.RESPONSE_STREAM,
        )

        self.stream_function_url_value = stream_function_url.url

        CfnOutput(
            self,
            "StreamFunctionUrl",
            value=f"{stream_function_url.url}chat-stream",
            description=(
                "Lambda Function URL for /chat-stream with InvokeMode.RESPONSE_STREAM. "
                "Tokens stream progressively to the browser as Bedrock emits them. "
                "Set VITE_CHATBOT_STREAM_URL to this value in frontend/.env."
            ),
        )

        CfnOutput(
            self,
            "RuntimeLambdaName",
            value=self.chatbot_lambda.function_name,
            description="Runtime Lambda function name (API Gateway routes, Mangum handler)",
        )

        CfnOutput(
            self,
            "StreamLambdaName",
            value=self.stream_lambda.function_name,
            description="Streaming Lambda function name (Function URL, RESPONSE_STREAM)",
        )

        if stream_provisioned > 0:
            CfnOutput(
                self,
                "StreamProvisionedConcurrency",
                value=str(stream_provisioned),
                description="Provisioned concurrency units on stream Lambda live alias",
            )

        if runtime_provisioned > 0:
            CfnOutput(
                self,
                "RuntimeProvisionedConcurrency",
                value=str(runtime_provisioned),
                description="Provisioned concurrency units on runtime Lambda live alias",
            )
