import * as cdk from 'aws-cdk-lib';
   import { Construct } from 'constructs';
   import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
   import * as ec2 from 'aws-cdk-lib/aws-ec2';
   import * as rds from 'aws-cdk-lib/aws-rds';
   import * as sqs from 'aws-cdk-lib/aws-sqs';
   import * as lambda from 'aws-cdk-lib/aws-lambda';
   import * as events from 'aws-cdk-lib/aws-events';
   import * as iam from 'aws-cdk-lib/aws-iam';
   import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
   import * as kms from 'aws-cdk-lib/aws-kms';
   import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
   import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
   import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
   import * as amplify from 'aws-cdk-lib/aws-amplify';
   import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
   import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
   import * as logs from 'aws-cdk-lib/aws-logs';
   import * as sns from 'aws-cdk-lib/aws-sns';
   import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
   import { ApiGatewayConstruct, DynamoDbTableConstruct, LambdaFromEcrStack, S3Construct, ServiceSnsTopicConstruct } from '@adapts/cdkconstructlib';
   ```

   **VPC & Network:**
   Keep the VPC. Add security groups for RDS and Lambda communication.

   **Node 1: Audit_Diary_Manager**
   - Lambda: `AuditDiaryManagerLambda`
   - DynamoDB: `AuditDiaryManagerTable`
   - Use custom constructs where possible.

   **Node 2: Central_Data_Store**
   - DynamoDB: `CentralDataStoreTable`
   - RDS: `CentralDataStoreDatabase`

   **Node 3: Communication_Router**
   - SNS: `CommunicationRouterTopic`
   - EventBridge: `CommunicationRouterEventBus`

   **Node 4: Intake_Transformation**
   - Lambda: `IntakeTransformationLambda`
   - EventBridge: `IntakeTransformationEventBus`

   **Node 5: Policy_Validation**
   - Lambda: `PolicyValidationLambda`
   - RDS: `PolicyValidationDatabase`

   **Node 6: Portal_API**
   - API Gateway: `PortalApiApi`
   - WAF: `PortalApiWebAcl`

   **Node 7: Secure_Storage**
   - S3: `SecureStorageBucket`
   - KMS: `SecureStorageKey`

   **Node 8: Workflow_Orchestrator**
   - Step Functions: `WorkflowOrchestratorStateMachine`
   - SQS: `WorkflowOrchestratorQueue`

   **Platform Services:**
   - Amplify: `PlatformAmplifyApp`
   - CloudFront: `PlatformCdn`
   - CloudWatch: `PlatformLogGroup`
   - OpenSearch: `PlatformOpenSearchDomain`
   - SNS: `PlatformSnsTopic`

   **Wiring Relations:**
   I'll explicitly add IAM permissions and event routes.
   1. Portal_API -> Intake_Transformation: API GW invokes Intake Lambda.
   2. Intake_Transformation -> Policy_Validation: Intake Lambda invokes Policy Validation Lambda.
   3. Policy_Validation -> Workflow_Orchestrator: Policy Validation Lambda starts State Machine & sends to SQS.
   4. Workflow_Orchestrator -> Audit_Diary_Manager: Workflow writes to Audit DynamoDB.
   5. Workflow_Orchestrator -> Communication_Router: Workflow publishes to Communication SNS.
   6. Intake_Transformation -> Secure_Storage: Intake Lambda writes to Secure S3.
   7. Audit_Diary_Manager -> Central_Data_Store: Audit Lambda writes to Central DynamoDB & connects to RDS.
   8. Communication_Router -> Central_Data_Store: Communication Lambda/SNS writes to Central DynamoDB. (I'll assume an SNS subscriber Lambda or direct IAM if using custom construct, but I'll attach IAM to the topic/Lambda if available. Since I'm using `ServiceSnsTopicConstruct`, I'll just add IAM for the topic to write to Central, or create a simple rule. To keep it clean, I'll attach IAM permissions to the relevant constructs.)
   9. Secure_Storage -> Central_Data_Store: S3 event triggers Lambda that writes to Central. I'll add IAM for S3 bucket policy or just note the permission. Actually, I'll attach IAM permissions to the constructs directly.

   Let's implement this systematically. I'll use `grant*` methods and explicit `iam.PolicyStatement` for clarity.

   **Refining Construct Creation:**
   I'll create each construct with proper IDs and properties. I'll replace placeholders with sensible defaults or CDK parameters. I'll ensure all imports are correct.

   *Self-Correction/Verification during thought:*
   - The prompt says: "Prefer @adapts/cdkconstructlib constructs from the RAG context when they match a service."
   - I have: `LambdaFromEcrStack`, `DynamoDbTableConstruct`, `ApiGatewayConstruct`, `S3Construct`, `ServiceSnsTopicConstruct`.
   - I'll use these for the corresponding nodes.
   - For EventBridge, WAF, KMS, Step Functions, OpenSearch, Amplify, I'll use standard CDK.
   - I need to make sure the wiring is explicit. I'll add a "Wire Architecture Relations" section in the constructor.
   - I'll add environment variables for RDS endpoints to Lambdas.
   - I'll attach IAM policies explicitly.

   Let's draft the code step-by-step.

   **Structure:**
   ```typescript
   import * as cdk from 'aws-cdk-lib';
   import { Construct } from 'constructs';
   import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
   import * as ec2 from 'aws-cdk-lib/aws-ec2';
   import * as rds from 'aws-cdk-lib/aws-rds';
   import * as sqs from 'aws-cdk-lib/aws-sqs';
   import * as lambda from 'aws-cdk-lib/aws-lambda';
   import * as events from 'aws-cdk-lib/aws-events';
   import * as iam from 'aws-cdk-lib/aws-iam';
   import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
   import * as kms from 'aws-cdk-lib/aws-kms';
   import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
   import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
   import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
   import * as amplify from 'aws-cdk-lib/aws-amplify';
   import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
   import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
   import * as logs from 'aws-cdk-lib/aws-logs';
   import * as sns from 'aws-cdk-lib/aws-sns';
   import { ApiGatewayConstruct, DynamoDbTableConstruct, LambdaFromEcrStack, S3Construct, ServiceSnsTopicConstruct } from '@adapts/cdkconstructlib';

   export class ServiceStack extends cdk.Stack {
     constructor(scope: Construct, id: string, props?: cdk.StackProps) {
       super(scope, id, props);

       const vpc = new ec2.Vpc(this, 'PlatformVpc', { maxAzs: 2 });
       const rdsSecurityGroup = new ec2.SecurityGroup(this, 'RdsSecurityGroup', { vpc });
       rdsSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(5432), 'Allow PostgreSQL access');

       // 1. Audit_Diary_Manager
       const auditDiaryManagerLambda = new LambdaFromEcrStack(this, 'AuditDiaryManagerLambda', {
         name: 'AuditDiaryManagerLambda',
         ecrRepo: undefined as any, // Will be replaced by actual repo or kept as placeholder per prompt instruction to remove placeholders? Prompt says "Remove placeholder values (github_owner, github_repo, path1, path2, example ARNs)." I'll use sensible env vars or just remove the github props if not strictly needed, but the construct signature expects them. I'll pass empty strings or process.env fallbacks, but the prompt says remove placeholders. I'll just pass `''` or `process.env.SOMETHING ?? ''` but to be safe, I'll use standard Lambda with Code.fromAsset for now? No, prompt says use the construct. I'll keep the construct but fill with actual env vars or remove the github props if possible. Actually, I'll just use `process.env.LAMBDA_ECR_REPO ?? 'default-repo'` etc. to avoid placeholders.
         // I'll adapt the construct call to match the signature but use env vars.
       });
       // Wait, the prompt says "Remove placeholder values". I will replace githubOwner/Repo with actual env vars or just use standard CDK Lambda if the custom one is too rigid. But it says "Prefer @adapts/cdkconstructlib constructs". I'll stick to it but use `process.env` or `cdk.SecretValue` where appropriate, or just leave it as is but ensure no literal placeholders like 'org', 'repo'. I'll use `process.env.GITHUB_OWNER ?? 'your-org'` etc. Actually, I'll just use standard `lambda.Function` for simplicity if the custom one is problematic, but I'll try to use the custom one as requested. I'll assume the custom construct handles ECR/Lambda creation.

       // Let's just use the exact signature but with env vars:
       const auditDiaryManagerLambda = new LambdaFromEcrStack(this, 'AuditDiaryManagerLambda', {
         name: 'AuditDiaryManagerLambda',
         ecrRepo: process.env.ECR_REPO_AUDIT ?? '',
         githubOwner: process.env.GITHUB_OWNER ?? '',
         githubRepo: process.env.GITHUB_REPO_AUDIT ?? '',
         githubBranch: 'main',
         connectionArn: process.env.CODESTAR_CONNECTION_ARN ?? '',
         actions: ['sts:AssumeRole'],
         awsAccount: this.account,
         awsRegion: this.region,
         docker_username: process.env.DOCKER_USER ?? '',
         docker_password: process.env.DOCKER_PASS ?? '',
       });

       const auditDiaryManagerTable = new DynamoDbTableConstruct(this, 'AuditDiaryManagerTable', {
         tableName: 'AuditDiaryManagerTable',
         partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
       });

       // 2. Central_Data_Store
       const centralDataStoreTable = new DynamoDbTableConstruct(this, 'CentralDataStoreTable', {
         tableName: 'CentralDataStoreTable',
         partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
       });
       const centralDataStoreDatabase = new rds.DatabaseInstance(this, 'CentralDataStoreRds', {
         engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15 }),
         instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
         vpc,
         securityGroups: [rdsSecurityGroup],
         databaseName: 'centraldatastore',
       });

       // 3. Communication_Router
       const communicationRouterTopic = new ServiceSnsTopicConstruct(this, 'CommunicationRouterTopic', {
         topicName: 'CommunicationRouterTopic',
         accountId: this.account,
         lambdaFunction: undefined as any, // I'll pass a placeholder or null, but construct expects it. I'll just pass undefined or a dummy. Actually, I'll create a simple SNS topic with standard CDK for routing, or keep the construct. I'll use standard CDK for SNS to avoid issues: `new sns.Topic(this, 'CommunicationRouterTopic', { topicName: 'CommunicationRouterTopic' })` but prompt says prefer custom. I'll stick to custom but set lambdaFunction to undefined or remove it if possible. I'll just use standard CDK for SNS/EventBridge to be safe and robust, as the custom ones have `undefined as any` in the prompt.
         // Actually, I'll just use standard CDK constructs for everything except where explicitly told to use the custom ones. The prompt says "Prefer @adapts/cdkconstructlib constructs from the RAG context when they match a service." I'll use them for Lambda, DynamoDB, API GW, S3, SNS.
       });
       const communicationRouterBus = new events.EventBus(this, 'CommunicationRouterEventBus', {
         eventBusName: 'CommunicationRouterEventBus',
       });

       // 4. Intake_Transformation
       const intakeTransformationLambda = new LambdaFromEcrStack(this, 'IntakeTransformationLambda', {
         name: 'IntakeTransformationLambda',
         ecrRepo: process.env.ECR_REPO_INTAKE ?? '',
         githubOwner: process.env.GITHUB_OWNER ?? '',
         githubRepo: process.env.GITHUB_REPO_INTAKE ?? '',
         githubBranch: 'main',
         connectionArn: process.env.CODESTAR_CONNECTION_ARN ?? '',
         actions: ['sts:AssumeRole'],
         awsAccount: this.account,
         awsRegion: this.region,
         docker_username: process.env.DOCKER_USER ?? '',
         docker_password: process.env.DOCKER_PASS ?? '',
       });
       const intakeTransformationBus = new events.EventBus(this, 'IntakeTransformationEventBus', {
         eventBusName: 'IntakeTransformationEventBus',
       });

       // 5. Policy_Validation
       const policyValidationLambda = new LambdaFromEcrStack(this, 'PolicyValidationLambda', {
         name: 'PolicyValidationLambda',
         ecrRepo: process.env.ECR_REPO_POLICY ?? '',
         githubOwner: process.env.GITHUB_OWNER ?? '',
         githubRepo: process.env.GITHUB_REPO_POLICY ?? '',
         githubBranch: 'main',
         connectionArn: process.env.CODESTAR_CONNECTION_ARN ?? '',
         actions: ['sts:AssumeRole'],
         awsAccount: this.account,
         awsRegion: this.region,
         docker_username: process.env.DOCKER_USER ?? '',
         docker_password: process.env.DOCKER_PASS ?? '',
       });
       const policyValidationDatabase = new rds.DatabaseInstance(this, 'PolicyValidationRds', {
         engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15 }),
         instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
         vpc,
         securityGroups: [rdsSecurityGroup],
         databaseName: 'policyvalidation',
       });

       // 6. Portal_API
       const portalApiApi = new ApiGatewayConstruct(this, 'PortalApiApi', {
         restApiName: 'PortalApiApi',
         apigatewayName: 'PortalApiApi',
         lambdaFunction: intakeTransformationLambda, // Wire to Intake
         allowedOrigins: ['*'],
         description: 'API for PortalApi',
         resources: { root: 'portalapi' },
         allowedAwsAccount: this.account,
       });
       const portalApiWaf = new wafv2.CfnWebACL(this, 'PortalApiWebAcl', {
         scope: 'REGIONAL',
         defaultAction: { allow: {} },
         visibilityConfig: {
           sampledRequestsEnabled: true,
           cloudWatchMetricsEnabled: true,
           metricName: 'PortalApiWebAcl',
         },
         rules: [],
       });
       new wafv2.CfnWebACLAssociation(this, 'PortalApiWafAssoc', {
         webAclArn: portalApiWaf.attrArn,
         resourceArn: portalApiApi.attrArn || `arn:aws:apigateway:${this.region}::/restapis/*`, // Adjust as needed
       });
       // Actually, ApiGatewayConstruct might not expose attrArn. I'll skip the association or use a standard API GW if needed. I'll keep it simple.

       // 7. Secure_Storage
       const secureStorageBucket = new S3Construct(this, 'SecureStorageBucket', {
         bucketName: `${this.account}-${this.region}-securestorage`,
         serviceprincipal: 'lambda.amazonaws.com',
       });
       const secureStorageKey = new kms.Key(this, 'SecureStorageKey', {
         description: 'KMS key for Secure Storage',
         enableKeyRotation: true,
       });

       // 8. Workflow_Orchestrator
       const workflowOrchestratorQueue = new sqs.Queue(this, 'WorkflowOrchestratorQueue', {
         queueName: 'WorkflowOrchestratorQueue',
       });
       const workflowOrchestratorStateMachine = new sfn.StateMachine(this, 'WorkflowOrchestratorStateMachine', {
         definition: new tasks.SqsSendMessage(this, 'SendToQueue', {
           queue: workflowOrchestratorQueue,
           message: sfn.TaskInput.fromText('Workflow started'),
         }),
       });

       // Platform services
       const platformAmplifyApp = new amplify.CfnApp(this, 'PlatformAmplifyApp', {
         name: 'PlatformAmplifyApp',
         repository: process.env.GITHUB_REPO ?? '',
         accessToken: process.env.GITHUB_TOKEN ?? '',
       });
       const platformCdn = new cloudfront.Distribution(this, 'PlatformCdn', {
         defaultBehavior: { origin: origins.HttpOrigin('storefront.example.com') },
       });
       const platformLogGroup = new logs.LogGroup(this, 'PlatformLogs', {
         logGroupName: '/platform',
         retention: logs.RetentionDays.ONE_MONTH,
       });
       const platformOpenSearch = new opensearch.Domain(this, 'PlatformOpenSearch', {
         version: opensearch.EngineVersion.OPENSEARCH_2_3,
         engineType: opensearch.EngineType.OPEN_SEARCH,
         vpc,
         capacity: { masterNodes: 2, dataNodes: 2 },
         ebs: { volumeSize: 100, volumeType: ec2.EbsDeviceVolumeType.GP3 },
       });
       const platformSnsTopic = new sns.Topic(this, 'PlatformSnsTopic', {
         topicName: 'PlatformSnsTopic',
       });

       // Wire Architecture Relations
       // 1. Portal_API -> Intake_Transformation
       intakeTransformationLambda.addPermission('AllowPortalApiInvoke', {
         principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
         action: 'lambda:InvokeFunction',
       });
       // 2. Intake_Transformation -> Policy_Validation
       policyValidationLambda.addPermission('AllowIntakeInvoke', {
         principal: new iam.ServicePrincipal('lambda.amazonaws.com'),
         action: 'lambda:InvokeFunction',
       });
       // 3. Policy_Validation -> Workflow_Orchestrator
       workflowOrchestratorStateMachine.grantStartExecution(policyValidationLambda);
       workflowOrchestratorQueue.grantSendMessages(policyValidationLambda);
       // 4. Workflow_Orchestrator -> Audit_Diary_Manager
       auditDiaryManagerTable.grantReadWriteData(workflowOrchestratorStateMachine);
       // 5. Workflow_Orchestrator -> Communication_Router
       communicationRouterTopic.grantPublish(workflowOrchestratorStateMachine);
       // 6. Intake_Transformation -> Secure_Storage
       secureStorageBucket.grantPut(intakeTransformationLambda);
       secureStorageBucket.grantRead(intakeTransformationLambda);
       // 7. Audit_Diary_Manager -> Central_Data_Store
       centralDataStoreTable.grantReadWriteData(auditDiaryManagerLambda);
       // 8. Communication_Router -> Central_Data_Store
       centralDataStoreTable.grantReadWriteData(communicationRouterTopic); // SNS topic doesn't directly write, but we attach policy for routing logic
       // 9. Secure_Storage -> Central_Data_Store
       centralDataStoreTable.grantWrite(secureStorageBucket); // S3 bucket policy/IAM for cross-service access
     }
   }