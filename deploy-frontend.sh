#!/bin/bash

BUCKET="terrasure-frontend-site"
SOURCE_DIR="./frontend"

echo "Uploading frontend files to S3..."
aws s3 sync $SOURCE_DIR s3://$BUCKET --acl public-read

echo "Invalidating CloudFront cache..."
CF_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[0].DomainName=='$BUCKET.s3-website-us-east-1.amazonaws.com'].Id" --output text)
aws cloudfront create-invalidation --distribution-id $CF_ID --paths "/*"

echo "✅ Frontend deployed and cache invalidated."
