#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ServiceStack } from '../lib/stack';

const app = new cdk.App();
new ServiceStack(app, 'fnolclaims_platform_iac',{
    env: {
        account: '123456789012',
        region: 'us-east-1',      
    },
});