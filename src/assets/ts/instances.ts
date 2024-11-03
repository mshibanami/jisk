export type Instance = {
    url: string;

    // e.g. JP, TW, KO, CN
    countryCode?: string;

    // Uptime percentage (0-100)
    uptime?: number;

    faviconUrl?: string;
};

type InstanceCache = {
    instance: Instance;
    timestamp: number;
};

const _ui: { type: Status, message: string } = {
    type: 'idle',
    message: ''
}

const ui = new Proxy(_ui, {
    set(target, key, value) {
        target[key as keyof typeof _ui] = value;
        updateUI();
        return true;
    }
});
export type ServiceName = 'redlib' | 'invidious';
export type Status = 'idle' | 'loading' | 'success' | 'error';

export interface ServiceConfig {
    instances: Instance[];
    serviceName: ServiceName;
    customCacheKey: string;
    cacheExpiry: number;
    statusTimeout: number;
    autoRedirect: boolean;
    countryCodes?: string[];
}

function shuffled<T>(array: T[]): T[] {
    return array
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
}

export function serviceConfig(overrides: Partial<ServiceConfig>): ServiceConfig {
    const defaults: Partial<ServiceConfig> = {
        cacheExpiry: 24 * 60 * 60, // 24 hours
        statusTimeout: 3, // 3 seconds
        autoRedirect: true,
    };
    const filteredOverrides = Object.fromEntries(
        Object.entries(overrides).filter(([_, value]) => value !== undefined)
    );
    return Object.assign({}, defaults, filteredOverrides) as ServiceConfig;
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

function removeCachedInstance(config: ServiceConfig) {
    try {
        const cacheKey = cacheKeyForService(config);
        localStorage.removeItem(cacheKey);
    } catch (error) {
        console.warn('Cache removal error:', error);
    }
}

function checkInstanceAvailability(instance: Instance, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
        const img = new Image();
        const timer = setTimeout(() => {
            img.src = '';
            resolve(false);
        }, timeout * 1000);

        img.onload = () => {
            clearTimeout(timer);
            resolve(true);
        };

        img.onerror = () => {
            clearTimeout(timer);
            resolve(false);
        };

        img.src = instance.faviconUrl ?? `${instance.url}/favicon.ico`;
    });
}

export async function findWorkingInstance(config: ServiceConfig, allInstances: Instance[]): Promise<Instance | null> {
    const shuffledInstances = shuffled(allInstances);
    let remainingInstances: Instance[];
    const cached = cachedInstance(config);
    if (cached) {
        // Prioritize the cached instance
        remainingInstances = [cached].concat(
            shuffledInstances.filter(instance => instance.url !== cached.url));
    } else {
        remainingInstances = shuffledInstances;
    }
    const filteredInstances = await filterSelectableInstances(config, remainingInstances);
    for (const instance of filteredInstances) {
        if (await checkInstanceAvailability(instance, config.statusTimeout)) {
            cacheWorkingInstance(config, instance);
            return instance;
        }
    }
    removeCachedInstance(config);
    return null;
}

export async function filterSelectableInstances(config: ServiceConfig, instances: Instance[]): Promise<Instance[]> {
    const filteredInstances = instances.filter(instance =>
        isSelectableInstance(instance, config)
    );
    return filteredInstances;
}

function isSelectableInstance(instance: Instance, config: ServiceConfig): boolean {
    if (config.countryCodes && config.countryCodes.length > 0) {
        return instance.countryCode
            ? config.countryCodes.includes(instance.countryCode)
            : false
    }
    return true;
}


export function setStatus(type: Status, message: string) {
    ui.type = type;
    ui.message = message;
}

export function updateUI() {
    const statusEl = document.getElementById('status');
    const statusTextEl = document.getElementById('status-text');
    const spinnerEl = document.getElementById('spinner');

    if (statusEl && statusTextEl && spinnerEl) {
        statusEl.className = ui.type;
        statusTextEl.textContent = ui.message;

        // Show or hide the spinner based on the status type
        spinnerEl.classList.remove('hidden');
        if (ui.type === 'loading') {
        } else {
            spinnerEl.classList.add('hidden');
        }
    }
}

export function makeDestinationUrl({ instanceBaseUrl, sourceUrl, serviceName }: { instanceBaseUrl: string, sourceUrl: string, serviceName: ServiceName }): string | null {
    const components = new URL(sourceUrl)
    const invalidUrlError = () => new Error(`${sourceUrl} is not a valid URL for ${serviceName}.`)
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
                .map(instance => {
                    return {
                        url: instance.url,
                        countryCode: instance.country
                    }
                })
        case 'invidious':
            return (rawInstances as any[][]).map(([_, info]) => {
                return {
                    url: info.uri,
                    countryCode: info.countryCode,
                    faviconUrl: info.favicon_url
                }
            })
        default:
            throw new Error('Invalid service name')
    }
}

export async function startSearching(customConfig: ServiceConfig): Promise<void> {
    const config = serviceConfig(customConfig);
    const urlParams = new URLSearchParams(window.location.search);
    const sourceUrl = urlParams.get('url');
    if (sourceUrl === null) {
        setStatus('error', 'No "url" parameter provided.');
        return;
    } else if (sourceUrl.length === 0) {
        setStatus('error', '"url" parameter is empty.');
        return;
    }
    const cacheExpiry = urlParams.get('cache_expiry');
    if (cacheExpiry !== null) {
        config.cacheExpiry = parseInt(cacheExpiry);
    }
    const auto_redirect = urlParams.get('auto_redirect');
    if (auto_redirect !== null) {
        config.autoRedirect = ['false', 'no', '0'].includes(auto_redirect);
    }
    try {
        setStatus('loading', 'Checking for available instances...');
        const workingInstance = await findWorkingInstance(config, config.instances);
        if (!workingInstance) {
            throw new Error('No available instances found. Please try again later.');
        }
        const redirectUrl = makeDestinationUrl({
            instanceBaseUrl: workingInstance.url,
            sourceUrl: sourceUrl,
            serviceName: config.serviceName
        });
        if (!redirectUrl) {
            throw new Error('Invalid target URL.');
        }
        setStatus('success', `Redirecting to ${redirectUrl}...`);
        if (config.autoRedirect) {
            window.location.replace(redirectUrl);
        }
    } catch (error) {
        if (error instanceof Error) {
            setStatus('error', error.message);
        } else {
            setStatus('error', 'An unknown error occurred.');
        }
    }
}
