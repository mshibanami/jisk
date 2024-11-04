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
export type serviceId = 'invidious' | 'redlib' | 'rimgo';
export type Status = 'idle' | 'loading' | 'success' | 'error';

export interface ServiceConfig {
    instances: Instance[];
    serviceId: serviceId;
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
    return config.customCacheKey ?? `${config.serviceId}_cache`;
}

function cachedInstance(config: ServiceConfig): Instance | null {
    const cacheKey = cacheKeyForService(config);
    try {
        const cachedJsonString = localStorage.getItem(cacheKey);
        if (!cachedJsonString) {
            return null;
        }
        const { instance, timestamp }: InstanceCache = JSON.parse(cachedJsonString);
        const cacheExpiryMilliseconds = config.cacheExpiry * 1000
        if (Date.now() - timestamp > cacheExpiryMilliseconds) {
            localStorage.removeItem(cacheKey);
            return null;
        }
        return instance;
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
        setStatus('loading', `Checking ${new URL(instance.url).hostname}...`);
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

export async function findWorkingInstance(config: ServiceConfig, instances: Instance[]): Promise<Instance | null> {
    const shuffledInstances = shuffled(instances);
    let targetInstances: Instance[];
    const cached = cachedInstance(config);
    if (cached) {
        if (!shuffledInstances.map(instance => instance.url).includes(cached.url)) {
            removeCachedInstance(config);
            targetInstances = shuffledInstances;
        } else {
            // Prioritize the cached instance
            targetInstances = [cached].concat(
                shuffledInstances.filter(instance => instance.url !== cached.url));
        }
    } else {
        targetInstances = shuffledInstances;
    }
    for (const instance of targetInstances) {
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
    const upperCasedCountryCodes = config.countryCodes?.map(code => code.toUpperCase()) ?? [];
    if (upperCasedCountryCodes.length > 0) {
        return instance.countryCode
            ? upperCasedCountryCodes.includes(instance.countryCode.toUpperCase())
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

function isValidSourceUrl({ sourceUrl, serviceId }: { sourceUrl: string, serviceId: serviceId }): boolean {
    const hostname = new URL(sourceUrl).hostname;
    switch (serviceId) {
        case 'invidious':
            return hostname.endsWith('youtube.com');
        case 'redlib':
            return hostname.endsWith('reddit.com');
        case 'rimgo':
            return hostname.endsWith('imgur.com');
        default:
            console.error('Invalid service name: ', serviceId);
            return false;
    }
}

export function makeDestinationUrl({
    instanceBaseUrl,
    sourceUrl,
    serviceId
}: {
    instanceBaseUrl: string;
    sourceUrl: string;
    serviceId: serviceId;
}): string | null {
    if (!isValidSourceUrl({ sourceUrl, serviceId })) {
        throw new Error(`${sourceUrl} is not a valid URL for ${serviceId}.`);
    }
    const components = new URL(sourceUrl);
    const url = new URL(components.pathname, instanceBaseUrl);
    url.search = components.search;
    url.hash = components.hash;
    return url.toString();
}

export function makeInstances({ rawInstances, serviceId }: { rawInstances: any, serviceId: serviceId }): Instance[] {
    switch (serviceId) {
        case 'invidious':
            return (rawInstances as any[][]).map(([_, info]) => {
                return {
                    url: info.uri,
                    countryCode: info.region,
                    faviconUrl: info.monitor?.favicon_url
                }
            })
        case 'redlib':
            return (rawInstances.instances as any[])
                .map(instance => {
                    return {
                        url: instance.url,
                        countryCode: instance.country
                    }
                })
        case 'rimgo':
            return (rawInstances as any[])
                .map(instance => {
                    return {
                        url: instance.url,
                        countryCode: instance.countries[0]
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
    } else if (!isValidSourceUrl({ sourceUrl, serviceId: config.serviceId })) {
        setStatus('error', `${sourceUrl} is not a valid URL for ${config.serviceId}.`);
        return;
    }
    const cacheExpiry = urlParams.get('cache_expiry');
    if (cacheExpiry !== null) {
        config.cacheExpiry = parseInt(cacheExpiry);
    }

    const autoRedirect = urlParams.get('auto_redirect');
    if (autoRedirect !== null) {
        config.autoRedirect = !['false', 'no', '0'].includes(autoRedirect);
    }

    const countryCodes = urlParams.get('countries');
    if (countryCodes !== null) {
        config.countryCodes = countryCodes.split(',').map(code => code.trim());
    }

    try {
        setStatus('loading', 'Checking for available instances...');
        const selectableInstances = await filterSelectableInstances(config, config.instances);
        if (selectableInstances.length === 0) {
            throw new Error('No selectable instances found. The filter conditions may be too strict.');
        }
        const workingInstance = await findWorkingInstance(config, selectableInstances);
        if (!workingInstance) {
            throw new Error('No available instances found. Please try again later.');
        }
        const redirectUrl = makeDestinationUrl({
            instanceBaseUrl: workingInstance.url,
            sourceUrl: sourceUrl,
            serviceId: config.serviceId
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
