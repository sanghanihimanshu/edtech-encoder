import { s3Client } from './src/config/s3Config.js';
import { DownloadVideo, ffnpegProcess as ffmpegProcess } from './src/moduls/encoding.js';
import { uploadFile } from './src/moduls/uplodefiles.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Worker } from 'bullmq';
const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

//ioredis
const connection ={
    host: process.env.RADIS_HOST,
    port: process.env.PORT,
};

// Function to delete files
const deleteFiles = async (key) => {
    try {
        // Delete main video file asynchronously
        await fs.promises.unlink(`E:/node/fantastic/encoder/video/${key}.mp4`);
        console.log(`Main video file ${key}.mp4 removed successfully.`);
        
        // Delete output files asynchronously
        const files = await fs.promises.readdir('output_dash');
        const deletionPromises = files.map(async (path) => {
            try {
                await fs.promises.unlink(`output_dash/${path}`);
                console.log(`Output file ${path} removed successfully.`);
            } catch (error) {
                console.error(`Error removing output file ${path}:`, error);
            }
        });
        await Promise.all(deletionPromises);
    } catch (error) {
        console.error("Error deleting files:", error);
    }
};


try {
    const myWorker = new Worker(process.env.QUEUE_NAME, async (job) => {
        console.log(job.data);
        try {
            // Download video
            await DownloadVideo("E:/node/fantastic/encoder/video/", s3Client, `${job.data.key}.mp4`);

            // Process video
            await ffmpegProcess(`E:/node/fantastic/encoder/video/${job.data.key}.mp4`, "E:/node/fantastic/encoder/output_dash/output.mpd").then(()=>{

            });
            // Upload files
            const files = fs.readdirSync('output_dash');
            const uploadPromises = files.map(file => {
                return uploadFile(file, job.data.key);
            });
            await Promise.all(uploadPromises);

            // Delete files after encoding and uploading
            await deleteFiles(job.data.key);
            console.clear()

        } catch (error) {
            console.error("Error processing job:", error);
        }
    }, { connection: connection });
} catch (error) {
    console.error("Error creating worker:", error);
}
