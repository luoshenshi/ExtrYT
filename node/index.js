const ytdl = require("@distube/ytdl-core");
const { default: axios } = require("axios");
const { json } = require("body-parser");
const { exec } = require("child_process");
const express = require("express");
const { createReadStream, unlink } = require("fs");
const path = require("path");

const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

const suggestionsCache = new Map();
const videosCache = new Map();

let rateLimit429Count = 0;

async function axiosGetWithRetry(url, opts = {}) {
  const maxAttempts = opts.maxAttempts || 4;
  const baseDelay = opts.baseDelay || 300;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.get(url, opts.axiosConfig || {});
      return response;
    } catch (err) {
      const status = err && err.response && err.response.status;

      if (status && status !== 429 && status >= 400 && status < 500) {
        throw err;
      }

      if (status === 429) {
        rateLimit429Count++;
        console.warn(`Received 429 from ${url} (attempt ${attempt})`);
      }

      if (attempt === maxAttempts) throw err;

      const jitter = Math.floor(Math.random() * 100);
      const delay = Math.pow(2, attempt - 1) * baseDelay + jitter;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const port = process.env.PORT || 3000;

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
    const cacheKey = `s:${query}`;
    const cached = suggestionsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({ suggestions: cached.value });
    }

    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(
      query
    )}`;

    const { data } = await axiosGetWithRetry(url, { maxAttempts: 3 });
    const suggestions = (data && data[1]) || [];

    suggestionsCache.set(cacheKey, {
      value: suggestions,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    res.json({ suggestions });
  } catch (error) {
    console.error(
      "Error fetching suggestions:",
      error && error.message ? error.message : error
    );
    const status = error && error.response && error.response.status;
    if (status === 429) {
      const retryAfter =
        error.response.headers && error.response.headers["retry-after"];
      if (retryAfter) res.setHeader("Retry-After", retryAfter);
      return res
        .status(429)
        .json({ error: "Rate limited by upstream (429). Try again later." });
    }
    res.status(500).json({ error: "Error fetching suggestions" });
  }
});

app.post("/getVideos", async (req, res) => {
  const query = req.body.query;
  if (!query) return res.status(400).json({ error: "Missing 'query' in body" });

  res.setHeader("Content-Type", "application/x-ndjson");

  try {
    const cacheKey = `v:${query}`;
    const cached = videosCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      for (const p of cached.value) res.write(JSON.stringify(p) + "\n");
      return res.end();
    }

    const url = `https://wwd.mp3juice.blog/search.php?q=${encodeURIComponent(
      query
    )}`;
    const { data } = await axiosGetWithRetry(url, { maxAttempts: 4 });
    const items = (data && data.items) || [];

    const results = [];
    for (const item of items) {
      try {
        const videoId = item.id;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        const thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

        const payload = {
          title: item.title,
          duration: item.duration,
          size: item.size,
          channelName: item.channelTitle,
          thumbnail,
          videoUrl,
          videoId,
        };

        results.push(payload);
        res.write(JSON.stringify(payload) + "\n");
      } catch (err) {
        console.warn(
          `Failed to process item ${item && item.id}:`,
          err && err.message ? err.message : err
        );
      }
    }

    videosCache.set(cacheKey, {
      value: results,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    res.end();
  } catch (error) {
    console.error(
      "Error fetching videos:",
      error && error.message ? error.message : error
    );
    const status = error && error.response && error.response.status;
    if (status === 429) {
      const retryAfter =
        error.response.headers && error.response.headers["retry-after"];
      if (retryAfter) res.setHeader("Retry-After", retryAfter);
      return res.status(429).end();
    }
    res.status(500).end();
  }
});

app.get("/download", (req, res) => {
  const { videoId, title } = req.query;

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
    `python3 ./Python/main.py ${audioFilePath} ${speed} ${roomSize} ${damping} ${wetLevel} ${dryLevel} ${width}`,
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

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
  console.log(
    `Initial cache sizes - suggestions: ${suggestionsCache.size}, videos: ${videosCache.size}`
  );
});

app.get("/metrics", (req, res) => {
  res.json({
    rateLimit429Count,
    suggestionsCacheSize: suggestionsCache.size,
    videosCacheSize: videosCache.size,
  });
});
