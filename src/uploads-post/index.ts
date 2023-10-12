import { APIGatewayProxyResult } from "aws-lambda";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";

const bucketName = process.env["BUCKET_NAME"];
if (!bucketName) {
    throw new Error("Bucket name not set");
}

// Aws api gateway handler
export const handler =
    async () // eslint-disable-next-line @typescript-eslint/require-await
    : Promise<APIGatewayProxyResult> => {
        const uploadId = nanoid(30);
        const key = `${uploadId}/original`;
        const client = new S3Client();
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
        });
        const url = await getSignedUrl(client, command, { expiresIn: 300 });
        return {
            statusCode: 201,
            body: JSON.stringify({
                url,
                uploadId,
            }),
        };
    };
