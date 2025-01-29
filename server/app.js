require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const compression = require('compression');
const mongoose = require('mongoose');
const glob = require('glob');
const path = require('path');
const Config = require('./config');
const generalRouter = require('./routers/general-router');

mongoose.connect(Config.mongo_db.connection_string).then(() => {
  console.log('Successfully connected to database.');

  const app = express();

  app.use(cors());
  app.use(compression());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Load all models before initializing the routers
  glob.sync('./models/**/*.js').forEach((file) => {
    require(path.resolve(file));
  });

  // Load routers
  app.use(generalRouter);

  // Catch 404 and forward to error handler
  app.use((req, res) => {
    return res.status(404).json({ success: false, error_code: 'endpoint_not_found_1' });
  });

  // Error handler
  app.use((error, req, res, next) => {
    return res.status(500).json({ success: false, error_code: 'error_1' });
  });

  const server = http.createServer(app);

  server.listen(Config.server.port, () => {
    console.log(`Server is listening on port ${server.address().port}`);
  });
});
