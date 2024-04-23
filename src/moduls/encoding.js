import { GetObjectCommand } from "@aws-sdk/client-s3";
import { config } from "dotenv";
import ffmpegPath from "ffmpeg-static";
import Ffmpeg from "fluent-ffmpeg";

import fs from 'fs';
config();

//loading path
Ffmpeg.setFfmpegPath(ffmpegPath)
//encoding options
const scaleOptions = [
    "scale=1280:720",
    "scale=640:320",
    "scale=1920:1080",
    "scale=854:480",
]; // Adding additional scale options
const videoCodec = "libx264";
const x2640ptions = "keyint=24:min-keyint=24:no-scenecut";
const videoBitrates = ["500k", "1000k", "2000k", "4000k"];

//process
const DownloadVideo = async (filePath, s3Client, key) => {
    try {
        if (!fs.existsSync(filePath + key)) {
            const Download = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key,
            };
            const command = new GetObjectCommand(Download);
            const { Body } = await s3Client.send(command);
            const writer = fs.createWriteStream(filePath + key);
            Body.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on('finish', async () => {
                    console.log('File saved successfully!');
                    // Call processing function after download completes
                    await ffnpegProcess(filePath + key, "output_dash/output.mpd");
                    resolve();
                });
                writer.on('error', reject);
            });
        } else {
            console.log("file already available")
            // If file already exists, start processing immediately
            await ffnpegProcess(filePath + key, "output_dash/output.mpd");
        }
    } catch (error) {
        console.error("Error:", error);
    }
}


const ffnpegProcess = async (inputPath, outputPath) => {
    try {
        if (!fs.existsSync(outputPath)) {
            await new Promise((resolve, reject) => {
                Ffmpeg()
                    .input(inputPath)
                    .videoFilters(scaleOptions)
                    .videoCodec(videoCodec)
                    .addOption('-x264opts', x2640ptions)
                    .outputOption('-b:v', videoBitrates[0])
                    .format('dash')
                    .output(outputPath)
                    .on('end', () => {
                        console.log('Conversion complete');
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error('Error:', err);
                        reject(err);
                    })
                    .run();
            });
            await new Promise((resolve, reject) => {
                Ffmpeg()
                    .input(inputPath)
                    .noVideo() // Disable video stream
                    .audioCodec('libmp3lame') // Set audio codec to MP3
                    .output("output_dash/output_audio.mp3")
                    .on('end', () => {
                        console.log('Audio extraction complete');
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error('Error:', err);
                        reject(err);
                    })
                    .run();
            });
            console.log("All processing complete");
        } else {
            console.log("File already converted");
        }
    } catch (error) {
        console.error("Error during processing:", error);
    }
}

export { ffnpegProcess, DownloadVideo };
