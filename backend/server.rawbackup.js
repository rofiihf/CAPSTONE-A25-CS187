

// const http = require('http');
// const { handleChat } = require('./controllers/chatController.js');
// const { handleGetCourses } = require('./controllers/courseController.js');
// const { handleGetLearnPath } = require('./controllers/learnpathController.js');

// require("dotenv").config();

// const server = http.createServer((req, res) => {

//   if (req.method == 'GET' && (req.url === "/courses" || req.url === "/courses/")) {
//     handleGetCourses(req, res);
//     return;
//   } 
  
//   if (req.method == 'POST' && (req.url === "/chat" || req.url === "/chat/")) {
//     handleChat(req, res);
//     return;
//   }
  

//   // Fallback kalo error
//   res.writeHead(404, { "Content-Type": "application/json" });
//   res.end(JSON.stringify({ error: "Route not found" }));
// });

// server.listen(3000, () => {
//   console.log("Running at: 3000...");
// })

// GAK KEPAKE KARENA UDAH PAKE EXPRESS di app.js, jadi ini cuam backup.