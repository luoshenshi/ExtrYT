const ytdl = require("@distube/ytdl-core");
const { default: axios } = require("axios");
const { json } = require("body-parser");
const { exec } = require("child_process");
const express = require("express");
const { createReadStream, unlink } = require("fs");
const path = require("path");

const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

let audioTitle;

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const port = 3000;

app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(json());

app.get("/", (req, res) => {
  res.render("index");
});

app.post("/getSuggestions", async (req, res) => {
  const query = req.body.query;
  if (!query) {
    return res.status(400).json({ error: "Missing 'query' in body" });
  }

  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(
      query
    )}`;

    const { data } = await axios.get(url);

    const suggestions = data[1];
    res.json({ suggestions });
  } catch (error) {
    console.error("Error fetching suggestions:", error.message);
    res.status(500).json({ error: "Error fetching suggestions" });
  }
});

app.post("/getVideos", async (req, res) => {
  const query = req.body.query;
  if (!query) return res.status(400).json({ error: "Missing 'query' in body" });

  res.setHeader("Content-Type", "application/x-ndjson");

  try {
    const url = `https://wwd.mp3juice.blog/search.php?q=${encodeURIComponent(
      query
    )}`;
    const { data } = await axios.get(url);
    const items = data.items || [];

    for (const item of items) {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${item.id}`;
    const video = await ytdl.getBasicInfo(videoUrl);

    const payload = {
      title: item.title,
      duration: item.duration,
      size: item.size,
      channelName: item.channelTitle,
      thumbnail: video.videoDetails.thumbnails.at(-1).url,
      videoUrl,
      videoId: item.id,
    };

    res.write(JSON.stringify(payload) + "\n");

    await sleep(1000); // wait 1s before next request
  } catch (err) {
    console.warn(`Failed to fetch video info for ${item.id}:`, err.message);
  }
}

    res.end();
  } catch (error) {
    console.error("Error fetching videos:", error.message);
    res.status(500).end();
  }
});

app.get("/download", (req, res) => {
  const { videoId, title } = req.query;

  audioTitle = title;

  res.render("main", {
    videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
    videoId,
    title,
  });
});

app.post("/download", (req, res) => {
  const videoUrl = req.body.videoUrl;
  if (!videoUrl)
    return res.status(400).json({ error: "Missing 'videoUrl' in body" });
  downloadMp3(videoUrl).then(() => {
    res.sendStatus(202);
  });
});

app.post("/applyFilters", (req, res) => {
  const speed = req.body.speed;
  const roomSize = req.body.roomSize;
  const damping = req.body.damping;
  const wetLevel = req.body.wetLevel;
  const dryLevel = req.body.dryLevel;
  const width = req.body.width;

  const audioFilePath = path.join(__dirname + "/cache", "audio.mp3");
  const final_output_path =
    path.dirname(__dirname) + "/output/final_output.wav";
  const final_output_path_mp3 =
    path.dirname(__dirname) + "/output/final_output.mp3";
  exec(
    `python ./Python/main.py ${audioFilePath} ${speed} ${roomSize} ${damping} ${wetLevel} ${dryLevel} ${width}`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing script: ${error.message}`);
        return res.status(500).json({ error: "Error processing audio" });
      }
      if (stderr) {
        console.error(`Script stderr: ${stderr}`);
      }
      console.log(`Script stdout: ${stdout}`);

      res.setHeader("Content-Disposition", "attachment; filename=output.mp3");
      res.setHeader("Content-Type", "audio/mpeg");

      ffmpeg(createReadStream(final_output_path))
        .audioBitrate(128)
        .format("mp3")
        .save(final_output_path_mp3)
        .on("progress", (p) => {
          console.log(`Processing: ${p.targetSize} KB done`);
        })
        .on("end", () => {
          res.sendFile(final_output_path_mp3, async (err) => {
            if (err) {
              console.error("Error sending file:", err);
              res.status(500).end();
            } else {
              console.log("File sent successfully");

              unlink(audioFilePath, (err) => {
                if (err) console.error("Error deleting audio file:", err);
              });
              unlink(final_output_path, (err) => {
                if (err) console.error("Error deleting wav file:", err);
              });
              unlink(final_output_path_mp3, (err) => {
                if (err) console.error("Error deleting mp3 file:", err);
              });
            }
          });
        })
        .on("error", (err) => {
          console.log("An error occurred: " + err.message);
        });
    }
  );
});

function downloadMp3(videoUrl) {
  return new Promise((resolve, reject) => {
    ffmpeg(ytdl(videoUrl, { quality: "highestaudio" }))
      .audioBitrate(128)
      .format("mp3")
      .save(__dirname + "/cache/audio.mp3")
      .on("progress", (p) => {
        console.log(`Processing: ${p.targetSize} KB done`);
      })
      .on("end", () => {
        resolve();
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
