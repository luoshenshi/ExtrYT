import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import ytdl from "ytdl-core";
import fs from "fs";
import { exec } from "child_process";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname.replace("Server", ""), "Public")));
app.use(bodyParser.json());

app.post("/download", async (req, res) => {
  const youtubeUrl = req.body.youtubeUrl;
  const roomSize = req.body.roomSize;
  const wetLevel = req.body.wetLevel;
  const dryLevel = req.body.dryLevel;
  const speed = req.body.speed;

  try {
    const videoInfo = await ytdl.getInfo(youtubeUrl);

    const format = videoInfo.formats.find(
      (format) =>
        format.mimeType === 'video/mp4; codecs="avc1.42001E, mp4a.40.2"'
    );

    const videoPath = path.join(
      __dirname.replace("Server", ""),
      "Cache",
      "video.mp4"
    );

    const output = fs.createWriteStream(videoPath);

    ytdl
      .downloadFromInfo(videoInfo, { format: format })
      .pipe(output)
      .on("finish", () => {
        exec(
          `python ./Python/slowAndReverb.py ${videoPath} ${speed} ${roomSize} ${dryLevel} ${wetLevel} ./Out/output.wav`,
          (error, stdout, stderr) => {
            if (error) {
              console.error(`exec error: ${error}`);
              res.status(500).send("Error processing video");
              return;
            }
            const audioFilePath = path.join(
              __dirname.replace("Server", ""),
              "Out",
              "output.wav"
            );
            console.log(audioFilePath);

            res.setHeader(
              "Content-Disposition",
              "attachment; filename=output.wav"
            );
            res.setHeader("Content-Type", "audio/wav");

            res.sendFile(audioFilePath, (err) => {
              if (err) {
                console.error(err);
                res.status(500).send("Error sending file");
              } else {
                console.log("File sent for download");
              }
            });
          }
        );
      })
      .on("error", (err) => {
        console.error(err);
        res.status(500).send("Error downloading video");
      });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error processing request");
  }
});

app.get("/videoInfo", (req, res) => {
  const videoUrl = req.query.url;
  ytdl.getInfo(videoUrl).then((info) => {
    res.json(info.videoDetails);
  });
});

app.listen(3000, () => {
  console.log("Listening on http://localhost:3000");
});
