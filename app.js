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


const getSummarizedText = async (text) => {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/Falconsai/text_summarization",
      {
        headers: { Authorization: "Bearer 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" },
        method: "POST",
        body: JSON.stringify(text),
      }
    );
    const result = await response.json();
    return result;
  }


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

app.get('/transcribe', (req, res) => {
  const youtubeUrl = req.query.youtubeUrl;
  if (!youtubeUrl) {
    return res.status(400).json({ error: 'Missing youtubeUrl in the request query parameters' });
  }

  downloadYouTubeVideo(youtubeUrl, (filePath) => {
    if (!filePath) {
      return res.status(500).json({ error: 'Failed to download the YouTube video' });
    }

    const formData = new FormData();
    formData.append("model", model);
    formData.append("file", fs.createReadStream(filePath));

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Make the transcription request
    axios.post("https://api.openai.com/v1/audio/transcriptions", formData, {
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
    })
      .then((response) => {
        const transcriptionData = response.data;
        const transcription = response.data.text;
        let data = [];
        transcription.split(" ").forEach((element, index) => {
          setTimeout(() => {
            console.log(element);
            data.push(element);
            res.write(`"data": ${element}\n`);
          }, Math.random() * (1000 - 500) + 500); // Random delay between 0.5 seconds and 1 second
        }); 
        res.end();   
            
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: 'Failed to transcribe audio' });
      });
  });
});

app.post('/summarize',(req , res) => {

  const text = req.body.text;
console.log(text);
  getSummarizedText(text).then((result) => {
    res.send(result);
  }).catch((err) => {
    console.log(err);
  }
  )
})

app.get('/', (req, res) => {
  res.send('Hello World!');
});

module.exports = app;
