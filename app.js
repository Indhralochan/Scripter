const express = require('express');
const app = express();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const bodyParser = require('body-parser');
require('dotenv').config();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const model = "whisper-1";
const cors = require('cors');
const ytdl = require("@distube/ytdl-core");

// Use bodyParser middleware to parse JSON in the request body
app.use(bodyParser.json());
app.use(cors());
// Function to download a YouTube video using ytdl-core
const downloadYouTubeVideo = (url, callback) => {
  const videoStream = ytdl(url, { quality: 'highestaudio' });

  const filePath = path.join(__dirname, 'downloads', 'video.mp3');

  // Create the 'downloads' directory if it doesn't exist
  if (!fs.existsSync(path.dirname(filePath))) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  const fileStream = fs.createWriteStream(filePath);

  videoStream.on('error', (error) => {
    console.error(`Error downloading video: ${error}`);
    callback(null);
  });

  videoStream.pipe(fileStream);

  fileStream.on('finish', () => {
    callback(filePath);
  });
};

app.post('/transcribe', (req, res) => {
  const youtubeUrl = req.body.youtubeUrl;
  if (!youtubeUrl) {
    return res.status(400).json({ error: 'Missing youtubeUrl in the request body' });
  }

  downloadYouTubeVideo(youtubeUrl, (filePath) => {
    if (!filePath) {
      return res.status(500).json({ error: 'Failed to download the YouTube video' });
    }

    const formData = new FormData();
    formData.append("model", model);
    formData.append("file", fs.createReadStream(filePath));

    axios.post("https://api.openai.com/v1/audio/transcriptions", formData, {
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
    })
      .then((response) => {
        const transcriptionData = response.data;
        console.log(transcriptionData) // Get the data from the response
        res.json(transcriptionData);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: 'Failed to transcribe audio' });
      });
  });
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

module.exports = app;
