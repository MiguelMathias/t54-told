import { computeWindComponents } from './computer';

export type Airport = {
	continent: string | null;
	elevation_ft: number;
	gps_code: string;
	home_link: string | null;
	iata_code: string;
	icao_code: string;
	id: number;
	ident: string;
	iso_country: string;
	iso_region: string;
	keywords: string | null;
	latitude_deg: number;
	longitude_deg: number;
	local_code: string;
	municipality: string;
	name: string;
	scheduled_service: string;
	type: string;
	wikipedia_link: string | null;
	// add other fields as needed
};

export interface Runway {
	airport_ident: string;
	airport_ref: number;
	closed: number;
	he_displaced_threshold_ft: number;
	he_elevation_ft: number;
	he_heading_degT: number;
	he_ident: string;
	he_latitude_deg: number;
	he_longitude_deg: number;
	id: number;
	le_displaced_threshold_ft: number;
	le_elevation_ft: number;
	le_heading_degT: number;
	le_ident: string;
	le_latitude_deg: number;
	le_longitude_deg: number;
	length_ft: number;
	lighted: number;
	surface: string;
	width_ft: number;
}

interface BestRunwayChoice {
	id: string;
	heading: number;
	headwind: number;
	length: number;
}

export const findBestRunwayForTakeoff = (
	runways: Runway[],
	windDirectionTrue: number,
	windSpeed: number
): BestRunwayChoice | null => {
	let bestRunway: BestRunwayChoice | null = null;

	for (const runway of runways) {
		const ends = [
			{ id: runway.le_ident, heading: runway.le_heading_degT },
			{ id: runway.he_ident, heading: runway.he_heading_degT }
		];

		for (const end of ends) {
			if (end.id && end.heading !== undefined) {
				const { headwind } = computeWindComponents(end.heading, windDirectionTrue, windSpeed);

				if (!bestRunway || headwind > bestRunway.headwind) {
					bestRunway = {
						id: end.id,
						heading: end.heading,
						headwind,
						length: runway.length_ft
					};
				}
			}
		}
	}

	return bestRunway;
};

export type Inputs = {
	bow: number | undefined;
	fuelOnBoard: number | undefined;
	cargo: number | undefined;
	plannedTaxi: number | undefined;
	passWt: number | undefined;
	plannedReserve: number | undefined;
	avgPassWt: number | undefined;
	numPass: number | undefined;
};

export const defaultInputs: Inputs = {
	bow: undefined,
	fuelOnBoard: undefined,
	cargo: undefined,
	plannedTaxi: 90,
	passWt: 200,
	plannedReserve: 600,
	avgPassWt: 200,
	numPass: 1
};

export type Outputs = {
	accelerateStop: number | undefined;
	accelerateGo: number | undefined;
	v1: number | undefined;
	vr: number | undefined;
	v1VrRatio: number | undefined;
	oneEngineInopClimbRate: number | undefined;
	landingDistance: number | undefined;
	zfw: number | undefined;
	takeoffWeight: number | undefined;
	grossWeight: number | undefined;
};

export const defaultOutputs: Outputs = {
	accelerateStop: undefined,
	accelerateGo: undefined,
	v1: undefined,
	vr: undefined,
	v1VrRatio: undefined,
	oneEngineInopClimbRate: undefined,
	landingDistance: undefined,
	zfw: undefined,
	takeoffWeight: undefined,
	grossWeight: undefined
};

export type Conditions = {
	temperature: number | undefined;
	elevation: number | undefined;
	slope: number | undefined;
	runway: BestRunwayChoice | undefined;
	hwTw: number | undefined;
	pressureAlt: number | undefined;
};

export const defaultConditions: Conditions = {
	temperature: undefined,
	elevation: undefined,
	slope: 0,
	runway: undefined,
	hwTw: undefined,
	pressureAlt: undefined
};

export type Settings = {
	useNoWind: boolean;
	wetRunway: boolean;
	takeoffFlaps: 'Up' | 'Approach';
	landingReverse: boolean;
	landingObstacle: number | undefined;
	landingFlaps: 'Up' | 'Approach' | 'Down';
	usePressureAlt: boolean;
};

export const defaultSettings: Settings = {
	useNoWind: true,
	wetRunway: false,
	takeoffFlaps: 'Up',
	landingReverse: false,
	landingObstacle: 50,
	landingFlaps: 'Approach',
	usePressureAlt: false
};
