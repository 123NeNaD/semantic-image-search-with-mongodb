const { Schema, model } = require('mongoose');

const productSchema = new Schema({
  name: { type: String },
  usage: { type: String },
  year: { type: Number },
  season: { type: String },
  base_colour: { type: String },
  article_type: { type: String },
  sub_category: { type: String },
  master_category: { type: String },
  gender: { type: String },
  image: { type: String },
  image_embedding: { type: [Number] },
});

const Products = model('Products', productSchema);

module.exports = Products;
