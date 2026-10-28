# App shell: language, theme, install

## Acceptance criteria

- **APP-1** Languages: English and Portuguese (Brazil). The app follows the device language and falls back to English.
- **APP-2** Theme: light, dark or system (default). The choice is remembered on the device.
- **APP-3** Web: the app is installable as a PWA. On browsers that support an install prompt, Home's menu offers "Install app". On iOS Safari it shows the 3 steps (Share → Add to Home Screen → Add).
- **APP-4** First load on a phone is fast: Home is usable within ~2 s on a typical 4G connection, and cached opens are near-instant (budget to be confirmed in architecture).
- **APP-6** Online only. When offline, a clear banner says so and actions that need the network are disabled.
- **APP-5** All interactive elements are accessible (labels, roles, focus), which also enables future assistant automation.
