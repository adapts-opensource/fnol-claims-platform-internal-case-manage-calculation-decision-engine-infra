import { Construct } from 'constructs';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

interface CDKPipelineConstructProps {
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  servicename: string;
  connectionArn: string;
  stackName: string;
  secretName?: string;
  npmRegistryURL?: string;
  secretArn?: string;
  npmAuthToken?: string;
}

export class CDKPipelineConstruct extends Construct {
  public readonly codepipeline: codepipeline.Pipeline;
  public readonly codeBuildProject: codebuild.PipelineProject;

  constructor(scope: Construct, id: string, props: CDKPipelineConstructProps) {
    super(scope, id);
    const sourceArtifact = new codepipeline.Artifact();
    const buildArtifact = new codepipeline.Artifact();
    const servicename = props.servicename;
    const connectionArn = props.connectionArn;
    const secretName = props.secretName;
    const secretArn = props.secretArn;
    const NPM_REGISTRY_URL = props.npmRegistryURL;
    const NPM_TOKEN = `$(aws secretsmanager get-secret-value --secret-id ${props.secretName} --query SecretString --output text)` || props.npmAuthToken;

    const sourceAction = new codepipeline_actions.CodeStarConnectionsSourceAction({
      actionName: `${servicename}_Source`,
      owner: props.githubOwner,
      repo: props.githubRepo,
      branch: props.githubBranch,
      connectionArn: connectionArn,
      output: sourceArtifact,
    });

    this.codeBuildProject = new codebuild.PipelineProject(this, `${servicename}BuildProject`, {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              nodejs: 22, // Adjust to a supported version if necessary
            },
            commands: [
              'echo Installing dependencies...',
              'apt-get update',
              'apt-get install -y curl',
              'apt-get install -y nodejs npm',
              'apt-get update && apt-get install -y jq',
              'npm install -g typescript',
              'npm install -g aws-cdk',
              `echo ${NPM_TOKEN}`,
              `echo "//${NPM_REGISTRY_URL}/:_authToken=${NPM_TOKEN}" > ~/.npmrc`,
              'npm install',
              'node -v', // Verify Node.js installation
              'npm -v', // Verify npm installation
            ],
          },
          pre_build: {
            commands: [
              'echo Running linting and tests...',
              'cdk synth',
              'cdk diff',
            ],
          },
          build: {
            commands: [
              'echo Building the project...',
              'ls -la',
              `cdk diff ${props.stackName}`,
              'npx',
            ],
          },
          post_build: {
            commands: [
              'echo Deploying to AWS...',
              `cdk deploy ${props.stackName} --require-approval never`,
            ],
          },
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        environmentVariables: {
          STAGE: { value: 'prod' },
          STACK_NAME: { value: props.stackName },
          SECRET_NAME: { value: secretName },
          NPM_REGISTRY_URL: { value: NPM_REGISTRY_URL },
          NPM_TOKEN: {value: NPM_TOKEN},
        },
      },
    });

    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: `${servicename}Build`,
      project: this.codeBuildProject,
      input: sourceArtifact,
      outputs: [buildArtifact],
    });

    this.codeBuildProject.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'cloudformation:DescribeStacks',
        'cloudformation:ListStackResources',
        'cloudformation:DescribeStackResources',
        'cloudformation:GetTemplate',
        'cloudformation:DescribeChangeSet',
        'cloudformation:DescribeStackEvents',
        'ssm:GetParameter',
        'sts:AssumeRole',
        'secretsmanager:GetSecretValue',
        'secretsmanager:DescribeSecret',
        'secretsmanager:ListSecretVersionIds',
        's3:ListBucket',
        's3:GetObject',
      ],
      resources: ['*', secretArn || '*'],
    }));

    this.codepipeline = new codepipeline.Pipeline(this, `${servicename}Pipeline`, {
      pipelineName: `${servicename}Pipeline`,
      stages: [
        { stageName: 'Source', actions: [sourceAction] },
        { stageName: 'Build', actions: [buildAction] },
      ],
    });

    if (secretArn) {
      const secret = secretsmanager.Secret.fromSecretCompleteArn(this, `Secret-${secretArn}`, secretArn);
      secret.grantRead(this.codeBuildProject);
    }
  }
}
