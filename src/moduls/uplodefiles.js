import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../config/s3Config.js";
import fs from "fs";
export async function uploadFile(fileName, key) {
    const filePath = `output_dash/${fileName}`; // Assuming the file is in the output_dash directory

    // Prepare parameters for S3 upload
    const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME_FINAL,
        Key: `${key}/${fileName}`, // Assuming you want to organize files under a specific key
        Body: fs.createReadStream(filePath), // Readable stream of the file
    };

    // Upload file to S3
    try {
        const data = await s3Client.send(new PutObjectCommand(uploadParams));
        console.log(`File uploaded successfully: ${data}`);
    } catch (error) {
        console.error(`Error uploading file ${fileName} to S3:`, error);
        throw error; // Rethrow the error for the caller to handle
    }
}
