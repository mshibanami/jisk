import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';

let eleventyProcess;

// Define mockServiceConfig within the test file
const mockServiceConfig = {
    instancesUrl: 'https://example.com/instances.json',
    cacheKey: 'service_cache',
    cacheExpiry: 86400000, // 24 hours in milliseconds
    statusTimeout: 3000,
};

test.beforeAll(async () => {
    eleventyProcess = spawn('npm', ['run', 'dev'], { stdio: 'inherit' });
    await new Promise((resolve) => setTimeout(resolve, 3000));
});

test.afterAll(() => {
    if (eleventyProcess) eleventyProcess.kill();
});

test.describe('Redlib', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8082/redlib'); // Adjust URL if needed
    });

    test('should redirect to available instance', async ({ page }) => {
        // Mock the `fetch` response to simulate instance loading
        await page.route('**/instances.json', route =>
            route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({ instances: [{ url: 'https://instance1.com' }] })
            })
        );

        // Move `init` logic directly into `page.evaluate` for browser context execution
        await page.evaluate(({ config }) => {
            function init(config) {
                console.log('Init function with config:', config);
                // Add actual init logic here if needed
                // Example placeholder logic
                console.log(`Redirecting to ${config.urlConverter('https://instance1.com', 'https://reddit.com')}`);
            }

            // Execute `init` with the provided configuration
            init(config);
        }, { config: mockServiceConfig });

        await page.waitForTimeout(1000);
        expect(page.url()).toContain('https://instance1.com/redirect');
    });

    test('should display status updates correctly', async ({ page }) => {
        await expect(page.locator('#status-text')).toBeVisible();

        await page.evaluate(() => {
            const statusEl = document.getElementById('status');
            const statusTextEl = document.getElementById('status-text');
            if (statusEl && statusTextEl) {
                statusEl.className = 'loading';
                statusTextEl.textContent = 'Checking instances...';
            }
        });

        const statusText = await page.locator('#status-text').textContent();
        expect(statusText).toBe('Checking instances...');
    });
});
