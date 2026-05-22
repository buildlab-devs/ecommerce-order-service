const { createVercelHandler } = require('../src/lib/vercelHandler');
const app = require('../src/app');

module.exports = createVercelHandler(app);
