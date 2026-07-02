from aws_cdk import (
    Stack,
    Duration,
    CfnOutput,
    aws_ec2 as ec2,
    aws_iam as iam,
    aws_lambda as _lambda,
    aws_lambda_event_sources as lambda_event_sources,
    aws_logs as logs,
    aws_s3 as s3,
    aws_sqs as sqs,
    aws_ssm as ssm,
)
from aws_cdk.aws_ecr_assets import Platform
from constructs import Construct


def _print_base_url_for_environment(config: dict, env_name: str) -> str:
    explicit = (config.get("print_base_url") or "").strip().rstrip("/")
    if explicit:
        return explicit
    key = (env_name or "development").strip().lower()
    if key in ("prod", "production", "prd"):
        return "https://bspblueprint.com"
    if key in ("stage", "staging"):
        return "https://staging.bspblueprint.com"
    return "https://dev.bspblueprint.com"


class AssessmentScoreEngineStack(Stack):
    """
    Score + Report worker infrastructure for Assessment Engine.

    Creates:
    - Scoring SQS queue + DLQ
    - Report SQS queue + DLQ
    - Reports S3 bucket (imported existing bucket)
    - Scoring Lambda (SQS consumer → computes score → sends message to report queue)
    - Report Lambda (SQS consumer → generates PDF → uploads to S3)
    """

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        config: dict,
        shared_vpc,
        lambda_sg,
        private_subnets: list[ec2.ISubnet],
        rds_secret_arn: str,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        env_name = config["env"]["name"]
        lambda_cfg = config.get("lambda", {})

        scoring_cfg = lambda_cfg.get("scoring", {"memory": 1024, "timeout": 60})
        report_cfg = lambda_cfg.get("report", {"memory": 2048, "timeout": 300})

        scoring_dlq = sqs.Queue(
            self,
            "ScoringDLQ",
            queue_name=f"assessment-scoring-dlq-{env_name}",
            retention_period=Duration.days(14),
        )
        report_dlq = sqs.Queue(
            self,
            "ReportDLQ",
            queue_name=f"assessment-report-dlq-{env_name}",
            retention_period=Duration.days(14),
        )

        self.scoring_queue = sqs.Queue(
            self,
            "ScoringQueue",
            queue_name=f"assessment-scoring-queue-{env_name}",
            visibility_timeout=Duration.seconds(
                max(6 * 60, scoring_cfg["timeout"] + 30)
            ),
            dead_letter_queue=sqs.DeadLetterQueue(
                queue=scoring_dlq, max_receive_count=5
            ),
        )

        self.report_queue = sqs.Queue(
            self,
            "ReportQueue",
            queue_name=f"assessment-report-queue-{env_name}",
            visibility_timeout=Duration.seconds(
                max(10 * 60, report_cfg["timeout"] + 60)
            ),
            dead_letter_queue=sqs.DeadLetterQueue(
                queue=report_dlq, max_receive_count=3
            ),
        )

        reports_bucket_name = config.get("s3", {}).get("reports_bucket_name")
        if not reports_bucket_name:
            raise ValueError("config.s3.reports_bucket_name is required")

        self.reports_bucket = s3.Bucket.from_bucket_name(
            self,
            "ReportsBucket",
            bucket_name=reports_bucket_name,
        )
        reports_prefix = (
            config.get("s3", {}).get("reports_prefix", "assessment_report/").strip()
        )
        print_html_prefix = (
            config.get("s3", {}).get("print_html_prefix", "assessment_print_html/").strip()
        )

        rds_cfg = config.get("rds", {})
        db_host = rds_cfg.get("host")
        db_port = rds_cfg.get("port")
        db_name = rds_cfg.get("db_name")
        if not db_host or not db_port or not db_name:
            raise ValueError("config.rds.host/port/db_name are required")

        shared_env = {
            "ENVIRONMENT": env_name,
            "LOG_LEVEL": config.get("log_level", "INFO"),
            "RDS_SECRET_ARN": rds_secret_arn,
            "DB_HOST": db_host,
            "DB_PORT": str(db_port),
            "DB_NAME": db_name,
            "REPORT_QUEUE_URL": self.report_queue.queue_url,
            "REPORTS_BUCKET": self.reports_bucket.bucket_name,
            "REPORTS_PREFIX": reports_prefix,
            "PRINT_HTML_PREFIX": print_html_prefix,
            "AUTO_ENQUEUE_REPORT_AFTER_SCORING": "false",
        }

        sentry_cfg = config.get("sentry", {}) or {}
        sentry_dsn = (self.node.try_get_context("sentry_dsn") or "").strip()
        dsn_parameter_name = (sentry_cfg.get("dsn_parameter_name") or "").strip()
        sentry_traces = str(sentry_cfg.get("traces_sample_rate", 0.1))
        sentry_release = (
            (self.node.try_get_context("sentry_release") or "")
            .strip()
            or f"assessment-workers-{env_name}-latest"
        )
        sentry_dsn_param = None
        if sentry_dsn:
            shared_env["SENTRY_DSN"] = sentry_dsn
        elif dsn_parameter_name:
            # SecureString SSM params cannot be resolved into Lambda env via CloudFormation.
            # Lambdas read the parameter at cold start (see monitoring/sentry_init.py).
            shared_env["SENTRY_DSN_PARAMETER_NAME"] = dsn_parameter_name
            sentry_dsn_param = ssm.StringParameter.from_secure_string_parameter_attributes(
                self,
                "AssessmentWorkersSentryDsnParam",
                parameter_name=dsn_parameter_name,
            )
        shared_env["SENTRY_ENVIRONMENT"] = env_name
        shared_env["SENTRY_RELEASE"] = sentry_release
        shared_env["SENTRY_TRACES_SAMPLE_RATE"] = sentry_traces

        print_base_url = _print_base_url_for_environment(config, env_name)
        print_expected_pages = int(config.get("print_expected_pages", 20))

        report_env = {
            **shared_env,
            "PRINT_BASE_URL": print_base_url,
            "PRINT_EXPECTED_PAGES": str(print_expected_pages),
        }

        # Create roles in THIS stack to avoid cross-stack cycles.
        # (SQS event source mapping injects a queue-ARN-scoped policy into the Lambda role.)
        scoring_role = iam.Role(
            self,
            "AssessmentScoringWorkerRole",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            description=f"Role for assessment scoring worker ({env_name})",
        )
        report_role = iam.Role(
            self,
            "AssessmentReportWorkerRole",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            description=f"Role for assessment report worker ({env_name})",
        )

        for role in (scoring_role, report_role):
            role.add_managed_policy(
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AWSLambdaVPCAccessExecutionRole"
                )
            )
            role.add_to_policy(
                iam.PolicyStatement(
                    actions=[
                        "secretsmanager:GetSecretValue",
                        "secretsmanager:DescribeSecret",
                    ],
                    resources=[rds_secret_arn],
                )
            )

        if sentry_dsn_param is not None:
            sentry_dsn_param.grant_read(scoring_role)
            sentry_dsn_param.grant_read(report_role)

        shared_kwargs = dict(
            vpc=shared_vpc,
            security_groups=[lambda_sg],
            vpc_subnets=ec2.SubnetSelection(subnets=private_subnets),
            environment=shared_env,
            log_retention=logs.RetentionDays.ONE_WEEK,
        )
        report_kwargs = {**shared_kwargs, "environment": report_env}

        self.scoring_lambda = _lambda.DockerImageFunction(
            self,
            "AssessmentScoringWorker",
            function_name=f"assessment-scoring-worker-{env_name}",
            description=f"Assessment scoring worker ({env_name})",
            code=_lambda.DockerImageCode.from_image_asset(
                "../src",
                platform=Platform.LINUX_AMD64,
                cmd=["lambdas.score_worker.handler"],
            ),
            memory_size=scoring_cfg["memory"],
            timeout=Duration.seconds(scoring_cfg["timeout"]),
            role=scoring_role,
            **shared_kwargs,
        )

        self.report_lambda = _lambda.DockerImageFunction(
            self,
            "AssessmentReportWorker",
            function_name=f"assessment-report-worker-{env_name}",
            description=(
                f"Assessment report worker — HTML snapshot to PDF ({env_name})"
            ),
            code=_lambda.DockerImageCode.from_image_asset(
                "../src",
                platform=Platform.LINUX_AMD64,
                file="Dockerfile.report",
                cmd=["lambdas.report_worker.handler"],
            ),
            memory_size=report_cfg["memory"],
            timeout=Duration.seconds(report_cfg["timeout"]),
            role=report_role,
            **report_kwargs,
        )
        self.scoring_lambda.add_event_source(
            lambda_event_sources.SqsEventSource(self.scoring_queue, batch_size=5)
        )
        self.report_lambda.add_event_source(
            lambda_event_sources.SqsEventSource(self.report_queue, batch_size=1)
        )

        # Permissions
        #
        # IMPORTANT: Do not use `queue.grant_*` / `bucket.grant_*` here because
        # the role is created in a different stack (IAMStack). Those grant
        # helpers inject resource-scoped policy statements into that role,
        # which creates a cross-stack reference back to this stack's resources
        # (queues/bucket) and causes a cyclic dependency at synth time.
        #
        # For now, allow required actions on "*" (we'll tighten to ARNs later
        # once we decide where roles/policies should live).
        scoring_role.add_to_policy(
            iam.PolicyStatement(
                actions=[
                    "sqs:ReceiveMessage",
                    "sqs:DeleteMessage",
                    "sqs:GetQueueAttributes",
                    "sqs:ChangeMessageVisibility",
                    "sqs:SendMessage",
                ],
                resources=["*"],
            )
        )
        report_role.add_to_policy(
            iam.PolicyStatement(
                actions=[
                    "s3:GetObject",
                    "s3:PutObject",
                    "s3:AbortMultipartUpload",
                    "s3:ListBucketMultipartUploads",
                    "s3:ListMultipartUploadParts",
                ],
                resources=["*"],
            )
        )

        # Outputs
        CfnOutput(
            self,
            "ScoringQueueUrl",
            value=self.scoring_queue.queue_url,
            export_name=f"assessment-scoring-queue-url-{env_name}",
        )
        CfnOutput(
            self,
            "ReportQueueUrl",
            value=self.report_queue.queue_url,
            export_name=f"assessment-report-queue-url-{env_name}",
        )
        CfnOutput(
            self,
            "ReportsBucketName",
            value=self.reports_bucket.bucket_name,
            export_name=f"assessment-reports-bucket-name-{env_name}",
        )
