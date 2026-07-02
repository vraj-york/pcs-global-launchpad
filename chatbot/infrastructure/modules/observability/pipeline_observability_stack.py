from aws_cdk import (
    Stack,
    Duration,
    aws_cloudwatch as cloudwatch,
    aws_cloudwatch_actions as cw_actions,
    aws_logs as logs,
    aws_sns as sns,
    CfnOutput,
)
from constructs import Construct


class PipelineObservabilityStack(Stack):
    """
    Phase 0 observability — CloudWatch dashboard and alarms for pipeline telemetry.

    Pipeline logs are single-line JSON with ``record_type`` of ``pipeline_summary``
    or ``pipeline_step`` (see app/observability/pipeline_telemetry.py).
    """

    def __init__(
        self,
        scope: Construct,
        id: str,
        *,
        env_name: str,
        stream_lambda,
        runtime_lambda,
        config: dict,
        **kwargs,
    ):
        super().__init__(scope, id, **kwargs)

        observability = config.get("observability") or {}
        ttft_alarm_ms = int(observability.get("ttft_alarm_ms", 3000))
        alarm_email = observability.get("alarm_email")

        stream_log_group = stream_lambda.log_group
        runtime_log_group = runtime_lambda.log_group

        pipeline_summary_filter = logs.MetricFilter(
            self,
            "PipelineSummaryMetricFilter",
            log_group=stream_log_group,
            filter_pattern=logs.FilterPattern.string_value(
                "$.record_type",
                "=",
                "pipeline_summary",
            ),
            metric_namespace="BispyBot/Pipeline",
            metric_name="PipelineSummaryCount",
            metric_value="1",
        )

        logs.MetricFilter(
            self,
            "PipelineStepMetricFilter",
            log_group=stream_log_group,
            filter_pattern=logs.FilterPattern.string_value(
                "$.record_type",
                "=",
                "pipeline_step",
            ),
            metric_namespace="BispyBot/Pipeline",
            metric_name="PipelineStepCount",
            metric_value="1",
        )

        summary_metric = pipeline_summary_filter.metric(
            statistic="Sum",
            period=Duration.minutes(5),
        )

        stream_duration_metric = stream_lambda.metric_duration(
            statistic="p95",
            period=Duration.minutes(5),
        )
        stream_error_metric = stream_lambda.metric_errors(
            statistic="Sum",
            period=Duration.minutes(5),
        )
        runtime_error_metric = runtime_lambda.metric_errors(
            statistic="Sum",
            period=Duration.minutes(5),
        )

        dashboard = cloudwatch.Dashboard(
            self,
            "PipelineTelemetryDashboard",
            dashboard_name=f"bispybot-pipeline-{env_name}",
        )

        log_groups = [
            stream_log_group.log_group_name,
            runtime_log_group.log_group_name,
        ]

        dashboard.add_widgets(
            cloudwatch.GraphWidget(
                title="Stream Lambda p95 Duration (ms)",
                left=[stream_duration_metric],
                width=12,
            ),
            cloudwatch.GraphWidget(
                title="Pipeline Summary Events / 5 min",
                left=[summary_metric],
                width=12,
            ),
            cloudwatch.GraphWidget(
                title="Lambda Errors / 5 min",
                left=[stream_error_metric, runtime_error_metric],
                width=12,
            ),
            cloudwatch.LogQueryWidget(
                title="TTFT — pipeline_summary",
                log_group_names=log_groups,
                query_string=(
                    "fields @timestamp, record_type, ttft_first_token_ms, "
                    "ttft_sse_ms, query_path, duration_ms, persona, chat_mode\n"
                    "| filter record_type = \"pipeline_summary\"\n"
                    "| sort @timestamp desc\n"
                    "| limit 50"
                ),
                width=24,
                height=6,
            ),
            cloudwatch.LogQueryWidget(
                title="Pipeline steps",
                log_group_names=log_groups,
                query_string=(
                    "fields @timestamp, record_type, step, duration_ms, status, "
                    "request_id\n"
                    "| filter record_type = \"pipeline_step\"\n"
                    "| sort @timestamp desc\n"
                    "| limit 50"
                ),
                width=24,
                height=6,
            ),
        )

        alarm_topic = None
        if alarm_email:
            alarm_topic = sns.Topic(
                self,
                "PipelineAlarmTopic",
                display_name=f"BispyBot pipeline alarms ({env_name})",
            )
            sns.Subscription(
                self,
                "PipelineAlarmEmail",
                topic=alarm_topic,
                protocol=sns.SubscriptionProtocol.EMAIL,
                endpoint=alarm_email,
            )

        stream_duration_alarm = cloudwatch.Alarm(
            self,
            "StreamLambdaDurationAlarm",
            alarm_name=f"bispybot-{env_name}-stream-lambda-p95-duration",
            metric=stream_duration_metric,
            threshold=ttft_alarm_ms,
            evaluation_periods=3,
            datapoints_to_alarm=2,
            comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treat_missing_data=cloudwatch.TreatMissingData.NOT_BREACHING,
            alarm_description=(
                f"Stream Lambda p95 duration exceeded {ttft_alarm_ms} ms "
                f"(proxy for end-to-end TTFT regressions)."
            ),
        )

        stream_error_alarm = cloudwatch.Alarm(
            self,
            "StreamLambdaErrorAlarm",
            alarm_name=f"bispybot-{env_name}-stream-lambda-errors",
            metric=stream_error_metric,
            threshold=1,
            evaluation_periods=1,
            comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treat_missing_data=cloudwatch.TreatMissingData.NOT_BREACHING,
            alarm_description="Stream Lambda reported one or more errors in 5 minutes.",
        )

        if alarm_topic:
            stream_duration_alarm.add_alarm_action(cw_actions.SnsAction(alarm_topic))
            stream_error_alarm.add_alarm_action(cw_actions.SnsAction(alarm_topic))

        CfnOutput(
            self,
            "PipelineDashboardName",
            value=dashboard.dashboard_name,
            description="CloudWatch dashboard for pipeline telemetry",
        )

        if alarm_topic:
            CfnOutput(
                self,
                "PipelineAlarmTopicArn",
                value=alarm_topic.topic_arn,
                description="SNS topic for pipeline alarms (confirm email subscription)",
            )
