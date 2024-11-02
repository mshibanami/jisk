type Instance = {
    url: string;
};

type InstanceCache = {
    instance: Instance;
    timestamp: number;
};

export type ServiceName = 'redlib' | 'invidious';
export type Status = 'loading' | 'success' | 'error';

export interface ServiceConfig {
    instances: Instance[];
    serviceName: ServiceName;
    customCacheKey: string;
    cacheExpiry: number;
    statusTimeout: number;
    autoRedirect: boolean;
}

export function serviceConfig(overrides: Partial<ServiceConfig>): ServiceConfig {
    return {
        cacheExpiry: 24 * 60 * 60, // 24 hours
        statusTimeout: 3, // 3 seconds
        autoRedirect: true,
        ...overrides,
    } as ServiceConfig;
}

function cacheKeyForService(config: ServiceConfig) {
    return config.customCacheKey ?? `${config.serviceName}_cache`;
}

function cachedInstance(config: ServiceConfig): Instance | null {
    const cacheKey = cacheKeyForService(config);
    try {
        const cached = localStorage.getItem(cacheKey);
        if (!cached) {
            return null;
        }
        const { instances, timestamp } = JSON.parse(cached) satisfies InstanceCache;
        const cacheExpiryMilliseconds = config.cacheExpiry * 1000
        if (Date.now() - timestamp > cacheExpiryMilliseconds) {
            localStorage.removeItem(cacheKey);
            return null;
        }
        return instances;
    } catch (error) {
        console.error('Cache read error:', error);
        return null;
    }
}

function cacheWorkingInstance(config: ServiceConfig, instance: Instance) {
    try {
        const cacheKey = cacheKeyForService(config);
        const newCache: InstanceCache = {
            instance: instance,
            timestamp: Date.now()
        }
        localStorage.setItem(cacheKey, JSON.stringify(newCache));
    } catch (error) {
        console.error('Cache write error:', error);
    }
}

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

export async function findWorkingInstance(config: ServiceConfig, allInstances: Instance[]): Promise<Instance | null> {
    const cached = cachedInstance(config);
    let remainingInstances: Instance[];
    if (cached) {
        if (await checkInstanceAvailability(cached, config.statusTimeout)) {
            return cached;
        }
        localStorage.removeItem(cacheKeyForService(config));
        remainingInstances = allInstances.filter(instance =>
            instance.url !== cached.url
        );
    } else {
        remainingInstances = allInstances;
    }
    for (const instance of remainingInstances) {
        if (await checkInstanceAvailability(instance, config.statusTimeout)) {
            cacheWorkingInstance(config, instance);
            return instance;
        }
    }
    return null;
}

export function updateStatus(type: Status, message: string) {
    const statusEl = document.getElementById('status');
    const statusTextEl = document.getElementById('status-text');
    if (statusEl && statusTextEl) {
        statusEl.className = type;
        statusTextEl.textContent = message;
    }
}

export function makeDestinationUrl({ instanceBaseUrl, sourceUrl, serviceName }: { instanceBaseUrl: string, sourceUrl: string, serviceName: ServiceName }): string | null {
    const components = new URL(sourceUrl)
    const invalidUrlError = () => new Error('Not a valid URL')
    switch (serviceName) {
        case 'redlib': {
            if (!components.hostname.includes('reddit.com')) {
                throw invalidUrlError()
            }
            const url = new URL(components.pathname, instanceBaseUrl);
            url.search = components.search;
            url.hash = components.hash;
            return url.toString();
        }
        case 'invidious': {
            if (!components.hostname.includes('youtube.com')) {
                throw invalidUrlError()
            }
            const url = new URL(components.pathname, instanceBaseUrl);
            url.search = components.search;
            url.hash = components.hash;
            return url.toString();
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

export async function startSearching(customConfig: ServiceConfig): Promise<void> {
    const config = serviceConfig(customConfig);
    const urlParams = new URLSearchParams(window.location.search);
    const targetUrl = urlParams.get('url');
    if (!targetUrl) {
        updateStatus('error', 'No URL parameter provided. See usage instructions above.');
        return;
    }
    const cacheExpiry = urlParams.get('cache_expiry');
    if (cacheExpiry) {
        config.cacheExpiry = parseInt(cacheExpiry);
    }
    const auto_redirect = urlParams.get('auto_redirect');
    if (auto_redirect) {
        config.autoRedirect = ['false', 'no', '0'].includes(auto_redirect);
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
        if (config.autoRedirect) {
            window.location.replace(redirectUrl);
        }
    } catch (error) {
        if (error instanceof Error) {
            updateStatus('error', error.message);
        } else {
            updateStatus('error', 'An unknown error occurred.');
        }
    }
}
