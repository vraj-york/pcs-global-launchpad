"""
CDK Stack for Assessment API Gateway

Exposes all FastAPI routes from the Assessment Lambda via a REST API Gateway.
Mangum handles internal routing — a greedy {proxy+} resource forwards every
sub-path to the Lambda, keeping CDK config in sync with FastAPI automatically.

Endpoints surfaced:
  GET  /
  GET  /health
  GET  /questions                          POST /questions
  GET  /questions/{question_id}            PUT  /questions/{question_id}
  DELETE /questions/{question_id}
  GET  /questions/{question_id}/with-options
  GET  /questions/stats/count
  GET  /options                            POST /options
  GET  /options/{option_id}               PUT  /options/{option_id}
  DELETE /options/{option_id}
  GET  /options/by-question/{question_id}
  GET  /bsp-styles                         POST /bsp-styles
  GET  /bsp-styles/{style_id}             PUT  /bsp-styles/{style_id}
  DELETE /bsp-styles/{style_id}
  GET  /bsp-styles/by-number/{style_number}
  GET  /bsp-styles/stats/count
"""
from aws_cdk import (
    Stack,
    aws_apigateway as apigw,
    CfnOutput,
)
from constructs import Construct

from cors_config import api_gateway_cors_origins

_API_GATEWAY_CORS_HEADERS = [
    "Content-Type",
    "X-Amz-Date",
    "Authorization",
    "X-Api-Key",
    "X-Amz-Security-Token",
]


class AssessmentAPIGatewayStack(Stack):
    """
    Assessment API Gateway Stack

    Creates a REST API with a single proxy Lambda integration backed by the
    Assessment FastAPI Lambda (Mangum adapter). All HTTP methods on all paths
    are routed through API Gateway to the Lambda; FastAPI/Mangum handles the
    actual routing internally.

    Features:
    - CORS locked to known CloudFront distributions, custom domains, and
      localhost ports (not wildcard — unlike the raw Function URL)
    - CloudWatch metrics, INFO-level logging, and data tracing enabled
    - Throttling: 100 RPS steady-state / 200 burst
    - Stage: v1
    - **Regional endpoint (not edge-optimized)** — avoids the managed API Gateway/CloudFront
      edge in front of execute-api, which can return 403 HTML on requests carrying long
      `Authorization: Bearer` JWTs while public routes (no header) work.
    - No API Gateway authorizer — auth enforced inside FastAPI
    """

    def __init__(
        self,
        scope: Construct,
        id: str,
        assessment_lambda,
        config: dict,
        **kwargs,
    ) -> None:
        super().__init__(scope, id, **kwargs)

        cors_origins = api_gateway_cors_origins(config)

        api = apigw.RestApi(
            self,
            "AssessmentApi",
            rest_api_name="AssessmentApi",
            description="Assessment API powered by AWS Lambda (FastAPI + Mangum)",
            # Default RestApi is edge-optimized (API Gateway’s CloudFront) which is known to
            # reject some authenticated requests (403 HTML) while unauthenticated public routes
            # succeed. Regional endpoints talk straight to the regional API Gateway in this
            # account — JWT auth in headers then reaches the Lambda/authorizer normally.
            endpoint_types=[apigw.EndpointType.REGIONAL],
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=cors_origins,
                allow_methods=apigw.Cors.ALL_METHODS,
                allow_headers=_API_GATEWAY_CORS_HEADERS,
                allow_credentials=False,
            ),
            deploy_options=apigw.StageOptions(
                stage_name="v1",
                metrics_enabled=True,
                logging_level=apigw.MethodLoggingLevel.INFO,
                data_trace_enabled=True,
                throttling_rate_limit=100,   # requests per second
                throttling_burst_limit=200,  # burst capacity
            ),
        )

        lambda_integration = apigw.LambdaIntegration(
            assessment_lambda,
            proxy=True,
            allow_test_invoke=True,
        )

        # Root path: ANY /
        api.root.add_method("ANY", lambda_integration)

        # Greedy proxy: ANY /{proxy+}
        # Catches every sub-path (/health, /questions, /questions/{id}/..., etc.)
        # and forwards the full request to Mangum for FastAPI routing.
        proxy = api.root.add_resource("{proxy+}")
        proxy.add_method("ANY", lambda_integration)

        self.api_url = api.url

        CfnOutput(
            self,
            "ApiUrl",
            value=api.url,
            description="Assessment API Gateway URL",
            export_name=f"AssessmentApiUrl-{self.stack_name}",
        )

        CfnOutput(
            self,
            "HealthCheckUrl",
            value=f"{api.url}health",
            description="Assessment health check endpoint",
        )

        CfnOutput(
            self,
            "QuestionsEndpointUrl",
            value=f"{api.url}questions",
            description="Questions CRUD endpoint",
        )

        CfnOutput(
            self,
            "OptionsEndpointUrl",
            value=f"{api.url}options",
            description="Options CRUD endpoint",
        )

        CfnOutput(
            self,
            "BspStylesEndpointUrl",
            value=f"{api.url}bsp-styles",
            description="BSP Styles CRUD endpoint",
        )
