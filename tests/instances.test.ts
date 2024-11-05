import { test, expect, test as setup } from '@playwright/test';
import { filterSelectableInstances, Instance, makeDestinationUrl, makeInstances, orderedInstances, ServiceConfig, serviceConfig, serviceId } from '../src/assets/ts/instances';

type DestinationURLTestCase = {
  instanceBaseUrl: string;
  sourceUrl: string;
  serviceId: serviceId;
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

  test('should make a destination URL', () => {
    const instanceBaseUrl = 'https://example.com/';

    const testCases: DestinationURLTestCase[] = [
      {
        instanceBaseUrl,
        sourceUrl: 'https://www.reddit.com/r/privacy',
        serviceId: 'redlib',
        expected: 'https://example.com/r/privacy',
      },
      {
        instanceBaseUrl,
        sourceUrl: 'https://www.reddit.com/r/privacy/',
        serviceId: 'invidious',
        expected: Error('https://www.reddit.com/r/privacy/ is not a valid URL for invidious.'),
      },
    ]

    for (const { instanceBaseUrl, sourceUrl, serviceId, expected } of testCases) {
      try {
        const destination = makeDestinationUrl({
          instanceBaseUrl,
          sourceUrl,
          serviceId,
        });
        expect(destination).toBe(expected);
      } catch (error) {
        expect(error).toEqual(expected);
      }
    }
  })

  test('should parse instances.json', async () => {
    {
      const rawInstances = require('./resources/invidious/instances.json');
      const parsedInstances = makeInstances({ rawInstances, serviceId: 'invidious' });
      expect(parsedInstances.length).toBe(8);
      const instance = parsedInstances[0]
      expect(instance.url).toBeDefined();
      expect(instance.countryCodes?.length).toBeGreaterThan(0);
      expect(instance.faviconUrl).toBeDefined();
    }
    {
      const rawInstances = require('./resources/redlib/instances.json');
      const parsedInstances = makeInstances({ rawInstances, serviceId: 'redlib' });
      expect(parsedInstances.length).toBeGreaterThan(0);
      const instance = parsedInstances[0]
      expect(instance.url).toBeDefined();
      expect(instance.countryCodes?.length).toBeGreaterThan(0);
    }
    {
      const rawInstances = require('./resources/rimgo/instances.json');
      const parsedInstances = makeInstances({ rawInstances, serviceId: 'rimgo' });
      expect(parsedInstances.length).toBeGreaterThan(0);
      const instance = parsedInstances[0]
      expect(instance.url).toBeDefined();
      expect(instance.countryCodes?.length).toBeGreaterThan(0);
    }

    {
      const rawInstances = require('./resources/piped/instances.json');
      const parsedInstances = makeInstances({ rawInstances, serviceId: 'piped' });
      expect(parsedInstances.length).toBeGreaterThan(0);
      const instance = parsedInstances[0]
      expect(instance.url).toBeDefined();
      expect(instance.countryCodes?.length).toBeGreaterThan(0);
    }
  })

  test('should filter by country codes', async () => {
    const instances: Instance[] = [
      {
        url: 'https://host1.example.com/',
        countryCodes: ['JP'],
        uptime: 100,
      },
      {
        url: 'https://host2.example.com/',
        countryCodes: ['TW'],
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
      expect(filtered[0].countryCodes).toStrictEqual(['JP']);
    }

    {
      var config = serviceConfig(mockServiceConfig);
      config.countryCodes = [];
      const filtered = await filterSelectableInstances(config, instances);
      if (!filtered) {
        throw new Error('No instances found');
      }
      expect(filtered.length).toBe(2);
      expect(filtered[0].countryCodes).toStrictEqual(['JP']);
      expect(filtered[1].countryCodes).toStrictEqual(['TW']);
    }
  })

  test('should order instances with preferred instances', async () => {
    {
      const instances: Instance[] = [
        { url: 'https://host1.example.com/' },
        { url: 'https://host2.example.com/' },
        { url: 'https://host3.example.com/' },
      ];
      var config = serviceConfig(mockServiceConfig);
      config.preferredInstanceHosts = ['host2.example.com', 'https://host3.example.com/'];
      const ordered = orderedInstances({ config, instances });
      expect(ordered.length).toBe(3);
      expect(ordered[0].url).toBe('https://host2.example.com/');
      expect(ordered[1].url).toBe('https://host3.example.com/');
      expect(ordered[2].url).toBe('https://host1.example.com/');
    }

    {
      const instances: Instance[] = [];
      var config = serviceConfig(mockServiceConfig);
      config.preferredInstanceHosts = ['host4.example.com', 'https://host3.example.com/'];
      const ordered = orderedInstances({ config, instances });
      expect(ordered.length).toBe(0);
    }

    {
      const instances: Instance[] = [
        { url: 'https://host1.example.com/' },
        { url: 'https://host2.example.com/' },
        { url: 'https://host3.example.com/' },
      ];
      var config = serviceConfig(mockServiceConfig);
      config.preferredInstanceHosts = ['host4.example.com', 'host3.example.com'];
      const ordered = orderedInstances({ config, instances });
      expect(ordered.length).toBe(3);
      expect(ordered[0].url).toBe('https://host3.example.com/');
      expect(ordered[1].url).toBe('https://host1.example.com/');
      expect(ordered[2].url).toBe('https://host2.example.com/');
    }

    {
      const instances: Instance[] = [
        { url: 'https://host1.example.com/' },
        { url: 'https://host2.example.com/' },
        { url: 'https://host3.example.com/' },
      ];
      var config = serviceConfig(mockServiceConfig);
      const ordered = orderedInstances({ config, instances });
      expect(ordered[0].url).toBe('https://host1.example.com/');
      expect(ordered[1].url).toBe('https://host2.example.com/');
      expect(ordered[2].url).toBe('https://host3.example.com/');
    }
  })
})
