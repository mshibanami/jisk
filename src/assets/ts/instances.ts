export type Instance = {
    url: string;

    // e.g. JP, TW, KO, CN
    countryCodes?: string[];

    // Number of score (0-100). The higher the better.
    score?: number;

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

export type ServiceId = 'invidious' | 'nitter' | 'piped' | 'redlib' | 'rimgo';
export type Status = 'idle' | 'loading' | 'success' | 'error';

export interface ServiceConfig {
    instances: Instance[];
    serviceId: ServiceId;
    customCacheKey: string;
    cacheExpiry: number;
    statusTimeout: number;
    autoRedirect: boolean;
    countryCodes?: string[];
    preferredInstanceHosts?: string[];
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
        console.warn('Failed to read cache: ', (error as Error).message);
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
        console.warn('Failed to remove cache: ', (error as Error).message);
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

        img.src = instance.faviconUrl ?? new URL("favicon.ico", instance.url).toString();
    });
}

async function findWorkingInstance({ config, instances }: { config: ServiceConfig, instances: Instance[] }): Promise<Instance | null> {
    const targetInstances = orderedInstances({ config, instances });
    for (const instance of targetInstances) {
        if (await checkInstanceAvailability(instance, config.statusTimeout)) {
            cacheWorkingInstance(config, instance);
            return instance;
        }
    }
    removeCachedInstance(config);
    return null;
}

export function orderedInstances({ config, instances }: { config: ServiceConfig, instances: Instance[] }): Instance[] {
    const cached = cachedInstance(config);
    const cachedUrl = cached ? cached.url : null;
    const cachedHostname = cachedUrl ? urlHostname(cachedUrl) : null;

    const preferredHostnames = (config.preferredInstanceHosts || [])
        .map(url => urlHostname(url));

    const instancesWithHostnames = instances.map(instance => ({
        instance,
        hostname: urlHostname(instance.url)
    }));

    const ordered = instancesWithHostnames
        .sort((a, b) => {
            if (cachedHostname) {
                if (a.hostname === cachedHostname) { return -1; }
                if (b.hostname === cachedHostname) { return 1; }
            }
            const aIndex = preferredHostnames.indexOf(a.hostname);
            const bIndex = preferredHostnames.indexOf(b.hostname);
            const aPreferred = aIndex !== -1;
            const bPreferred = bIndex !== -1;

            if (aPreferred && bPreferred) { return aIndex - bIndex; }
            if (aPreferred && !bPreferred) { return -1; }
            if (!aPreferred && bPreferred) { return 1; }

            return 0
        })
        .map(({ instance }) => instance);
    return ordered;
}


function urlHostname(url: string): string | null {
    try {
        return new URL(url.includes('://') ? url : `https://${url}`)
            .hostname
            .toLowerCase();
    } catch {
        return null;
    }
}

export async function filterSelectableInstances(config: ServiceConfig, instances: Instance[]): Promise<Instance[]> {
    const filteredInstances = instances.filter(instance =>
        isSelectableInstance(instance, config)
    );
    return filteredInstances;
}

function isSelectableInstance(instance: Instance, config: ServiceConfig): boolean {
    const targetCountryCodes = config.countryCodes?.map(code => code.toUpperCase()) ?? [];
    if (targetCountryCodes.length > 0) {
        if (instance.countryCodes) {
            // Filter by country if the instance has multiple countries and all are allowed.
            return instance.countryCodes
                .map(code => code.toUpperCase())
                .filter(code => targetCountryCodes.includes(code))
                .length > 0;
        } else {
            return false
        }
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

function isValidSourceUrl({ sourceUrl, serviceId }: { sourceUrl: string, serviceId: ServiceId }): boolean {
    const hostname = new URL(sourceUrl).hostname;
    switch (serviceId) {
        case 'invidious':
        case 'piped':
            return hostname.endsWith('youtube.com');
        case 'nitter':
            return hostname.endsWith('twitter.com') || hostname.endsWith('x.com');
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
    serviceId: ServiceId;
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

export function makeInstances({ rawInstances, serviceId }: { rawInstances: any, serviceId: ServiceId }): Instance[] {
    switch (serviceId) {
        case 'invidious':
            return (rawInstances as any[][]).map(([_, info]) => {
                return {
                    url: info.uri,
                    countryCodes: [info.region],
                    faviconUrl: info.monitor?.favicon_url,
                    score: info.monitor?.uptime,
                } satisfies Instance
            })
        case 'nitter':
            return (rawInstances.hosts as any[]).map(instance => {
                return {
                    url: instance.url,
                    countryCodes: [convertRegionEmojiToCode(instance.country)],
                    score: instance.points
                } satisfies Instance
            })
        case 'piped':
            return (rawInstances as any[])
                .map(instance => {
                    const uptime = instance.health?.uptime

                    return {
                        url: instance.url,
                        countryCodes: instance.countries,
                        score: uptime ? parseFloat(uptime) : undefined
                    } satisfies Instance
                })
        case 'redlib':
            return (rawInstances.instances as any[])
                .map(instance => {
                    return {
                        url: instance.url,
                        countryCodes: [instance.country]
                    } satisfies Instance
                })
        case 'rimgo':
            return (rawInstances as any[])
                .map(instance => {
                    return {
                        url: instance.url,
                        countryCodes: instance.countries
                    } satisfies Instance
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

    const preferredInstances = urlParams.get('preferred_instances');
    if (preferredInstances !== null) {
        config.preferredInstanceHosts = preferredInstances.split(',').map(url => url.trim());
    }

    try {
        setStatus('loading', 'Checking for available instances...');
        const selectableInstances = await filterSelectableInstances(config, config.instances);
        if (selectableInstances.length === 0) {
            throw new Error('No selectable instances found. The filter conditions may be too strict.');
        }
        const workingInstance = await findWorkingInstance({
            config,
            instances: shuffled(selectableInstances)
        });
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
        const prefix = 'Failed to start searching:';
        if (error instanceof Error) {
            setStatus('error', prefix + error.message);
        } else {
            setStatus('error', prefix + 'An unknown error occurred.');
        }
    }
}

export function convertRegionEmojiToCode(regionEmoji: string): string {
    const codePoints = Array.from(regionEmoji)
    if (codePoints.length !== 2) {
        throw new Error("The input must be a 2-character flag emoji.");
    }
    const OFFSET = 0x1F1E6;
    return codePoints.map((char) => {
        const codePoint = char.codePointAt(0);
        if (!codePoint) {
            throw new Error("Invalid character is included in the input");
        }
        return String.fromCharCode(codePoint - OFFSET + 65);
    }).join('');
}
