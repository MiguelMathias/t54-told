<script lang="ts">
	import { browser } from '$app/environment';
	import {
		climbOneEngineInop,
		computeWindComponents,
		getAccelGoComputer,
		getAccelStopComputer,
		getLandingComputer
	} from '$lib/computer';
	import {
		defaultInputs,
		defaultSettings,
		findAirportByICAO,
		findBestRunwayForTakeoff,
		findRunwaysByICAO,
		type Airport,
		type BestRunway,
		type Runway,
		type Settings
	} from '$lib/types';
	import {
		Button,
		ButtonGroup,
		DarkMode,
		Heading,
		Hr,
		Input,
		InputAddon,
		Label,
		Modal,
		P,
		Select,
		Toggle
	} from 'flowbite-svelte';
	import { AdjustmentsHorizontalSolid, InfoCircleSolid } from 'flowbite-svelte-icons';

	let inputs = $state({ ...defaultInputs });

	let icao = $state('NGP');

	let airport: Airport | undefined = $derived.by(() => {
		return findAirportByICAO(`K${icao}`);
	});
	let runways: Runway[] = $derived.by(() => {
		return findRunwaysByICAO(`K${icao}`);
	});

	let elevation: number | undefined = $derived(airport?.elevation_ft);
	let slope: number | undefined = $state(0);

	let rawMetar = $state<string | undefined>(undefined);
	let altimeter: number | undefined = $derived.by(() => {
		const altimeterMatch = rawMetar?.match(/A(\d{4})/);
		return altimeterMatch ? parseInt(altimeterMatch[1]) / 100 : undefined;
	});
	let pressureAlt: number | undefined = $derived.by(() =>
		elevation && altimeter ? (29.92 - altimeter) * 1000 + elevation : undefined
	);
	let temperature: number | undefined = $derived.by(() => {
		const tempMatch = rawMetar?.match(/M?(\d{2})\/M?(\d{2})/);
		return tempMatch
			? tempMatch[1].startsWith('M')
				? -parseInt(tempMatch[1].slice(1))
				: parseInt(tempMatch[1])
			: undefined;
	});
	let windDirection: number | undefined = $derived.by(() => {
		const windMatch = rawMetar?.match(/(\d{3})(\d{2,3})(G\d{2,3})?KT/);
		return windMatch ? parseInt(windMatch[1]) : undefined;
	});
	let windSpeed: number | undefined = $derived.by(() => {
		const windMatch = rawMetar?.match(/(\d{3})(\d{2,3})(G\d{2,3})?KT/);
		return windMatch ? parseInt(windMatch[2]) : undefined;
	});
	let runway: BestRunway | undefined = $derived.by(() => {
		if (windDirection && windSpeed)
			return findBestRunwayForTakeoff(runways, windDirection, windSpeed) ?? undefined;

		return undefined;
	});

	let headwind = $derived.by(() => {
		rawMetar;
		if (runway && windDirection && windSpeed) {
			const { headwind } = computeWindComponents(runway.heading, windDirection, windSpeed);
			return headwind;
		}
		return undefined;
	});
	let crosswind = $derived.by(() => {
		rawMetar;
		if (runway && windDirection && windSpeed) {
			const { crosswind } = computeWindComponents(runway.heading, windDirection, windSpeed);
			return crosswind;
		}
		return undefined;
	});

	const storedSettingsJSON = browser ? localStorage.getItem('settings') : undefined;

	let settings = $state(
		storedSettingsJSON ? JSON.parse(storedSettingsJSON) : defaultSettings
	) as Settings;

	const fetchMetar = async (..._args: any[]) => {
		try {
			if (!airport) {
				//console.warn(`Invalid ICAO code: ${icao}`);
				rawMetar = undefined;
				return;
			}

			const response = await fetch(`/api/metar`, {
				method: 'POST',
				body: JSON.stringify({ icao: airport.icao_code }),
				headers: {
					'Content-Type': 'application/json'
				}
			});
			if (response.ok) {
				const { metar } = await response.json();

				rawMetar = metar;
			}
			//console.log(`Fetched METAR for ${icao}:`, rawMetar);
		} catch (error) {
			console.error(`Error fetching METAR for ${airport?.icao_code}:`, error);
		}
	};

	$effect(() => {
		if (settings) {
			localStorage.setItem('settings', JSON.stringify(settings));
		}

		inputs.passWt = (inputs.avgPassWt ?? 0) * (inputs.numPass ?? 0);

		fetchMetar(airport?.icao_code);
	});

	let zfw = $derived((inputs.bow ?? 0) + (inputs.cargo ?? 0) + (inputs.passWt ?? 0));
	let grossWeight = $derived(zfw + (inputs.fuelOnBoard ?? 0));
	let takeoffWeight = $derived(grossWeight - (inputs.plannedTaxi ?? 0));

	let vr = $derived(settings.takeoffFlaps === 'Up' ? 102 : 97);
	let v1VrRatio = $derived(1);
	let v1 = $derived(v1VrRatio * vr);
	let accelerateStop: number | undefined = $derived.by(() => {
		if (
			!(
				temperature !== undefined &&
				(settings.usePressureAlt ? pressureAlt !== undefined : elevation !== undefined) &&
				slope !== undefined &&
				headwind !== undefined
			)
		)
			return undefined;

		const accelStopComputer = getAccelStopComputer(settings);

		const pa = (settings.usePressureAlt ? pressureAlt : elevation)!;

		return (
			accelStopComputer(
				temperature,
				pa,
				takeoffWeight,
				slope,
				!settings.useWind ? 0 : headwind,
				v1VrRatio
			) ?? undefined
		);
	});
	let accelerateGo: number | undefined = $derived.by(() => {
		if (
			!(
				temperature !== undefined &&
				(settings.usePressureAlt ? pressureAlt !== undefined : elevation !== undefined) &&
				slope !== undefined &&
				headwind !== undefined
			)
		)
			return undefined;
		const pa = (settings.usePressureAlt ? pressureAlt : elevation)!;

		const accelGoComputer = getAccelGoComputer(settings, pa);

		return (
			accelGoComputer(
				temperature,
				pa,
				takeoffWeight,
				slope,
				!settings.useWind ? 0 : headwind,
				v1VrRatio
			) ?? undefined
		);
	});
	let oneEngineInopClimbRate: number | undefined = $derived.by(() => {
		if (
			!(
				temperature !== undefined &&
				(settings.usePressureAlt ? pressureAlt !== undefined : elevation !== undefined) &&
				takeoffWeight !== undefined
			)
		)
			return undefined;

		const pa = (settings.usePressureAlt ? pressureAlt : elevation)!;
		return climbOneEngineInop(temperature, pa, takeoffWeight) ?? undefined;
	});
	let landingDistance: number | undefined = $derived.by(() => {
		if (
			!(
				temperature !== undefined &&
				(settings.usePressureAlt ? pressureAlt !== undefined : elevation !== undefined) &&
				takeoffWeight !== undefined &&
				headwind !== undefined
			)
		)
			return undefined;

		const pa = (settings.usePressureAlt ? pressureAlt : elevation)!;
		const obstacleHeight = settings.landingObstacle ?? 50;

		return (
			getLandingComputer(settings)?.(
				temperature,
				pa,
				settings.useRealWeightForLanding ? takeoffWeight : 12500,
				slope ?? 0,
				!settings.useWind ? 0 : headwind,
				obstacleHeight
			) ?? undefined
		);
	});

	const recalculateRatio = (..._args: any[]) => {
		if (
			!(
				temperature !== undefined &&
				(settings.usePressureAlt ? pressureAlt !== undefined : elevation !== undefined) &&
				takeoffWeight !== undefined &&
				headwind !== undefined &&
				slope !== undefined
			)
		)
			return;
		const pa = (settings.usePressureAlt ? pressureAlt : elevation)!;
		const currentAccelStop =
			getAccelStopComputer(settings)(
				temperature,
				pa,
				takeoffWeight,
				slope,
				!settings.useWind ? 0 : headwind,
				1
			) ?? 10000;

		if (runway?.length !== undefined && accelerateStop !== undefined) {
			if (currentAccelStop > runway?.length) {
				let newV1Vr = 1;

				let newAccelerateStop =
					getAccelStopComputer({ ...settings, takeoffFlaps: 'Approach' })(
						temperature,
						pa,
						takeoffWeight,
						slope,
						!settings.useWind ? 0 : headwind,
						newV1Vr
					) ?? 0;
				if (newAccelerateStop < runway.length) {
					settings.takeoffFlaps = 'Approach';
					return;
				}

				while (newV1Vr > 0.85 && newAccelerateStop > runway.length) {
					settings.takeoffFlaps = 'Approach';
					newV1Vr -= 0.01;
					newAccelerateStop =
						getAccelStopComputer(settings)(
							temperature,
							pa,
							takeoffWeight,
							slope,
							!settings.useWind ? 0 : headwind,
							newV1Vr
						) ?? 0;
				}

				v1VrRatio = newV1Vr;

				accelerateStop = newAccelerateStop;
			} else {
				v1VrRatio = 1;
				accelerateStop =
					getAccelStopComputer(settings)(
						temperature,
						pa,
						takeoffWeight,
						slope,
						!settings.useWind ? 0 : headwind,
						v1VrRatio
					) ?? 0;
			}
		}
	};

	$effect(() => {
		recalculateRatio(runway?.length, takeoffWeight, settings);
	});

	let settingsOpen = $state(false);
	let infoOpen = $state(false);
</script>

<div class="space-y-6 px-8 pb-8">
	<div class="sticky top-0 z-10 bg-white pt-8 dark:bg-stone-900">
		<div class="flex flex-row justify-between gap-4">
			<div class="flex flex-row gap-2">
				<Button
					color="primary"
					class="my-auto h-min p-2"
					size="sm"
					onclick={() => (settingsOpen = true)}
				>
					<AdjustmentsHorizontalSolid class="h-5 w-5" />
				</Button>
				<DarkMode class="hidden" />
				<Heading class="my-auto font-light" tag="h4">T-54 TOLD</Heading>
				<Button
					color="alternative"
					size="sm"
					class="my-auto h-min rounded-full p-2"
					onclick={() => (infoOpen = true)}
				>
					<InfoCircleSolid class="h-5 w-5" />
				</Button>
			</div>
			<div class="my-auto">
				<ButtonGroup>
					<InputAddon>K</InputAddon>
					<Input
						placeholder="Enter ICAO"
						class="max-w-64"
						bind:value={icao}
						onkeypress={(e) => (e.key === 'Enter' ? fetchMetar() : undefined)}
					/>
					<Button color="primary" size="sm" onclick={() => fetchMetar()}>METAR</Button>
				</ButtonGroup>
			</div>
		</div>
		<Hr />
	</div>
	<div class="flex w-full flex-row gap-4">
		<Label class="flex flex-1 flex-col gap-2">
			<span>1. BOW</span>
			<ButtonGroup class="w-full">
				<Input type="number" min={0} step="100" bind:value={inputs.bow} />
				<InputAddon>lbs</InputAddon>
			</ButtonGroup>
		</Label>
		<Label class="flex flex-1 flex-col gap-2">
			<span>2. Fuel on Board</span>
			<ButtonGroup class="w-full">
				<Input type="number" min={0} step="100" bind:value={inputs.fuelOnBoard} />
				<InputAddon>lbs</InputAddon>
			</ButtonGroup>
		</Label>
	</div>
	<div class="flex w-full flex-row gap-4">
		<Label class="flex flex-1 flex-col gap-2">
			<span>3. Cargo</span>
			<ButtonGroup class="w-full">
				<Input type="number" min={0} step="10" bind:value={inputs.cargo} />
				<InputAddon>lbs</InputAddon>
			</ButtonGroup>
		</Label>
		<Label class="flex flex-1 flex-col gap-2">
			<span>4. Planned Taxi</span>
			<ButtonGroup class="w-full">
				<Input type="number" min={0} step="10" bind:value={inputs.plannedTaxi} />
				<InputAddon>lbs</InputAddon>
			</ButtonGroup>
		</Label>
	</div>
	<div class="flex w-full flex-row gap-4">
		<Label class="flex flex-1 flex-col gap-2">
			<span>5. Pass Wt (8 x 7)</span>
			<ButtonGroup class="w-full">
				<Input type="number" min={0} step="10" bind:value={inputs.passWt} />
				<InputAddon>lbs</InputAddon>
			</ButtonGroup>
		</Label>
		<Label class="flex flex-1 flex-col gap-2">
			<span>6. Planned Reserve</span>
			<ButtonGroup class="w-full">
				<Input type="number" min={0} step="100" bind:value={inputs.plannedReserve} />
				<InputAddon>lbs</InputAddon>
			</ButtonGroup>
		</Label>
	</div>
	<div class="flex w-full flex-row gap-4">
		<Label class="flex flex-1/2 flex-col gap-2">
			<span>7. Avg Pass Wt </span>
			<ButtonGroup class="w-full">
				<Input type="number" min={0} step="10" bind:value={inputs.avgPassWt} />
				<InputAddon>lbs</InputAddon>
			</ButtonGroup>
		</Label>
		<div class="flex-1/2"></div>
	</div>
	<div class="flex w-full flex-row gap-4">
		<Label class="flex flex-1/2 flex-col gap-2">
			<span>8. # Pass </span>
			<ButtonGroup class="w-full">
				<Input type="number" min={0} bind:value={inputs.numPass} />
				<InputAddon>#</InputAddon>
			</ButtonGroup>
		</Label>
		<div class="flex-1/2"></div>
	</div>
	<div class="flex w-full flex-row gap-4">
		<Label class="flex flex-1 flex-col gap-2">
			<span>9. ZFW (1 + 3 + 5)</span>
			<ButtonGroup class="w-full">
				<Input type="number" min={0} step="100" bind:value={zfw} />
				<InputAddon>lbs</InputAddon>
			</ButtonGroup>
		</Label>
		<Label class="flex flex-1 flex-col gap-2">
			<span>11. Takeoff Weight (10 - 4)</span>
			<ButtonGroup class="w-full">
				<Input type="number" min={0} step="100" bind:value={takeoffWeight} />
				<InputAddon>lbs</InputAddon>
			</ButtonGroup>
		</Label>
	</div>
	<div class="flex w-full flex-row gap-4">
		<Label class="flex flex-1/2 flex-col gap-2">
			<span>10. Gross Weight (2 + 9) </span>
			<ButtonGroup class="w-full">
				<Input type="number" min={0} step="100" bind:value={grossWeight} />
				<InputAddon>lbs</InputAddon>
			</ButtonGroup>
		</Label>
		<div class="flex-1/2"></div>
	</div>
	<Hr />
	<div class="gap-4 md:flex md:flex-row md:flex-nowrap">
		<div class="flex-1 space-y-6 md:flex-4/5">
			<Label class="flex flex-row gap-2">
				<span class="flex-1/4">Accelerate Stop Distance - Flaps {settings.takeoffFlaps}</span>
				<ButtonGroup class="w-full">
					<Input type="number" min={0} step="100" bind:value={accelerateStop} />
					<InputAddon>ft</InputAddon>
				</ButtonGroup>
			</Label>
			<Label class="flex flex-row gap-2">
				<span class="flex-1/4">Accelerate Go Distance - Flaps {settings.takeoffFlaps}</span>
				<ButtonGroup class="w-full">
					<Input type="number" min={0} step="100" bind:value={accelerateGo} />
					<InputAddon>ft</InputAddon>
				</ButtonGroup>
			</Label>
			<div class="flex w-full flex-row gap-2">
				<Label class="flex flex-1 flex-col gap-2">
					<span class="flex-1/4">V1</span>
					<ButtonGroup class="w-full">
						<Input type="number" bind:value={v1} min={v1VrRatio * vr} max={vr} />
						<InputAddon>kts</InputAddon>
					</ButtonGroup>
				</Label>
				<P class="my-auto">/</P>
				<Label class="flex flex-1 flex-col gap-2">
					<span class="flex-1/4">Vr</span>
					<ButtonGroup class="w-full">
						<Input type="number" max="102" min="97" bind:value={vr} />
						<InputAddon>kts</InputAddon>
					</ButtonGroup>
				</Label>
				<P class="my-auto">=</P>
				<Label class="flex flex-1 flex-col gap-2">
					<span class="flex-1/4">Ratio</span>
					<ButtonGroup class="w-full">
						<Input type="number" step="0.01" max="1" min="0.85" bind:value={v1VrRatio} />
					</ButtonGroup>
				</Label>
			</div>
			<Label class="flex flex-row gap-2">
				<span class="flex-1/4">One Engine INOP Climb Rate</span>
				<ButtonGroup class="w-full">
					<Input type="number" min={0} step="10" bind:value={oneEngineInopClimbRate} />
					<InputAddon>ft/min</InputAddon>
				</ButtonGroup>
			</Label>
			<Label class="flex flex-row gap-2">
				<span class="flex-1/4">
					Landing Distance - Flaps {settings.landingFlaps} - {settings.landingReverse
						? 'With Rev'
						: 'No Rev'} - {!settings.useRealWeightForLanding
						? '12.5k'
						: `${((takeoffWeight ?? 0) / 1000).toFixed(1)}k`}
				</span>
				<ButtonGroup class="w-full">
					<Input type="number" min={0} step="100" bind:value={landingDistance} />
					<InputAddon>ft</InputAddon>
				</ButtonGroup>
			</Label>
			<Hr />
			<P>{rawMetar}</P>
		</div>
		<div
			class="flex-1 space-y-2 border-t-1 border-gray-200 pt-4 pl-4 md:flex-1/5 md:border-t-0 md:border-l-1 md:pt-0 dark:border-gray-700"
		>
			<P class="text-center">Conditions</P>
			<Label class="flex flex-col gap-2">
				<span class="flex-1/4">Temp</span>
				<ButtonGroup>
					<Input type="number" min={-50} max={60} bind:value={temperature} />
					<InputAddon>°C</InputAddon>
				</ButtonGroup>
			</Label>
			<Label class="flex flex-col gap-2">
				<span class="flex-1/4">Elevation</span>
				<ButtonGroup>
					<Input type="number" step="10" bind:value={elevation} />
					<InputAddon>ft</InputAddon>
				</ButtonGroup>
			</Label>
			<Label class="flex flex-col gap-2">
				<span class="flex-1/4">Weight</span>
				<ButtonGroup>
					<Input type="number" min={0} step="100" bind:value={takeoffWeight} />
					<InputAddon>lbs</InputAddon>
				</ButtonGroup>
			</Label>
			<Label class="flex flex-col gap-2">
				<span class="flex-1/4">Slope</span>
				<ButtonGroup>
					<Input type="number" step="0.1" min={-2} max="2" bind:value={slope} />
					<InputAddon>°</InputAddon>
				</ButtonGroup>
			</Label>

			<div class="flex flex-row gap-2">
				<Label class="flex flex-1/2 flex-col gap-2">
					<span class="flex-1/4">HW</span>
					<ButtonGroup>
						<Input type="number" max="30" min={-10} bind:value={headwind} />
						<InputAddon>kts</InputAddon>
					</ButtonGroup>
				</Label>
				<Label class="flex flex-1/2 flex-col gap-2">
					<span class="flex-1/4">XW</span>
					<ButtonGroup>
						<Input type="number" max="30" min={-10} bind:value={crosswind} />
						<InputAddon>kts</InputAddon>
					</ButtonGroup>
				</Label>
			</div>
			{#if runway}
				<div class="flex flex-row gap-2">
					<Label class="flex flex-1/2 flex-col gap-2">
						<span class="flex-1/4">Runway</span>
						<Select
							size="md"
							class="h-full"
							bind:value={runway.ident}
							items={runways
								.map((rwy) => ({ value: rwy.he_ident, name: rwy.he_ident }))
								.concat(runways.map((rwy) => ({ value: rwy.le_ident, name: rwy.le_ident })))}
							onchange={() => {
								settings.takeoffFlaps = 'Up';
								const selectedRunway = runways.find(
									(r) => r.he_ident === runway?.ident || r.le_ident === runway?.ident
								);

								if (!(selectedRunway && windDirection && windSpeed)) return;

								const { headwind, crosswind } = computeWindComponents(
									selectedRunway.he_heading_degT,
									windDirection,
									windSpeed
								);
								if (selectedRunway.he_ident === runway?.ident) {
									runway = {
										ident: selectedRunway.he_ident,
										heading: selectedRunway.he_heading_degT,
										headwind: headwind,
										crosswind: crosswind,
										length: selectedRunway.length_ft
									};
								} else {
									runway = {
										ident: selectedRunway.le_ident,
										heading: selectedRunway.le_heading_degT,
										headwind: -headwind,
										crosswind: -crosswind,
										length: selectedRunway.length_ft
									};
								}
								recalculateRatio();
							}}
						/>
					</Label>
					<Label class="flex flex-1/2 flex-col gap-2">
						<span class="flex-1/4">Runway Length</span>
						<ButtonGroup>
							<Input
								type="number"
								min="0"
								step="100"
								onchange={() => {
									settings.takeoffFlaps = 'Up';
									recalculateRatio();
								}}
								bind:value={runway.length}
							/>
							<InputAddon>ft</InputAddon>
						</ButtonGroup>
					</Label>
				</div>
			{/if}
			<div class="flex flex-row gap-2">
				<Label class="flex flex-1/2 flex-col gap-2">
					<span class="flex-1/4">Wind Direction</span>
					<ButtonGroup>
						<Input type="number" bind:value={windDirection} max="360" min="1" step="10" />
						<InputAddon>°T</InputAddon>
					</ButtonGroup>
				</Label>

				<Label class="flex flex-1/2 flex-col gap-2">
					<span class="flex-1/4">Wind Speed</span>
					<ButtonGroup>
						<Input type="number" bind:value={windSpeed} min="0" />
						<InputAddon>kts</InputAddon>
					</ButtonGroup>
				</Label>
			</div>
			<div class="flex flex-row gap-2">
				<Label class="flex flex-1/2 flex-col gap-2">
					<span class="flex-1/4">Altimeter</span>
					<ButtonGroup>
						<Input type="number" step="0.01" bind:value={altimeter} min="0" />
						<InputAddon>inHg</InputAddon>
					</ButtonGroup>
				</Label>
				<Label class="flex flex-1/2 flex-col gap-2">
					<span class="flex-1/4">Pressure Altitude</span>
					<ButtonGroup>
						<Input type="number" bind:value={pressureAlt} step="10" />
						<InputAddon>ft</InputAddon>
					</ButtonGroup>
				</Label>
			</div>
		</div>
	</div>
</div>

<Modal title="Settings" bind:open={settingsOpen} size="md">
	<div class="w-full text-center">
		<DarkMode />
	</div>
	<div class="space-y-6">
		<div class="flex flex-row gap-4">
			<Label class="flex flex-1 flex-row gap-2">
				<Toggle type="checkbox" bind:checked={settings.useWind} class="form-checkbox" />
				<span>Wind</span>
			</Label>
			<Label class="flex flex-1 flex-row gap-2">
				<Toggle type="checkbox" bind:checked={settings.wetRunway} class="form-checkbox" />
				<span>Wet Runway</span>
			</Label>
		</div>
		<Label class="flex  flex-row gap-2">
			<Toggle type="checkbox" bind:checked={settings.usePressureAlt} class="form-checkbox" />
			<span>Pressure Altitude (instead of airfield elevation)</span>
		</Label>

		<Label class="flex flex-col gap-2">
			<span>Takeoff Flaps</span>
			<Select
				disabled={(() => {
					if (
						!(
							temperature !== undefined &&
							(settings.usePressureAlt ? pressureAlt !== undefined : elevation !== undefined) &&
							takeoffWeight !== undefined &&
							headwind !== undefined &&
							slope !== undefined
						)
					)
						return false;

					const pa = (settings.usePressureAlt ? pressureAlt : elevation)!;

					const flapsUpAccelStop =
						getAccelStopComputer({ ...settings, takeoffFlaps: 'Up' })(
							temperature,
							pa,
							takeoffWeight,
							!settings.useWind ? 0 : headwind,
							slope,
							v1VrRatio
						) ?? undefined;

					if (flapsUpAccelStop === undefined) return false;

					if (runway?.length === undefined) return false;

					return flapsUpAccelStop > runway?.length;
				})()}
				bind:value={settings.takeoffFlaps}
				items={[
					{ value: 'Up', name: 'Up' },
					{ value: 'Approach', name: 'Approach' }
				]}
			/>
		</Label>
		<Hr />
		<div class="flex flex-row gap-4">
			<Label class="flex flex-1 flex-row gap-2">
				<Toggle type="checkbox" bind:checked={settings.landingReverse} />
				<span>Landing Reverse Thrust</span>
			</Label>
			<Label class="flex flex-1 flex-row gap-2">
				<Toggle type="checkbox" bind:checked={settings.useRealWeightForLanding} />
				<span>Takeoff Weight for Landing</span>
			</Label>
		</div>
		<div class="flex flex-row gap-4">
			<Label class="flex flex-1 flex-col gap-2">
				<span>Landing Obstacle</span>
				<Input max="50" min="0" type="number" bind:value={settings.landingObstacle} />
			</Label>
			<Label class="flex flex-1 flex-col gap-2">
				<span>Landing Flaps</span>
				<Select
					class="h-full"
					bind:value={settings.landingFlaps}
					items={[
						{ value: 'Up', name: 'Up' },
						{ value: 'Approach', name: 'Approach' },
						{ value: 'Down', name: 'Down' }
					]}
				/>
			</Label>
		</div>
	</div>
	<div class="w-full text-end">
		<Button class="text-end" color="primary" onclick={() => (settingsOpen = false)}>Close</Button>
	</div>
</Modal>
<Modal title="About" bind:open={infoOpen} size="md">
	<P class="text-center">
		This is a T-54 TOLD calculator. It is not an official tool and is not endorsed by CNATRA.
		Abberations and errors are expected. Use at your own risk.
	</P>
	<P class="text-center">
		Developed by Miguel Mathias. Source code available on{' '}
		<a
			href="https://github.com/MiguelMathias/t54-told"
			class="text-blue-500 hover:underline"
			target="_blank">GitHub</a
		>.
	</P>
	<div class="w-full text-end">
		<Button class="text-end" color="primary" onclick={() => (infoOpen = false)}>Close</Button>
	</div>
</Modal>
