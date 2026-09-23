import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { SecretManagerConstruct } from './constructs/secret-manager-construct';

export class SecretscdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const npmAuthToken = new SecretManagerConstruct(this, 'NPM_AUTH_TOKEN', {
        secrets: {
          apiKey: "SECRET_API_KEY",
          apiSecret: process.env.NPM_AUTH_TOKEN ?? '',
          secretDescription: "NPM AUTH TOKEN",
          secretName: "NPM_AUTH_TOKEN"          // ... other key-value pairs
        }
      });
  }
}
