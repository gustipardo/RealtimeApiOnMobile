const appJson = require('./app.json');

module.exports = {
  ...appJson.expo,
  extra: {
    openaiApiKey: process.env.OPENAI_API_KEY ?? null,
  },
};
