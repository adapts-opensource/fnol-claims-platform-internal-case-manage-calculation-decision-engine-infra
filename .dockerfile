# Step 1: Choose a base image
FROM node:22

# Step 2: Set the working directory
WORKDIR /app

# Step 3: Copy package.json and package-lock.json
COPY package*.json ./

# Step 4: Install dependencies
RUN npm install

# Step 5: Copy the rest of the application code
COPY . .

# Step 6: Install AWS CDK globally
RUN npm install -g aws-cdk

# Step 7: Define the command to run your CDK app (optional)
# CMD ["cdk", "deploy"]