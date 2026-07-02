from aws_cdk import (
    Stack,
    aws_ec2 as ec2,
)
from constructs import Construct


class EndpointsStack(Stack):
    """
    VPC Endpoints Stack - Creates VPC endpoints for AWS services
    
    This allows Lambda functions in private subnets to access AWS services
    without requiring a NAT Gateway (saves costs and improves security)
    """

    def __init__(self, scope: Construct, id: str, vpc: ec2.Vpc,
                 lambda_sg: ec2.SecurityGroup, config: dict, private_subnets, **kwargs):
        super().__init__(scope, id, **kwargs)
        self.vpc = vpc
        region = Stack.of(self).region
        subnet_selection = ec2.SubnetSelection(subnets=private_subnets)
        endpoint_kwargs = dict(
            private_dns_enabled=True,
            security_groups=[lambda_sg],
            subnets=subnet_selection,
        )

        self.bedrock_endpoint = self.vpc.add_interface_endpoint(
            "BedrockEndpoint",
            service=ec2.InterfaceVpcEndpointAwsService.BEDROCK_RUNTIME,
            **endpoint_kwargs,
        )

        bedrock_agent_service = ec2.InterfaceVpcEndpointService(
            f"com.amazonaws.{region}.bedrock-agent",
            443,
        )
        self.bedrock_agent_endpoint = self.vpc.add_interface_endpoint(
            "BedrockAgentEndpoint",
            service=bedrock_agent_service,
            **endpoint_kwargs,
        )

        self.logs_endpoint = self.vpc.add_interface_endpoint(
            "CloudWatchLogsEndpoint",
            service=ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
            **endpoint_kwargs,
        )
