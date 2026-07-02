from aws_cdk import Stack, aws_ec2 as ec2, CfnOutput
from constructs import Construct


class NetworkStack(Stack):
    """
    Imports the backend team's existing VPC and subnets.
    Creates a dedicated security group for Assessment Engine Lambdas.
    Also adds the inbound 5432 rule to the backend RDS security group
    so our Lambdas can reach the database.
    """

    def __init__(self, scope: Construct, id: str, config: dict, **kwargs):
        super().__init__(scope, id, **kwargs)

        env_name = config["env"]["name"]

        #  Import existing backend VPC 
        self.vpc = ec2.Vpc.from_lookup(
            self,
            "BackendVPC",
            vpc_id=config["network"]["vpc_id"],
        )

        #  Import private subnets 
        self.private_app_subnets = [
            ec2.Subnet.from_subnet_id(self, f"AppSubnet{i}", sid)
            for i, sid in enumerate(config["network"]["private_app_subnet_ids"])
        ]

        #  Security group for all Assessment Lambdas 
        self.lambda_sg = ec2.SecurityGroup(
            self,
            "AssessmentLambdaSG",
            vpc=self.vpc,
            allow_all_outbound=True,
            description=f"Assessment Engine Lambda security group ({env_name})",
        )

        #  Allow Lambda SG to reach the backend RDS on port 5432 
        # We import the existing RDS SG by ID and add a single inbound rule.
        # CDK reconciles this without touching any other rules on the SG.
        backend_rds_sg = ec2.SecurityGroup.from_security_group_id(
            self,
            "BackendRDSSG",
            security_group_id=config["rds"]["security_group_id"],
            allow_all_outbound=False,
            mutable=True,
        )
        backend_rds_sg.add_ingress_rule(
            peer=self.lambda_sg,
            connection=ec2.Port.tcp(5432),
            description=f"Assessment {env_name} to RDS",
        )

        #  Outputs 
        CfnOutput(
            self,
            "LambdaSecurityGroupId",
            value=self.lambda_sg.security_group_id,
            description=f"Assessment Lambda SG ID ({env_name})",
            export_name=f"AssessmentLambdaSG-{env_name}",
        )
