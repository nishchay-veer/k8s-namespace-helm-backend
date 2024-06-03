const mongoose = require('mongoose');

const deploymentSchema = new mongoose.Schema({
  namespace: { type: String, required: true },
  appName: { type: String, required: true },
  deployedAt: { type: Date, required: true },
  healthStatus: { type: String, required: true },
});

module.exports = mongoose.model('Deployment', deploymentSchema);
