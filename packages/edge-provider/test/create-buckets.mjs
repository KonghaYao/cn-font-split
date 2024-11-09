import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3'
import 'dotenv/config'
const env = () => process.env
let c = undefined
const OSS = new S3Client({
    region: env(c).S3_REGION,
    forcePathStyle: true,
    endpoint: env(c).S3_ENDPOINT,
    credentials: {
        accessKeyId: env(c).S3_AK,
        secretAccessKey: env(c).S3_SK,
    },
});
OSS.send(new CreateBucketCommand({
    Bucket: 'origin-font',
}))
OSS.send(new CreateBucketCommand({
    Bucket: 'result-font',
    ACL: "public-read",
}))