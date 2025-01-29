const express = require('express');
const multer = require('multer');
const controller = require('../controllers/general-controller');

const parseFile = multer({
  storage: multer.memoryStorage(),
});

const router = express.Router();

router.post('/api/v1/import-data-to-database', controller.importDataToDatabase);
router.post('/api/v1/create-embeddings', controller.createEmbeddings);
router.post('/api/v1/search-products', parseFile.single('file'), controller.searchProducts);

module.exports = router;
