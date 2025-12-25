/**
 * Simple Load Balancer
 */

class LoadBalancer {
  constructor() {
    this.services = new Map();
    this.currentIndex = new Map();
  }

  addService(serviceName, instances) {
    this.services.set(serviceName, instances);
    this.currentIndex.set(serviceName, 0);
  }

  getNextInstance(serviceName) {
    const instances = this.services.get(serviceName);
    if (!instances || instances.length === 0) {
      return null;
    }

    const currentIdx = this.currentIndex.get(serviceName) || 0;
    const instance = instances[currentIdx];
    
    // Round-robin
    this.currentIndex.set(serviceName, (currentIdx + 1) % instances.length);
    
    return instance;
  }

  getServicesStatus() {
    const status = {};
    for (const [serviceName, instances] of this.services) {
      status[serviceName] = {
        instances: instances.length,
        currentIndex: this.currentIndex.get(serviceName)
      };
    }
    return status;
  }
}

export const loadBalancer = new LoadBalancer();

export const loadBalancingMiddleware = (lb) => {
  return (req, res, next) => {
    // Add load balancer to request for use in proxies
    req.loadBalancer = lb;
    next();
  };
};