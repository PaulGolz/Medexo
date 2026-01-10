const express = require("express")
const app = express()
const cors = require("cors");
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

app.use(express.json({ limit: "100mb" }))

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: '*',
  exposedHeaders: [
    'Location',
    'Content-Type',
    'Content-Description',
    'Content-Disposition',
    'Expires',
    'Cache-Control',
    'Pragma',
    'Content-Length',
    'Content-Range',
    'Max-Parts',
    'File-Part',
    'Temp-Name'
  ],
  credentials: true,
}))

// Routes
const userRoute = require("./service/routes/user")
app.use("/v1/users", userRoute)

// 404 Handler (nach allen Routes)
app.use(notFoundHandler);

// Error Handler (muss als letztes Middleware sein)
app.use(errorHandler);

app.listen(3000, () => {
  console.log("Backend running on Port " + 3000);
});