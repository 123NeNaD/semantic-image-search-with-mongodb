const axios = require('axios');
const Config = require('../config.js');
const Products = require('../models/product');
const fs = require('fs');
const aiplatform = require('@google-cloud/aiplatform');

const { PredictionServiceClient } = aiplatform.v1;

const predictionServiceClient = new PredictionServiceClient({
  apiEndpoint: 'us-central1-aiplatform.googleapis.com',
  credentials: {
    client_email: Config.google.client_email,
    private_key: Config.google.private_key,
  },
  projectId: Config.google.project_id,
});

exports.importDataToDatabase = async (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync('DATASET.json', 'utf8'));

    await Products.insertMany(data);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, error_code: 'import_data_to_database_1' });
  }
};

exports.createEmbeddings = async (req, res) => {
  try {
    const products = await Products.find({ 'image_embedding.0': { $exists: false } }, { image: 1 }).lean();
    const batchSize = 50; // Process 50 products in parallel (adjust as needed based on your system limits)
    const totalProducts = products.length;

    // Split products into batches
    const productBatches = [];
    for (let i = 0; i < totalProducts; i += batchSize) {
      productBatches.push(products.slice(i, i + batchSize));
    }

    let processed = 0;

    // Process each batch
    for (const batch of productBatches) {
      await Promise.all(
        batch.map(async (product) => {
          try {
            const imageResponse = await axios.get(product.image, { responseType: 'arraybuffer' });
            const imagePrompt = Buffer.from(imageResponse.data, 'binary').toString('base64');

            const prompt = {
              image: {
                bytesBase64Encoded: imagePrompt,
              },
            };

            const publisher = 'google';
            const model = 'multimodalembedding@001';

            const [response] = await predictionServiceClient.predict({
              endpoint: `projects/${Config.google.project_id}/locations/${Config.google.location}/publishers/${publisher}/models/${model}`,
              instances: [aiplatform.helpers.toValue(prompt)],
            });

            const { predictions } = response;

            const imageEmbedding = predictions[0].structValue.fields.imageEmbedding.listValue.values.map(
              (item) => item.numberValue
            );

            await Products.updateOne({ _id: product._id }, { image_embedding: imageEmbedding });

            processed++;
            console.log(`Processed ${processed} of ${totalProducts} products.`);
          } catch (error) {
            console.error(`Error processing product ${product._id}:`, error.message);
          }
        })
      );
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, error_code: 'create_embeddings_1' });
  }
};

exports.searchProducts = async (req, res) => {
  const { textQuery } = req.body;
  const { file } = req;

  if (!textQuery && !file) {
    return res.status(400).json({ success: false, error_code: 'search_products_1' });
  }

  try {
    const prompt = {};

    if (textQuery) {
      prompt.text = textQuery;
    } else {
      prompt.image = {
        bytesBase64Encoded: file.buffer.toString('base64'),
      };
    }

    const publisher = 'google';
    const model = 'multimodalembedding@001';

    const [response] = await predictionServiceClient.predict({
      endpoint: `projects/${Config.google.project_id}/locations/${Config.google.location}/publishers/${publisher}/models/${model}`,
      instances: [aiplatform.helpers.toValue(prompt)],
    });

    const { predictions } = response;

    let searchEmbedding;

    if (textQuery) {
      searchEmbedding = predictions[0].structValue.fields.textEmbedding.listValue.values.map(
        (item) => item.numberValue
      );
    } else {
      searchEmbedding = predictions[0].structValue.fields.imageEmbedding.listValue.values.map(
        (item) => item.numberValue
      );
    }

    const products = await Products.aggregate([
      {
        $vectorSearch: {
          exact: false,
          index: 'vector_index',
          limit: 15,
          path: 'image_embedding',
          numCandidates: 150,
          queryVector: searchEmbedding,
        },
      },
      {
        $project: {
          name: 1,
          image: 1,
        },
      },
    ]);

    return res.status(200).json({ success: true, products });
  } catch (error) {
    console.log('Error: ', error);
    return res.status(500).json({ success: false, error_code: 'search_products_2' });
  }
};
