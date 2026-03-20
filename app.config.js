const appJson = require('./app.json');

module.exports = {
  ...appJson.expo,
  extra: {
    openaiApiKey: process.env.OPENAI_API_KEY ?? null,
    geminiApiKey: process.env.GEMINI_API_KEY ?? null,
    appMode: process.env.APP_MODE ?? null,
  },
};
