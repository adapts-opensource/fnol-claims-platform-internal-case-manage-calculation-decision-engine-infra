# Welcome to your CDK TypeScript project

You should explore the contents of this project. It demonstrates a CDK app with an instance of a stack "fnolclaims_platform_iac"

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
#"fnolclaims_platform_iac"

# LambdaFromEcrStack Construct

## Overview

The `LambdaFromEcrStack` construct provides an AWS CDK implementation for creating a Lambda function that is deployed using an image stored in an Amazon Elastic Container Registry (ECR). This construct automates the configuration of the Lambda function, including IAM permissions for logging and optional access to read-only resources.It integrates with a deployment pipeline for continuous delivery, allowing you to update the Lambda function with new Docker images seamlessly.

## Prerequisites

Before using the `LambdaFromEcrStack` construct, ensure that:

- An Amazon ECR repository is created and contains the desired Docker image. The construct will reference this image during the Lambda function's initialization.

NpmAuthToken: Download NPM Auth Token from your adaptsai account. 
