const Helm = require("node-helm").Helm;
const k8s = require('@kubernetes/client-node');
const kc = new k8s.KubeConfig();
kc.loadFromFile('/media/nishchayv/New Volume1/scoutflo/backend-svc/config/kubeconfig.yaml');
const Deployment = require('../models/deployment');

const helm = new Helm({
  helmCommand: process.env.HELM_PATH,
  output: 'json'
});

async function installHelmChart(namespace, chartName, releaseName, values) {


  const options = {
    chartName: chartName,
    releaseName: releaseName,
    namespace: namespace,
    values: values
  };

  return new Promise((resolve, reject) => {
    helm.install(options, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}


async function checkHelmReleaseStatus(releaseName, namespaceName) {
  try {
    const k8sApi = kc.makeApiClient(k8s.AppsV1Api);
    const coreApi = kc.makeApiClient(k8s.CoreV1Api);

    let allPodsRunning = false;
    while (!allPodsRunning) {
      const podList = await coreApi.listNamespacedPod(namespaceName);

      allPodsRunning = podList.body.items.every((item) => item.status.phase === 'Running');

      if (!allPodsRunning) {
        console.log(`Waiting for all pods to be in 'Running' state for Helm release '${releaseName}' in namespace '${namespaceName}'`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log(`All pods are in 'Running' state for Helm release '${releaseName}' in namespace '${namespaceName}'`);

    const deploymentList = await k8sApi.listNamespacedDeployment(namespaceName);
    const replicaSetList = await k8sApi.listNamespacedReplicaSet(namespaceName);
    const serviceList = await coreApi.listNamespacedService(namespaceName);

    const deploymentStatus = deploymentList.body.items.map((item) => ({
      name: item.metadata.name,
      readyReplicas: item.status.availableReplicas,
      totalReplicas: item.status.replicas,
    }));

    const podList = await coreApi.listNamespacedPod(namespaceName); // Fetch pod list again
    const podStatus = podList.body.items.map((item) => ({
      name: item.metadata.name,
      phase: item.status.phase,
      conditions: item.status.conditions,
    }));

    const replicaSetStatus = replicaSetList.body.items.map((item) => ({
      name: item.metadata.name,
      readyReplicas: item.status.availableReplicas,
      totalReplicas: item.status.replicas,
    }));

    const serviceStatus = serviceList.body.items.map((item) => ({
      name: item.metadata.name,
      type: item.spec.type,
      clusterIP: item.spec.clusterIP,
      loadBalancer: item.status.loadBalancer,
    }));

    return {
      status: 'All resources are ready',
      deployments: deploymentStatus,
      pods: podStatus,
      replicaSets: replicaSetStatus,
      services: serviceStatus,
    };

  } catch (err) {
    console.error(`Error while checking Helm release status for release '${releaseName}' in namespace '${namespaceName}':`, err);
    throw err;
  }
}

exports.installAndCheckHelmAppHealth = async (namespaceName, chartName, releaseName, values) => {
  try {
    const installation = await installHelmChart(namespaceName, chartName, releaseName, values);
    console.log('Helm chart installed', installation);

    const helmHealth = await checkHelmReleaseStatus(releaseName, namespaceName);
    console.log('Helm health', helmHealth);

    const deployment = await Deployment.create({
      namespace: namespaceName,
      appName: releaseName,
      deployedAt: new Date(),
      healthStatus: JSON.stringify(helmHealth)
    });

    console.log(`Deployment created with ID ${deployment.id}`);
  } catch (err) {
    console.error(`Error while installing and checking Helm app health for release '${releaseName}' in namespace '${namespaceName}':`, err);
  }
};

exports.deleteChart = async (releaseName, namespace) => {

  const options = {
    releaseName: releaseName,
    namespace: namespace
  };

  return new Promise((resolve, reject) => {
    helm.uninstall(options, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}