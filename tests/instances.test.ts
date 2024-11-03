import { test, expect, test as setup } from '@playwright/test';
import { filterSelectableInstances, findWorkingInstance, Instance, makeDestinationUrl, ServiceConfig, serviceConfig, ServiceName } from '../src/assets/ts/instances';

type DestinationURLTestCase = {
  instanceBaseUrl: string;
  sourceUrl: string;
  serviceName: ServiceName;
  expected: string | Error;
};

// Define mockServiceConfig within the test file
const mockServiceConfig: Partial<ServiceConfig> = {
  autoRedirect: true,
  customCacheKey: 'service_cache',
  cacheExpiry: 86400, // 24 hours in seconds
  statusTimeout: 3,
};

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
        expected: Error('https://www.reddit.com/r/privacy/ is not a valid URL for invidious.'),
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

  test('should filter by country codes with findWorkingInstance()', async ({ page }) => {
    const instances: Instance[] = [
      {
        url: 'https://example.com/',
        countryCode: 'JP',
        uptime: 100,
      },
      {
        url: 'https://example.com/',
        countryCode: 'TW',
      },
    ];

    {
      var config = serviceConfig(mockServiceConfig);
      config.countryCodes = ['JP'];
      const filtered = await filterSelectableInstances(config, instances);
      if (!filtered) {
        throw new Error('No instances found');
      }
      expect(filtered.length).toBe(1);
      expect(filtered[0].countryCode).toBe('JP');
    }

    {
      var config = serviceConfig(mockServiceConfig);
      config.countryCodes = [];
      const filtered = await filterSelectableInstances(config, instances);
      if (!filtered) {
        throw new Error('No instances found');
      }
      expect(filtered.length).toBe(2);
      expect(filtered[0].countryCode).toBe('JP');
      expect(filtered[1].countryCode).toBe('TW');
    }
  })
})
