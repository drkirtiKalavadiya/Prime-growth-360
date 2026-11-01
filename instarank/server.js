import { config } from './src/config.js';
import { createApp } from './src/app.js';

const { server, store } = createApp({ config });

server.listen(config.port, () => {
  console.log(`InstaRank running on http://localhost:${config.port}`);
  console.log(`AI captions: ${config.anthropicKey ? `on (${config.claudeModel})` : 'off (set ANTHROPIC_API_KEY to enable)'}`);
});

const shutdown = () => { store.flush(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
