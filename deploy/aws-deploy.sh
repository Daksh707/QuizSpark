#!/bin/bash

# QuizMaster AWS Deployment Script
# Supports deployment to AWS EC2 with RDS PostgreSQL and S3

set -e

# Configuration
APP_NAME="quizmaster"
REGION="us-east-1"
KEY_PAIR="your-key-pair-name"
SECURITY_GROUP="sg-xxxxxxxxx"
SUBNET_ID="subnet-xxxxxxxxx"
INSTANCE_TYPE="t3.small"
AMI_ID="ami-0c02fb55956c7d316" # Amazon Linux 2023

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting QuizMaster AWS Deployment${NC}"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo -e "${RED}❌ AWS CLI not configured. Please run 'aws configure'${NC}"
    exit 1
fi

# Create RDS PostgreSQL instance
echo -e "${YELLOW}📊 Creating RDS PostgreSQL instance...${NC}"
DB_INSTANCE_ID="$APP_NAME-db-$(date +%s)"
aws rds create-db-instance \
    --db-instance-identifier $DB_INSTANCE_ID \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 15.4 \
    --master-username postgres \
    --master-user-password $(openssl rand -base64 32) \
    --allocated-storage 20 \
    --storage-type gp2 \
    --vpc-security-group-ids $SECURITY_GROUP \
    --backup-retention-period 7 \
    --no-multi-az \
    --publicly-accessible \
    --storage-encrypted \
    --region $REGION

# Wait for RDS to be available
echo -e "${YELLOW}⏳ Waiting for RDS instance to become available...${NC}"
aws rds wait db-instance-available --db-instance-identifier $DB_INSTANCE_ID --region $REGION

# Get RDS endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier $DB_INSTANCE_ID \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text \
    --region $REGION)

echo -e "${GREEN}✅ RDS PostgreSQL instance created: $RDS_ENDPOINT${NC}"

# Create S3 bucket for file uploads
S3_BUCKET="$APP_NAME-uploads-$(date +%s)"
echo -e "${YELLOW}🗄️  Creating S3 bucket: $S3_BUCKET${NC}"
aws s3 mb s3://$S3_BUCKET --region $REGION
aws s3api put-bucket-versioning \
    --bucket $S3_BUCKET \
    --versioning-configuration Status=Enabled

# Create EC2 instance
echo -e "${YELLOW}🖥️  Creating EC2 instance...${NC}"
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --count 1 \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_PAIR \
    --security-group-ids $SECURITY_GROUP \
    --subnet-id $SUBNET_ID \
    --user-data file://user-data.sh \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$APP_NAME-app}]" \
    --query 'Instances[0].InstanceId' \
    --output text \
    --region $REGION)

echo -e "${GREEN}✅ EC2 instance created: $INSTANCE_ID${NC}"

# Wait for instance to be running
echo -e "${YELLOW}⏳ Waiting for EC2 instance to be running...${NC}"
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION

# Get instance public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text \
    --region $REGION)

echo -e "${GREEN}✅ EC2 instance running at: $PUBLIC_IP${NC}"

# Create deployment package
echo -e "${YELLOW}📦 Creating deployment package...${NC}"
tar -czf quizmaster-app.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=.env \
    --exclude=logs \
    --exclude=deploy \
    .

# Upload to S3 for deployment
aws s3 cp quizmaster-app.tar.gz s3://$S3_BUCKET/

# Create environment file for EC2
cat > .env.production << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://postgres:password@$RDS_ENDPOINT:5432/quizmaster
PGHOST=$RDS_ENDPOINT
PGPORT=5432
PGUSER=postgres
PGPASSWORD=password
PGDATABASE=quizmaster
SESSION_SECRET=$(openssl rand -base64 64)
S3_BUCKET_NAME=$S3_BUCKET
S3_REGION=$REGION
EOF

# Upload environment file
aws s3 cp .env.production s3://$S3_BUCKET/

# Output deployment information
echo -e "${GREEN}🎉 Deployment Summary:${NC}"
echo -e "Instance ID: $INSTANCE_ID"
echo -e "Public IP: $PUBLIC_IP"
echo -e "Database: $RDS_ENDPOINT"
echo -e "S3 Bucket: $S3_BUCKET"
echo -e ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo -e "1. SSH into your instance: ssh -i ~/.ssh/$KEY_PAIR.pem ec2-user@$PUBLIC_IP"
echo -e "2. The application will be automatically deployed via user-data script"
echo -e "3. Check application status: sudo systemctl status quizmaster"
echo -e "4. View logs: sudo journalctl -u quizmaster -f"
echo -e "5. Access application: http://$PUBLIC_IP:5000"
echo -e ""
echo -e "${GREEN}✅ AWS Deployment Complete!${NC}"

# Cleanup
rm -f quizmaster-app.tar.gz .env.production