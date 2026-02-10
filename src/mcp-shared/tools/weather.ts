import { z } from "zod";
import type { ToolEntry } from "../registry/types";

interface GeoResult {
	name: string;
	latitude: number;
	longitude: number;
	country: string;
	admin1?: string;
}

interface WeatherResponse {
	current: {
		temperature_2m: number;
		relative_humidity_2m: number;
		wind_speed_10m: number;
		weather_code: number;
	};
}

export const weatherTools: ToolEntry[] = [
	{
		name: "get_weather",
		description:
			"Get current weather for any city. Returns temperature, humidity, wind speed, and weather condition code.",
		schema: {
			location: z
				.string()
				.describe('City name to look up, e.g. "San Francisco" or "Tokyo"'),
		},
		handler: async (input) => {
			const { location } = input as { location: string };

			// Geocode the location
			const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
			const geoRes = await fetch(geoUrl);
			if (!geoRes.ok) {
				throw new Error(`Geocoding request failed: ${geoRes.status}`);
			}
			const geoData = (await geoRes.json()) as { results?: GeoResult[] };
			if (!geoData.results || geoData.results.length === 0) {
				throw new Error(`Location not found: "${location}"`);
			}

			const { name, latitude, longitude, country, admin1 } = geoData.results[0];

			// Fetch current weather
			const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`;
			const weatherRes = await fetch(weatherUrl);
			if (!weatherRes.ok) {
				throw new Error(`Weather request failed: ${weatherRes.status}`);
			}
			const weatherData = (await weatherRes.json()) as WeatherResponse;
			const c = weatherData.current;

			return {
				location: admin1 ? `${name}, ${admin1}, ${country}` : `${name}, ${country}`,
				latitude,
				longitude,
				temperature_celsius: c.temperature_2m,
				humidity_percent: c.relative_humidity_2m,
				wind_speed_kmh: c.wind_speed_10m,
				weather_code: c.weather_code,
			};
		},
	},
];
