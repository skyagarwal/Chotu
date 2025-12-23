// Stubbed file - Admin API methods not yet implemented
export const useSecrets = () => ({ secrets: [], loading: false, error: null, loadSecrets: async () => {}, addSecret: async () => true, deleteSecret: async () => true, rotateSecret: async () => true });
export const useTenants = () => ({ tenants: [], loading: false, error: null, loadTenants: async () => {}, createTenant: async () => true, updateTenant: async () => true });
export const useLlmAnalytics = () => ({ analytics: null, loading: false, error: null, loadAnalytics: async () => {} });
export const useFlowAnalytics = () => ({ analytics: null, loading: false, error: null, loadAnalytics: async () => {} });
export const useNluRetraining = () => ({ retraining: false, error: null, startRetraining: async () => null, checkJobStatus: async () => null });
