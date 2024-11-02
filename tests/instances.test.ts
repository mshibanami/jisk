import { test, expect, test as setup } from '@playwright/test';
import { ChildProcess, spawn } from 'child_process';
import { makeDestinationUrl, ServiceConfig, serviceConfig, ServiceName } from '../src/assets/ts/instances';

type DestinationURLTestCase = {
    instanceBaseUrl: string;
    sourceUrl: string;
    serviceName: ServiceName;
    expected: string | Error;
};

let eleventyProcess: ChildProcess | null = null;
let tscWatchProcess: ChildProcess | null = null;

// Define mockServiceConfig within the test file
const mockServiceConfig: Partial<ServiceConfig> = {
    customCacheKey: 'service_cache',
    cacheExpiry: 86400, // 24 hours in seconds
    statusTimeout: 3,
};

setup('Start 11ty server', async () => {
    eleventyProcess = spawn('npm', ['run', 'serve-eleventy'], { stdio: 'inherit' });
    await new Promise((resolve) => setTimeout(resolve, 3000));
});

test.describe('Test for instances.ts', () => {
    test('should return a valid service config', () => {
        const config = serviceConfig(mockServiceConfig);
        expect(config).toEqual(mockServiceConfig);
    });

    test('can make a destination URL', () => {
        const instanceBaseUrl = 'https://example.com/';

        const testCases: DestinationURLTestCase[] = [
            {
                instanceBaseUrl,
                sourceUrl: 'https://www.reddit.com/r/privacy',
                serviceName: 'redlib',
                expected: 'https://example.com/r/privacy',
            },
            {
                instanceBaseUrl,
                sourceUrl: 'https://www.reddit.com/r/privacy/',
                serviceName: 'invidious',
                expected: Error('Not a valid URL'),
            },
        ]

        for (const { instanceBaseUrl, sourceUrl, serviceName, expected } of testCases) {
            try {
                const destination = makeDestinationUrl({
                    instanceBaseUrl,
                    sourceUrl,
                    serviceName,
                });
                expect(destination).toBe(expected);
            } catch (error) {
                expect(error).toEqual(expected);
            }
        }
    })
})

test.describe('Redlib', () => {
    test('should redirect to an instance', async ({ page }) => {
        await page.goto(
            'http://localhost:8080/redlib?url=https://www.reddit.com/r/privacy',
            { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(40000);
        // Should not include the domain of the local server
        expect(page.url()).not.toMatch(/^http:\/\/localhost:/);
    });
});
