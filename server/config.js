module.exports = {
  server: {
    port: 3000,
  },
  mongo_db: {
    connection_string: process.env.MONGO_DB_CONNECTION_STRING,
  },
  google: {
    project_id: process.env.GOOGLE_PROJECT_ID,
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY,
    location: process.env.GOOGLE_LOCATION,
  },
};
