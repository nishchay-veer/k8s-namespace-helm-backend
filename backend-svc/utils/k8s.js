
const k8s = require('@kubernetes/client-node');

const kc = new k8s.KubeConfig();
kc.loadFromFile(process.env.KUBECONFIG_PATH);
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
const cron = require('node-cron');
const logsIndex = new Map();
const MAX_LOGS = 100;
const { v4: uuidv4 } = require('uuid');
const createnamespace = async (namespaceName) => {

  const namespaceObject = {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: {
      name: namespaceName,
    },
  };

  let createNamespaceRes;

  try {
    createNamespaceRes = await k8sApi.createNamespace(namespaceObject);
    console.log('New namespace created: ', createNamespaceRes.body);

  } catch (err) {
    console.error(err);
  }

  return createNamespaceRes.body.metadata.name;
};



const checkHealth = async (namespace, appName) => {
  const podList = await k8sApi.listNamespacedPod(namespace, undefined, undefined, undefined, undefined, `app=${appName}`);
  const podName = podList.body.items[0].metadata.name;
  const containerName = podList.body.items[0].spec.containers[0].name;

  const response = await k8sApi.readNamespacedPodStatus(podName, namespace);
  const containerStatus = response.body.status.containerStatuses.find(status => status.name === containerName);

  const healthStatus = {
    status: containerStatus.ready ? 'Healthy' : 'Unhealthy',
    restartCount: containerStatus.restartCount,
  };

  return healthStatus;
};


const fetchLogs = async (namespace, appName) => {
  try {
    const podName = await getPodName(namespace, appName);
    const logs = await k8sApi.readNamespacedPodLog(podName, namespace);
    const logId = uuidv4();
    logsIndex.set(logId, logs.body);


    // Handle log eviction if max limit is reached
    if (logsIndex.size > MAX_LOGS) {
      const firstKey = logsIndex.keys().next().value;
      logsIndex.delete(firstKey);
    }

    return { logId, logs: logs.body };
  } catch (err) {
    console.error(`Error fetching logs for pod ${podName}: ${err}`);
    throw err;
  }

};

const getPodName = async (namespace, appName) => {
  const podList = await k8sApi.listNamespacedPod(namespace);
  const podName = podList.body.items[0].metadata.name;
  return podName;
};

// Schedule a job to run every day at midnight
cron.schedule('0 0 * * *', () => {
  const now = new Date();
  const maxAge = 7 * 24 * 60 * 60 * 1000;

  // Iterate over all log entries and delete entries older than 7 days
  for (const [key, value] of logsIndex.entries()) {
    const logDate = new Date(key);
    if (now - logDate > maxAge) {
      logsIndex.delete(key);
    }
  }
}, {
  scheduled: true,
  timezone: "Asia/Kolkata"
});

module.exports = { createnamespace, checkHealth, fetchLogs , logsIndex};
