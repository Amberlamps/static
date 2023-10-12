After installing cloudformation template there are more manual steps for the production deployment:

1. Create certificates in us-east-1 for uploads.example.com and static.example.com
2. Add static.example.com and certificate ARN to Cloudfront
3. Point uploads.example.com to api gateway in Route 53
4. Point static.example.com to Cloudfront in Route 53