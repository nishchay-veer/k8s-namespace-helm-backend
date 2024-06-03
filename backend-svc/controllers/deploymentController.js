const Deployment = require('../models/deployment');
const { createnamespace, fetchLogs } = require('../utils/k8s');
const { installAndCheckHelmAppHealth, deleteChart} = require('../utils/helm');


exports.createDeployment = async (req, res) => {
  try {
    const { namespace, appName } = req.body;

    if (!namespace || !appName) {
      return res.status(400).json({ error: 'Invalid data' });
    }

    const k8sNamespace = await createnamespace(namespace);

    const helmChart = 'bitnami/postgresql';
    const helmRelease = `${appName}-release`;
    const helmValues = {};

    await installAndCheckHelmAppHealth(k8sNamespace, helmChart, helmRelease, helmValues);
    return res.status(200).json({ message: 'Deployment successful'});
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getDeployments = async (req, res) => {
  try {
    const deployments = await Deployment.find();
    return res.status(200).json({ deployments });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getDeploymentLogs = async (req, res) => {
  try {
    const deployment = await Deployment.findById(req.params.id);
    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    const logs = await fetchLogs(deployment.namespace, deployment.appName);

    return res.status(200).json({ logs });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteDeployment = async (req, res) => {
  try {
    const deployment = await Deployment.findById(req.params.id);
    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    const deletion = await deleteChart(deployment.appName, deployment.namespace);
    console.log('Helm Chart deletion response', deletion);
    await deployment.delete();

    return res.status(200).json({ message: 'Deletion successful' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

