import { ServiceName } from "./instances";

export function makeRedirectionUrl({ baseUrl, sourceUrl, encodesSourceUrl, cacheExpiry, serviceName, countries }: { baseUrl: string, sourceUrl: string, encodesSourceUrl: boolean, cacheExpiry: number, serviceName: ServiceName, countries: string[] }): string | null {
    const components = new URL(serviceName, baseUrl)

    if (sourceUrl.length > 0) {
        if (encodesSourceUrl) {
            components.searchParams.set('url', sourceUrl)
        } else {
            components.search = `url=${sourceUrl}`
        }
    }
    if (cacheExpiry > 0) {
        components.searchParams.set('cache_expiry', cacheExpiry.toString())
    }
    if (countries.length > 0) {
        components.searchParams.set('countries', countries.join(','))
    }
    return components.toString()
}
