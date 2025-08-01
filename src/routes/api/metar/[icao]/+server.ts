import { json } from '@sveltejs/kit';

export const GET = async ({ params, setHeaders }) => {
	let { icao } = params;

	icao = params.icao.toUpperCase();
	if (icao.startsWith('K') && icao.length === 4) icao = icao.slice(1);
	if (icao.length !== 3) return json({}, { status: 500 });

	try {
		const response = await fetch(
			`https://www.aviationweather.gov/cgi-bin/data/metar.php?ids=K${icao}`
		);
		const data = await response.text();

		// Set the caching policy for this API response
		// This tells browsers/caches to store this response for 1 hour (3600 seconds)
		setHeaders({
			'Cache-Control': 'public, max-age=3600'
		});

		return json({
			metar: data,
			icao: `K${icao}`
		});
	} catch (error) {
		console.error('Error fetching METAR:', error);
		return json({}, { status: 500 });
	}
};
