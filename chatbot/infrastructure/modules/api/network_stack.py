from aws_cdk import Stack, aws_ec2 as ec2, CfnOutput
from constructs import Construct


class NetworkStack(Stack):
    def __init__(self, scope: Construct, id: str, config, **kwargs):
        super().__init__(scope, id, **kwargs)
        
        env_name = config["env"]["name"]

        self.vpc = ec2.Vpc.from_lookup(
            self,
            "BackendVPC",
            vpc_id=config["network"]["vpc_id"]
        )

        self.private_app_subnets = [
            ec2.Subnet.from_subnet_id(
                self, f"AppSubnet{i}", sid
                ) 
                for i, sid in enumerate(
                    config["network"]["private_app_subnet_ids"]
                )
        ]

        self.lambda_sg = ec2.SecurityGroup(
            self,
            "LambdaSG",
            vpc=self.vpc,
            allow_all_outbound=True,
            description="Lambda runtime security group"
        )
        
        # Export Lambda Security Group ID so backend can reference it
        CfnOutput(
            self,
            "LambdaSecurityGroupId",
            value=self.lambda_sg.security_group_id,
            description=f"Chatbot Lambda Security Group ID for {env_name}",
            export_name=f"ChatbotLambdaSG-{env_name}"
        )