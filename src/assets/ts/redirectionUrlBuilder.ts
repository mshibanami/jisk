import { ServiceId } from "./instances";

export function makeRedirectionUrl({
    baseUrl,
    sourceUrl,
    serviceId,
    encodesSourceUrl,
    cacheExpiry,
    hasHtmlExtension,
    countries,
    preferredInstanceHosts,
}: {
    baseUrl: string,
    sourceUrl: string,
    serviceId: ServiceId,
    encodesSourceUrl?: boolean,
    cacheExpiry?: number,
    hasHtmlExtension?: boolean,
    countries?: string[],
    preferredInstanceHosts?: string[],
}): string | null {
    const resourceName = serviceId + (hasHtmlExtension ? '.html' : '')
    const components = new URL(resourceName, baseUrl)
    if (sourceUrl.length > 0) {
        if (encodesSourceUrl === undefined || encodesSourceUrl) {
            components.searchParams.set('url', sourceUrl)
        } else {
            components.search = `url=${sourceUrl}`
        }
    }
    if (cacheExpiry && cacheExpiry >= 0) {
        components.searchParams.set('cache_expiry', cacheExpiry.toString())
    }
    if (countries && countries.length > 0) {
        components.searchParams.set('countries', countries.join(','))
    }
    if (preferredInstanceHosts && preferredInstanceHosts.length > 0) {
        components.searchParams.set('preferred_instances', preferredInstanceHosts.join(','))
    }
    return components.toString()
}
