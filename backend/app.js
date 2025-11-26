require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { handleChat } = require('./controllers/chat-controller.js');
const { handleGetCourses } = require('./controllers/course-controller.js');
const { handleGetLearnPath } = require('./controllers/learnpath-controller.js');
const { handleGetTutorials } = require("./controllers/tutorials-controller.js");
const { handleData } = require("./controllers/data-controller.js");

const app = express();

app.use(cors());
app.use(express.json());

// Routes Fetching Api dengan Endpoint masing-masing
app.get("/courses", handleGetCourses);
app.get("/learning_paths", handleGetLearnPath);
app.get("/tutorials", handleGetTutorials);
app.get("/data", handleData); // main data


app.post("/chat", handleChat);

// Untuk ngecek endpoint
app.get("/", (req, res) => {
  res.json({ message: "API is running" })
});

// Error handlingnya
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({ error: "Something went error" });
})

// Starting server
const port = 3000; // Kedepannya bisa pake port laen selain 3000, kali
app.listen(port, () => console.log(`Running server at: ${port}`));



