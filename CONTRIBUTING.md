# Contributing guide

Thank you for investing your time in contributing to our project!

## Reporting bugs

Go to the [Issues](https://github.com/mshibanami/jisk/issues) tab and open an issue and describe the bug you found.

## Making Changes

### How to add a new service

1. Add the new service to the `services` array in [services.json](src/_data/services.json).
2. Add a URL of the list of instances to [download_instances.sh](scripts/download_instances.sh).
3. Add a new `new_service.njk` file to the `src` folder.
4. In terms of [instances.ts](src/assets/ts/instances.ts):
   1. Add a new case to the `ServiceName` type.
   2. Add a switch case in `makeInstances()` and `makeDestinationUrl()`.
5. (Optional) If possible, add tests to [instances.test.ts](tests/instances.test.ts).
6. Run `npm run dev` to check if the new service is displayed correctly.
