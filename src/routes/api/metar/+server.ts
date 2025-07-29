import { json } from '@sveltejs/kit';

//export const prerender = true;

export const POST = async ({ request }) => {
	let { icao } = await request.json();

	if (icao.startsWith('K') && icao.length === 4) icao = icao.slice(1);
	if (icao.length !== 3) return json({}, { status: 500 });

	try {
		const response = await fetch(
			`https://www.aviationweather.gov/cgi-bin/data/metar.php?ids=K${icao}`
		);
		const data = await response.text();
		return json({
			metar: data,
			icao: `K${icao}`
		});
	} catch (error) {
		console.error('Error fetching METAR:', error);
		return json({}, { status: 500 });
	}
};
