/**
 * Simple Service Discovery
 */

class ServiceDiscovery {
  constructor() {
    this.services = new Map();
    this.healthCheckInterval = null;
  }

  registerService(serviceName, instances) {
    this.services.set(serviceName, {
      instances: instances.map(instance => ({
        ...instance,
        healthy: true,
        lastCheck: null
      }))
    });
  }

  getService(serviceName) {
    return this.services.get(serviceName);
  }

  getHealthyInstances(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) return [];
    
    return service.instances.filter(instance => instance.healthy);
  }

  async checkHealth(serviceName, instance) {
    try {
      // In a real implementation, make HTTP request to health endpoint
      // For now, assume all services are healthy
      instance.healthy = true;
      instance.lastCheck = new Date();
      return true;
    } catch (error) {
      instance.healthy = false;
      instance.lastCheck = new Date();
      return false;
    }
  }

  startHealthChecks() {
    this.healthCheckInterval = setInterval(async () => {
      for (const [serviceName, service] of this.services) {
        for (const instance of service.instances) {
          await this.checkHealth(serviceName, instance);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  getServicesStatus() {
    const status = {};
    for (const [serviceName, service] of this.services) {
      status[serviceName] = {
        totalInstances: service.instances.length,
        healthyInstances: service.instances.filter(i => i.healthy).length,
        instances: service.instances.map(i => ({
          url: i.url,
          healthy: i.healthy,
          lastCheck: i.lastCheck
        }))
      };
    }
    return status;
  }
}

export const serviceDiscovery = new ServiceDiscovery();