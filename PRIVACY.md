# Privacy Policy

_Last updated: 2026-05-04_

The **WeatherFlow Tempest** Stream Deck plugin ("the plugin") is published by Ricky Theil. This page explains what data the plugin handles and where it is sent.

This is an unofficial plugin and is not affiliated with, endorsed by, or sponsored by WeatherFlow Inc. "WeatherFlow" and "Tempest" are trademarks of their respective owners.

## What the plugin stores

The plugin stores two pieces of configuration that you provide:

- Your **WeatherFlow personal access token**
- Your **Tempest station ID**

These are stored locally by the Elgato Stream Deck application using its built-in `setGlobalSettings` mechanism. They are written to your computer's Stream Deck settings file and are not transmitted anywhere except as described below.

Per-button display preferences (which metric to show, units, refresh interval) are also stored locally in the same way.

## What the plugin transmits

The plugin makes HTTPS requests to **`swd.weatherflow.com`** (WeatherFlow's public REST API) to fetch the current observations for the station ID you configured. Your access token is included in those requests as required by the WeatherFlow API.

The plugin does **not**:

- Send your token, station ID, or any other data to any server other than `swd.weatherflow.com`.
- Collect analytics, telemetry, crash reports, or usage data.
- Use third-party trackers or advertising services.

WeatherFlow's handling of your token and station data is governed by [WeatherFlow's own privacy policy](https://weatherflow.com/privacy-policy/).

## Logs

The plugin writes diagnostic messages (including API error messages) to the standard Stream Deck plugin log files on your local machine. These logs stay on your computer.

## Removing your data

To remove the stored token and station ID, open the plugin's Property Inspector and clear the fields, or remove the plugin from Stream Deck.

## Contact

Questions or concerns: open an issue at <https://github.com/rtheil/streamdeck-weatherflow/issues>.
