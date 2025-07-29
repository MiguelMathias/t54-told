import airports from '$lib/airports.json';
import runways from '$lib/runways.json';
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

export const findAirportByICAO = (icao: string): Airport | undefined =>
	(airports as Airport[]).find((airport) => airport.ident === icao.toUpperCase());

export const findRunwaysByICAO = (icao: string): Runway[] =>
	(runways as Runway[]).filter((runway) => runway.airport_ident === icao.toUpperCase());

export type BestRunway = {
	ident: string;
	heading: number;
	headwind: number;
	crosswind: number;
	length: number;
};

export const findBestRunwayForTakeoff = (
	runways: Runway[],
	windDirectionTrue: number,
	windSpeed: number
): BestRunway | null => {
	let bestRunway: BestRunway | null = null;

	for (const runway of runways) {
		const ends = [
			{ ident: runway.le_ident, heading: runway.le_heading_degT },
			{ ident: runway.he_ident, heading: runway.he_heading_degT }
		];

		for (const end of ends) {
			if (end.ident && end.heading !== undefined) {
				const { headwind, crosswind } = computeWindComponents(
					end.heading,
					windDirectionTrue,
					windSpeed
				);

				if (!bestRunway || headwind > bestRunway.headwind) {
					bestRunway = {
						ident: end.ident,
						heading: end.heading,
						headwind,
						crosswind,
						length: runway.length_ft
					};
				}
			}
		}
	}

	return bestRunway;
};

export type Inputs = {
	bow?: number;
	fuelOnBoard?: number;
	cargo?: number;
	plannedTaxi?: number;
	passWt?: number;
	plannedReserve?: number;
	avgPassWt?: number;
	numPass?: number;
};

export const defaultInputs: Inputs = {
	plannedTaxi: 90,
	passWt: 200,
	plannedReserve: 600,
	avgPassWt: 200,
	numPass: 1
};

export type Outputs = {
	accelerateStop?: number;
	accelerateGo?: number;
	v1?: number;
	vr?: number;
	v1VrRatio?: number;
	oneEngineInopClimbRate?: number;
	landingDistance?: number;
	zfw?: number;
	takeoffWeight?: number;
	grossWeight?: number;
};

export const defaultOutputs: Outputs = {};

export type Conditions = {
	temperature?: number;
	elevation?: number;
	slope?: number;
	runway?: BestRunway;
	hwTw?: number;
	xw?: number;
	pressureAlt?: number;
	windDirection?: number;
	windSpeed?: number;
	altimeter?: number;
	rawMetar?: string;
};

export const defaultConditions: Conditions = {
	slope: 0
};

export type Settings = {
	useWind: boolean;
	wetRunway: boolean;
	takeoffFlaps: 'Up' | 'Approach';
	landingReverse: boolean;
	landingObstacle?: number;
	useRealWeightForLanding: boolean;
	landingFlaps: 'Up' | 'Approach' | 'Down';
	usePressureAlt: boolean;
};

export const defaultSettings: Settings = {
	useWind: true,
	wetRunway: false,
	takeoffFlaps: 'Up',
	landingReverse: false,
	landingObstacle: 50,
	useRealWeightForLanding: false,
	landingFlaps: 'Approach',
	usePressureAlt: false
};
