"""
DECOMMISSIONED — no longer referenced by app.py.

The chatbot now uses the backend team's shared RDS instance instead of
provisioning its own.  This file is kept as a reference in case a
standalone instance is ever needed again.

To restore: re-import RDSStack in app.py and pass vpc + lambda_sg from
NetworkStack.  Remove the rds.* fields from the environment YAMLs and
revert config_loader.py's _validate_shared_rds_config method.
"""

from aws_cdk import (
    Stack,
    Duration,
    RemovalPolicy,
    SecretValue,
    aws_ec2 as ec2,
    aws_rds as rds,
    aws_secretsmanager as secretsmanager,
    aws_logs as logs,
)
from constructs import Construct


class RDSStack(Stack):
    """
    RDS Stack - PostgreSQL with pgvector for RAG vector database

    DECOMMISSIONED: See module docstring above.
    """
    
    def __init__(
        self,
        scope: Construct,
        id: str,
        vpc: ec2.Vpc,
        lambda_sg: ec2.SecurityGroup,
        config: dict,
        **kwargs
    ):
        super().__init__(scope, id, **kwargs)
        
        env_name = config["env"]["name"]
        
        # Create security group for RDS
        self.db_security_group = ec2.SecurityGroup(
            self,
            "RDSSecurityGroup",
            vpc=vpc,
            description="Security group for PostgreSQL RDS with pgvector",
            allow_all_outbound=False
        )
        
        # Allow Lambda to access RDS
        self.db_security_group.add_ingress_rule(
            peer=lambda_sg,
            connection=ec2.Port.tcp(5432),
            description="Allow Lambda access to PostgreSQL"
        )
        
        # Create database credentials in Secrets Manager
        self.db_secret = secretsmanager.Secret(
            self,
            "DBSecret",
            secret_name=f"bispy-bot-db-credentials-{env_name}",
            description="PostgreSQL database credentials",
            generate_secret_string=secretsmanager.SecretStringGenerator(
                secret_string_template='{"username": "postgres"}',
                generate_string_key="password",
                exclude_punctuation=True,
                include_space=False,
                password_length=32
            )
        )
        
        # Parameter group for PostgreSQL optimized for vector operations
        # Note: Values are conservative for db.t3.micro (1GB RAM), for production, increasing these values will help

        # IMPORTANT: pgvector is not a preloaded library in RDS
        # It's installed as a SQL extension via: CREATE EXTENSION vector; (This is done automatically by scripts/init_database.py)
        parameter_group = rds.ParameterGroup(
            self,
            "DBParameterGroup",
            engine=rds.DatabaseInstanceEngine.postgres(
                version=rds.PostgresEngineVersion.VER_15
            ),
            description="PostgreSQL parameter group optimized for RAG workloads",
            parameters={
                # Performance tuning for vector operations
                "max_connections": "100",
                "work_mem": "4096",  
                "maintenance_work_mem": "65536", 
                "effective_cache_size": "524288",
                "shared_preload_libraries": "pg_stat_statements",
            }
        )
        
        # Subnet group for RDS (private subnets)
        subnet_group = rds.SubnetGroup(
            self,
            "DBSubnetGroup",
            description="Subnet group for PostgreSQL RDS",
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS
            ),
            removal_policy=RemovalPolicy.DESTROY
        )
        
        # Create RDS instance
        self.db_instance = rds.DatabaseInstance(
            self,
            "PostgresInstance",
            engine=rds.DatabaseInstanceEngine.postgres(
                version=rds.PostgresEngineVersion.VER_15
            ),
            
            # Instance configuration
            instance_type=ec2.InstanceType.of(
                ec2.InstanceClass.BURSTABLE3,
                ec2.InstanceSize.MICRO if env_name == "dev" else ec2.InstanceSize.SMALL
            ),
            
            # Credentials
            credentials=rds.Credentials.from_secret(self.db_secret),
            
            # Database name
            database_name="bispybot",
            
            # Network
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS
            ),
            security_groups=[self.db_security_group],
            subnet_group=subnet_group,
            publicly_accessible=False,
            
            # Storage
            allocated_storage=20,  # GB
            max_allocated_storage=100,  # Auto-scaling up to 100GB
            storage_type=rds.StorageType.GP3,
            storage_encrypted=True,
            
            # Backups
            backup_retention=Duration.days(7 if env_name == "prod" else 1),
            delete_automated_backups=env_name != "prod",
            preferred_backup_window="03:00-04:00",  # UTC
            
            # Maintenance
            preferred_maintenance_window="Mon:04:00-Mon:05:00",  # UTC
            auto_minor_version_upgrade=True,
            
            # Monitoring
            monitoring_interval=Duration.seconds(60),  # Enhanced monitoring
            enable_performance_insights=True,
            performance_insight_retention=rds.PerformanceInsightRetention.DEFAULT,  # 7 days
            cloudwatch_logs_exports=["postgresql", "upgrade"],  # Export logs
            cloudwatch_logs_retention=logs.RetentionDays.ONE_WEEK,
            
            # High availability (prod only)
            multi_az=env_name == "prod",
            
            # Parameter group
            parameter_group=parameter_group,
            
            # Deletion protection
            deletion_protection=env_name == "prod",
            removal_policy=RemovalPolicy.SNAPSHOT if env_name == "prod" else RemovalPolicy.DESTROY
        )
        
        # Grant Lambda access to database secret
        # This will be done when creating Lambda, but expose for other stacks
        self.db_secret_arn = self.db_secret.secret_arn
        
        # Output database information
        from aws_cdk import CfnOutput
        
        CfnOutput(
            self,
            "DBEndpoint",
            value=self.db_instance.db_instance_endpoint_address,
            description="PostgreSQL endpoint address",
            export_name=f"DBEndpoint-{env_name}"
        )
        
        CfnOutput(
            self,
            "DBPort",
            value=str(self.db_instance.db_instance_endpoint_port),
            description="PostgreSQL port",
            export_name=f"DBPort-{env_name}"
        )
        
        CfnOutput(
            self,
            "DBName",
            value="bispybot",
            description="Database name",
            export_name=f"DBName-{env_name}"
        )
        
        CfnOutput(
            self,
            "DBSecretArn",
            value=self.db_secret.secret_arn,
            description="ARN of database credentials secret",
            export_name=f"DBSecretArn-{env_name}"
        )
        
        CfnOutput(
            self,
            "DBSecurityGroupId",
            value=self.db_security_group.security_group_id,
            description="Security group ID for database",
            export_name=f"DBSecurityGroupId-{env_name}"
        )
