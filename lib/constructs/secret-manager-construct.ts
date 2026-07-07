import * as cdk from 'aws-cdk-lib/core';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';


export interface SecretManagerConstructProps {
    secrets: { [key: string]: string, secretName: string, secretDescription: string};
}

export class SecretManagerConstruct extends Construct {
    public readonly secretmanager: secretsmanager.Secret;
    constructor(scope: Construct, id: string, props: SecretManagerConstructProps) {
        super(scope, id);
        
        this.secretmanager = new secretsmanager.Secret(this, props.secrets.secretName, {
            generateSecretString: {
                secretStringTemplate: JSON.stringify(props.secrets),
                generateStringKey: 'dummy' // Needed, but not used in this case
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY // Optional: Remove the secret when the stack is deleted
        });        
        new cdk.CfnOutput(this, 'SecretArn', {value: this.secretmanager.secretArn});
        new cdk.CfnOutput(this, 'SecretName', {value: this.secretmanager.secretName});      
        // Additional logic (e.g., permissions, outputs) can be added here
    }
}
