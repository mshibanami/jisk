type Instance = {
    url: string;
};

type ServiceName = 'redlib' | 'invidious';
type Status = 'loading' | 'success' | 'error';

interface ServiceConfig {
    instances: Instance[];
    cacheKey: string;
    cacheExpiry: number;
    statusTimeout: number;
    serviceName: ServiceName;
}

const defaultConfig: Partial<ServiceConfig> = {
    cacheExpiry: 24 * 60 * 60 * 1000, // 24 hours
    statusTimeout: 3000               // 3 seconds
};

// Utility function to merge defaults with overrides
function createServiceConfig(overrides: Partial<ServiceConfig>): ServiceConfig {
    return {
        ...defaultConfig,
        ...overrides,
        cacheExpiry: overrides.cacheExpiry ?? defaultConfig.cacheExpiry ?? 24 * 60 * 60 * 1000
    } as ServiceConfig;
}

// Cache management functions
function getCachedInstances(config: ServiceConfig): Instance[] | null {
    try {
        const cached = localStorage.getItem(config.cacheKey);
        if (!cached) return null;

        const { instances, timestamp } = JSON.parse(cached);

        // Check if cache has expired
        // if (Date.now() - timestamp > config.cacheExpiry) {
        localStorage.removeItem(config.cacheKey);
        return null;
        // }

        return instances;
    } catch (error) {
        console.error('Cache read error:', error);
        return null;
    }
}

function cacheWorkingInstance(config: ServiceConfig, instance: Instance): void {
    try {
        const existingCache = getCachedInstances(config) || [];
        const newCache = [
            instance,
            ...existingCache.filter(i => i.url !== instance.url)
        ].slice(0, 5); // Keep only the 5 most recent working instances

        localStorage.setItem(config.cacheKey, JSON.stringify({
            instances: newCache,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Cache write error:', error);
    }
}

// Check if an instance is available
function checkInstanceAvailability(instance: Instance, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
        const img = new Image();
        const timer = setTimeout(() => {
            img.src = '';
            resolve(false);
        }, timeout);

        img.onload = () => {
            clearTimeout(timer);
            resolve(true);
        };

        img.onerror = () => {
            clearTimeout(timer);
            resolve(false);
        };

        img.src = `${instance.url}/favicon.ico`;
    });
}

// Find a working instance
async function findWorkingInstance(config: ServiceConfig, allInstances: Instance[]): Promise<Instance | null> {
    const cachedInstances = getCachedInstances(config);
    if (cachedInstances?.length) {
        for (const instance of cachedInstances) {
            if (await checkInstanceAvailability(instance, config.statusTimeout)) {
                return instance;
            }
        }
    }

    const remainingInstances = allInstances.filter(instance =>
        !cachedInstances?.some(cached => cached.url === instance.url)
    );

    for (const instance of remainingInstances) {
        if (await checkInstanceAvailability(instance, config.statusTimeout)) {
            cacheWorkingInstance(config, instance);
            return instance;
        }
    }

    return null;
}

// Update the status message
function updateStatus(type: Status, message: string): void {
    const statusEl = document.getElementById('status');
    const statusTextEl = document.getElementById('status-text');
    if (statusEl && statusTextEl) {
        statusEl.className = type;
        statusTextEl.textContent = message;
    }
}


function makeDestinationUrl({ instanceBaseUrl, sourceUrl, serviceName }: { instanceBaseUrl: string, sourceUrl: string, serviceName: ServiceName }): string | null {
    const encodedSourceUrl = encodeURIComponent(sourceUrl)
    const components = new URL(sourceUrl)
    const throwInvalidUrlError = () => { throw new Error('Not a valid URL') }
    switch (serviceName) {
        case 'redlib': {
            if (!components.hostname.includes('reddit.com')) {
                throwInvalidUrlError()
            }
            return instanceBaseUrl + components.pathname + components.search + components.hash
        }
        case 'invidious': {
            if (!components.hostname.includes('youtube.com')) {
                throwInvalidUrlError()
            }
            return instanceBaseUrl + components.pathname + components.search + components.hash
        }
        default:
            return null;
    }
}

export function makeInstances({ rawInstances, serviceName }: { rawInstances: any, serviceName: ServiceName }): Instance[] {
    switch (serviceName) {
        case 'redlib':
            return (rawInstances.instances as any[])
                .map((instance: any) => {
                    return { url: instance.url }
                })
        case 'invidious':
            return (rawInstances as any[][]).map(([_, info]) => {
                return { url: info.uri }
            })
        default:
            throw new Error('Invalid service name')
    }
}

// Initialization function
export async function init(config: ServiceConfig): Promise<void> {
    const urlParams = new URLSearchParams(window.location.search);
    const targetUrl = urlParams.get('url');
    if (!targetUrl) {
        updateStatus('error', 'No URL parameter provided. See usage instructions above.');
        return;
    }
    try {
        updateStatus('loading', 'Checking for available instances...');
        const workingInstance = await findWorkingInstance(config, config.instances);
        if (!workingInstance) {
            throw new Error('No available instances found. Please try again later.');
        }
        const redirectUrl = makeDestinationUrl({
            instanceBaseUrl: workingInstance.url,
            sourceUrl: targetUrl,
            serviceName: config.serviceName
        });
        if (!redirectUrl) {
            throw new Error('Invalid target URL.');
        }
        updateStatus('success', `Redirecting to ${redirectUrl}...`);
        setTimeout(() => {
            window.location.replace(redirectUrl);
        }, 1000);
    } catch (error) {
        if (error instanceof Error) {
            updateStatus('error', error.message);
        } else {
            updateStatus('error', 'An unknown error occurred.');
        }
    }
}

// // Exported functions for use
// export {
//     createServiceConfig,
//     getCachedInstances,
//     cacheWorkingInstance,
//     checkInstanceAvailability,
//     findWorkingInstance,
//     updateStatus,
//     init
// };
