import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { CDKPipelineConstruct } from './constructs/cdkpipeline-construct';
import { CodePipeline } from 'aws-cdk-lib/aws-events-targets';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class CDKPipelinecdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const serviceName = "fnolclaims_platform_iac";
    const githubOwner = "github_owner";
    const githubRepo = "github_repo";
    const githubBranch = "main";
    const github_awsconnection_arn = "arn:aws:codestar-connections:us-east-1:123456789012:connection/12345678-1234-1234-1234-123456789012";
    const cross_aws_account_api_access = "false";
    const cross_aws_account = "123456789012";
    const tableName = "fnolclaims_platform_iac" + "ddbtable";
    const bucketName = "fnolclaims_platform_iac" + "s3bucket";
    const stackName = "fnolclaims_platform_iac" + "cdkstack";

    const secretArn = 'NPM_AUTH_TOKEN';

    const secret = secretsmanager.Secret.fromSecretCompleteArn(this, `Secret-${secretArn}`, 'arn:aws:secretsmanager:us-east-1:123');

    const cdkPipeline = new CDKPipelineConstruct(this, "pipeline", {
      connectionArn: `${github_awsconnection_arn}`,
      githubBranch: `${githubBranch}`,
      githubOwner: `${githubOwner}`,
      githubRepo: `${githubRepo}`,
      servicename: `${serviceName}`,
      stackName: `${stackName}`,
      npmRegistryURL: 'registry.npmjs.org',
      secretName: secret.secretName,
      secretArn: secret.secretArn
    });        
  }

}
