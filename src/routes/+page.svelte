<script lang="ts">
	import { browser } from '$app/environment';
	import airports from '$lib/airports.json';
	import {
		accelGoFlapsApproachGreaterThan10KPA,
		accelGoFlapsApproachLessThan10KPA,
		accelGoFlapsUpGreaterThan10KPA,
		accelGoFlapsUpLessThan10KPA,
		accelStopFlapsApproachDry,
		accelStopFlapsApproachWet,
		accelStopFlapsUpDry,
		accelStopFlapsUpWet,
		climbOneEngineInop,
		landingDistanceNoRevFlapsApproachDry,
		landingDistanceNoRevFlapsDownDry,
		landingDistanceNoRevFlapsDownWet,
		landingDistanceNoRevFlapsUpDry,
		landingDistanceNoRevFlapsUpWet,
		landingDistanceWithRevFlapsApproachDry,
		landingDistanceWithRevFlapsDownDry,
		landingDistanceWithRevFlapsDownWet,
		landingDistanceWithRevFlapsUpDry,
		landingDistanceWithRevFlapsUpWet
	} from '$lib/computer';
	import runways from '$lib/runways.json';
	import {
		defaultConditions,
		defaultInputs,
		defaultOutputs,
		defaultSettings,
		findBestRunwayForTakeoff,
		type Airport,
		type Runway,
		type Settings
	} from '$lib/types';
	import {
		Button,
		ButtonGroup,
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

	let conditions = $state({ ...defaultConditions });

	const storedSettingsJSON = browser ? localStorage.getItem('settings') : undefined;

	let settings = $state(
		storedSettingsJSON ? JSON.parse(storedSettingsJSON) : defaultSettings
	) as Settings;

	$effect(() => {
		if (settings) {
			localStorage.setItem('settings', JSON.stringify(settings));
		}
	});

	let outputs = $derived.by(() => {
		inputs;
		conditions;
		settings;

		const outputs = { ...defaultOutputs };

		if (inputs.bow && inputs.cargo && inputs.passWt)
			outputs.zfw = inputs.bow + inputs.cargo + inputs.passWt;
		else outputs.zfw = undefined;

		if (inputs.fuelOnBoard && outputs.zfw) outputs.grossWeight = inputs.fuelOnBoard + outputs.zfw;
		else outputs.grossWeight = undefined;

		if (outputs.grossWeight && inputs.plannedTaxi)
			outputs.takeoffWeight = outputs.grossWeight - inputs.plannedTaxi;
		else outputs.takeoffWeight = undefined;

		if (
			conditions.temperature &&
			((settings.usePressureAlt && conditions.pressureAlt) || conditions.elevation) &&
			outputs.takeoffWeight &&
			(settings.useNoWind || conditions.hwTw !== undefined)
		) {
			const oat = conditions.temperature;
			const pa = (settings.usePressureAlt ? conditions.pressureAlt : conditions.elevation)!;
			const weight = outputs.takeoffWeight;
			const slope = conditions.slope ?? 0;
			const hwTw = (settings.useNoWind ? 0 : conditions.hwTw)!;
			const v1 = settings.takeoffFlaps === 'Up' ? 102 : 97;
			const vr = settings.takeoffFlaps === 'Up' ? 102 : 97;
			const v1VrRatio = v1 / vr;
			const obstacleHeight = settings.landingObstacle ?? 50;

			outputs.v1 = v1;
			outputs.vr = vr;
			outputs.v1VrRatio = outputs.v1 / outputs.vr;

			switch (settings.takeoffFlaps) {
				case 'Up':
					if (settings.wetRunway)
						outputs.accelerateStop =
							accelStopFlapsUpWet(oat, pa, weight, slope, hwTw, v1VrRatio) ?? undefined;
					else
						outputs.accelerateStop =
							accelStopFlapsUpDry(oat, pa, weight, slope, hwTw, v1VrRatio) ?? undefined;

					if (pa > 10000)
						outputs.accelerateGo =
							accelGoFlapsUpGreaterThan10KPA(oat, pa, weight, slope, hwTw, v1VrRatio) ?? undefined;
					else
						outputs.accelerateGo =
							accelGoFlapsUpLessThan10KPA(oat, pa, weight, slope, hwTw, v1VrRatio) ?? undefined;

					break;
				case 'Approach':
					if (settings.wetRunway)
						outputs.accelerateStop =
							accelStopFlapsApproachWet(oat, pa, weight, slope, hwTw, v1VrRatio) ?? undefined;
					else
						outputs.accelerateStop =
							accelStopFlapsApproachDry(oat, pa, weight, slope, hwTw, v1VrRatio) ?? undefined;

					if (pa > 10000)
						outputs.accelerateGo =
							accelGoFlapsApproachGreaterThan10KPA(oat, pa, weight, slope, hwTw, v1VrRatio) ??
							undefined;
					else
						outputs.accelerateGo =
							accelGoFlapsApproachLessThan10KPA(oat, pa, weight, slope, hwTw, v1VrRatio) ??
							undefined;

					break;
			}

			outputs.oneEngineInopClimbRate = climbOneEngineInop(oat, pa, weight) ?? undefined;

			switch (settings.landingReverse) {
				case true:
					switch (settings.landingFlaps) {
						case 'Up':
							if (settings.wetRunway) {
								const dist =
									landingDistanceWithRevFlapsDownWet(
										oat,
										pa,
										weight,
										slope,
										hwTw,
										obstacleHeight
									) ?? undefined;
								outputs.landingDistance = dist
									? (landingDistanceWithRevFlapsUpWet(dist) ?? undefined)
									: undefined;
							} else {
								const dist =
									landingDistanceWithRevFlapsDownDry(
										oat,
										pa,
										weight,
										slope,
										hwTw,
										obstacleHeight
									) ?? undefined;
								outputs.landingDistance = dist
									? (landingDistanceWithRevFlapsUpDry(dist) ?? undefined)
									: undefined;
							}
							break;
						case 'Approach':
							if (settings.wetRunway) outputs.landingDistance = undefined;
							else
								outputs.landingDistance =
									landingDistanceWithRevFlapsApproachDry(
										oat,
										pa,
										weight,
										slope,
										hwTw,
										obstacleHeight
									) ?? undefined;
							break;
						case 'Down':
							if (settings.wetRunway)
								outputs.landingDistance =
									landingDistanceWithRevFlapsDownWet(
										oat,
										pa,
										weight,
										slope,
										hwTw,
										obstacleHeight
									) ?? undefined;
							else
								outputs.landingDistance =
									landingDistanceWithRevFlapsDownDry(
										oat,
										pa,
										weight,
										slope,
										hwTw,
										obstacleHeight
									) ?? undefined;
							break;
					}
					break;
				case false:
					switch (settings.landingFlaps) {
						case 'Up':
							if (settings.wetRunway) {
								const dist =
									landingDistanceNoRevFlapsDownWet(oat, pa, weight, slope, hwTw, obstacleHeight) ??
									undefined;
								outputs.landingDistance = dist
									? (landingDistanceNoRevFlapsUpWet(dist) ?? undefined)
									: undefined;
							} else {
								const dist =
									landingDistanceNoRevFlapsDownDry(oat, pa, weight, slope, hwTw, obstacleHeight) ??
									undefined;
								outputs.landingDistance = dist
									? (landingDistanceNoRevFlapsUpDry(dist) ?? undefined)
									: undefined;
							}
							break;
						case 'Approach':
							if (settings.wetRunway) outputs.landingDistance = undefined;
							else
								outputs.landingDistance =
									landingDistanceNoRevFlapsApproachDry(
										oat,
										pa,
										weight,
										slope,
										hwTw,
										obstacleHeight
									) ?? undefined;
							break;
						case 'Down':
							if (settings.wetRunway)
								outputs.landingDistance =
									landingDistanceNoRevFlapsDownWet(oat, pa, weight, slope, hwTw, obstacleHeight) ??
									undefined;
							else
								outputs.landingDistance =
									landingDistanceNoRevFlapsDownDry(oat, pa, weight, slope, hwTw, obstacleHeight) ??
									undefined;
							break;
					}
					break;
			}
		}

		return outputs;
	});

	let settingsOpen = $state(false);
	let infoOpen = $state(false);

	let icao = $state('NGP');
	let metar = $state('');

	const findAirportByICAO = (icao: string): Airport | undefined =>
		(airports as Airport[]).find((airport) => airport.ident === icao.toUpperCase());

	const findRunwaysByICAO = (icao: string): Runway[] =>
		(runways as Runway[]).filter((runway) => runway.airport_ident === icao.toUpperCase());

	const fetchMetar = async () => {
		if (icao.startsWith('K') && icao.length === 4) icao = icao.slice(1);

		const airport = findAirportByICAO(`K${icao}`);
		const runways = findRunwaysByICAO(`K${icao}`);

		const response = await fetch(
			`https://api.allorigins.win/get?url=${encodeURIComponent(
				`https://www.aviationweather.gov/cgi-bin/data/metar.php?ids=K${icao}`
			)}`
		);
		const data = await response.json();

		metar = data.contents.trim();

		const windMatch = metar.match(/(\d{3})(\d{2,3})(G\d{2,3})?KT/);
		const tempMatch = metar.match(/M?(\d{2})\/M?(\d{2})/);
		const altimeterMatch = metar.match(/A(\d{4})/);

		const windDirection = windMatch ? parseInt(windMatch[1]) : 0;
		const windSpeed = windMatch ? parseInt(windMatch[2]) : 0;
		const temp = tempMatch
			? tempMatch[1].startsWith('M')
				? -parseInt(tempMatch[1].slice(1))
				: parseInt(tempMatch[1])
			: undefined;
		const altimeter = altimeterMatch ? parseInt(altimeterMatch[1]) / 100 : undefined;

		conditions.temperature = temp;
		conditions.elevation = airport?.elevation_ft;
		const bestRunway = findBestRunwayForTakeoff(runways, windDirection, windSpeed);
		conditions.runway = bestRunway ?? undefined;
		conditions.hwTw = bestRunway?.headwind || undefined;
		console.log(altimeter);
		conditions.pressureAlt =
			airport?.elevation_ft && altimeter
				? (29.92 - altimeter) * 1000 + airport.elevation_ft
				: undefined;
	};
</script>

<div class="space-y-6 p-8">
	<div class="flex flex-row justify-between">
		<div class="flex flex-row gap-4">
			<Button color="primary" size="sm" onclick={() => (settingsOpen = true)}>
				<AdjustmentsHorizontalSolid class="h-5 w-5" />
			</Button>
			<!-- <DarkMode /> -->
			<Heading class="my-auto font-light" tag="h4">T-54 TOLD</Heading>
			<Button color="alternative" size="sm" class="rounded-full" onclick={() => (infoOpen = true)}>
				<InfoCircleSolid class="h-5 w-5" />
			</Button>
		</div>
		<div>
			<ButtonGroup>
				<InputAddon>K</InputAddon>
				<Input placeholder="Enter ICAO" class="w-64" bind:value={icao} />
				<Button color="primary" size="sm" onclick={fetchMetar}>METAR</Button>
			</ButtonGroup>
		</div>
	</div>
	<Hr />
	<div class="flex w-full flex-row gap-4">
		<Label class="flex flex-1 flex-col gap-2">
			<span>1. BOW</span>
			<Input type="number" bind:value={inputs.bow} />
		</Label>
		<Label class="flex flex-1 flex-col gap-2">
			<span>2. Fuel on Board</span>
			<Input type="number" bind:value={inputs.fuelOnBoard} />
		</Label>
	</div>
	<div class="flex w-full flex-row gap-4">
		<Label class="flex flex-1 flex-col gap-2">
			<span>3. Cargo</span>
			<Input type="number" bind:value={inputs.cargo} />
		</Label>
		<Label class="flex flex-1 flex-col gap-2">
			<span>4. Planned Taxi</span>
			<Input type="number" placeholder="90" bind:value={inputs.plannedTaxi} />
		</Label>
	</div>
	<div class="flex w-full flex-row gap-4">
		<Label class="flex flex-1 flex-col gap-2">
			<span>5. Pass Wt (8 x 7)</span>
			<Input type="number" bind:value={inputs.passWt} />
		</Label>
		<Label class="flex flex-1 flex-col gap-2">
			<span>6. Planned Reserve</span>
			<Input type="number" placeholder="600" bind:value={inputs.plannedReserve} />
		</Label>
	</div>
	<div class="flex w-full flex-row gap-4">
		<Label class="flex flex-1/2 flex-col gap-2">
			<span>7. Avg Pass Wt </span>
			<Input type="number" placeholder="200" bind:value={inputs.avgPassWt} />
		</Label>
		<div class="flex-1/2"></div>
	</div>
	<div class="flex w-full flex-row gap-4">
		<Label class="flex flex-1/2 flex-col gap-2">
			<span>8. # Pass </span>
			<Input type="number" placeholder="1" bind:value={inputs.numPass} />
		</Label>
		<div class="flex-1/2"></div>
	</div>
	<div class="flex w-full flex-row gap-4">
		<Label class="flex flex-1 flex-col gap-2">
			<span>9. ZFW (1 + 3 + 5)</span>
			<Input type="number" bind:value={outputs.zfw} />
		</Label>
		<Label class="flex flex-1 flex-col gap-2">
			<span>11. Takeoff Weight (10 - 4)</span>
			<Input type="number" bind:value={outputs.takeoffWeight} />
		</Label>
	</div>
	<div class="flex w-full flex-row gap-4">
		<Label class="flex flex-1/2 flex-col gap-2">
			<span>10. Gross Weight (2 + 9) </span>
			<Input type="number" bind:value={outputs.grossWeight} />
		</Label>
		<div class="flex-1/2"></div>
	</div>
	<Hr />
	<div class="flex flex-row gap-4">
		<div class="flex-4/5 space-y-6">
			<Label class="flex flex-row gap-2">
				<span class="flex-1/4">Accelerate Stop Distance</span>
				<Input type="number" bind:value={outputs.accelerateStop} />
			</Label>
			<Label class="flex flex-row gap-2">
				<span class="flex-1/4">Accelerate Go Distance</span>
				<Input type="number" bind:value={outputs.accelerateGo} />
			</Label>
			<div>
				<Label class="flex flex-row gap-2">
					<span class="flex-1/4">V1</span>
					<Input type="number" bind:value={outputs.v1} />
				</Label>
			</div>
			<Label class="flex flex-row gap-2">
				<span class="flex-1/4">One Engine INOP Climb Rate</span>
				<Input type="number" bind:value={outputs.oneEngineInopClimbRate} />
			</Label>
			<Label class="flex flex-row gap-2">
				<span class="flex-1/4">Landing Distance</span>
				<Input type="number" bind:value={outputs.landingDistance} />
			</Label>
			<Hr />
			<P>{metar}</P>
		</div>
		<div class="flex-1/5 space-y-2 border-l-1 border-gray-200 pl-4">
			<P class="text-center">Conditions</P>
			<Label class="flex flex-col gap-2">
				<span class="flex-1/4">Temp</span>
				<Input type="number" bind:value={conditions.temperature} />
			</Label>
			<Label class="flex flex-col gap-2">
				<span class="flex-1/4">Elevation</span>
				<Input type="number" bind:value={conditions.elevation} />
			</Label>
			<Label class="flex flex-col gap-2">
				<span class="flex-1/4">Weight</span>
				<Input type="number" bind:value={outputs.takeoffWeight} />
			</Label>
			<Label class="flex flex-col gap-2">
				<span class="flex-1/4">Slope</span>
				<Input type="number" bind:value={conditions.slope} />
			</Label>
			<div class="flex flex-row gap-2">
				{#if conditions.runway}
					<Label class="flex flex-1/2 flex-col gap-2">
						<span class="flex-1/4">Runway</span>
						<Input bind:value={conditions.runway.id} />
					</Label>
				{/if}

				<Label class="flex flex-1/2 flex-col gap-2">
					<span class="flex-1/4">HW/TW</span>
					<Input type="number" bind:value={conditions.hwTw} />
				</Label>
			</div>
			<Label class="flex flex-col gap-2">
				<span class="flex-1/4">Pressure Altitude</span>
				<Input type="number" bind:value={conditions.pressureAlt} />
			</Label>
		</div>
	</div>
</div>

<Modal title="Settings" bind:open={settingsOpen} size="md">
	<div class="space-y-6 p-8">
		<Label class="flex flex-row gap-2">
			<Toggle type="checkbox" bind:checked={settings.useNoWind} class="form-checkbox" />
			<span>Use No Wind</span>
		</Label>
		<Label class="flex flex-row gap-2">
			<Toggle type="checkbox" bind:checked={settings.usePressureAlt} class="form-checkbox" />
			<span>Use Pressure Altitude (instead of airfield elevation)</span>
		</Label>
		<Label class="flex flex-row gap-2">
			<Toggle type="checkbox" bind:checked={settings.wetRunway} class="form-checkbox" />
			<span>Wet Runway</span>
		</Label>
		<Label class="flex flex-col gap-2">
			<span>Takeoff Flaps</span>
			<Select
				bind:value={settings.takeoffFlaps}
				items={[
					{ value: 'Up', name: 'Up' },
					{ value: 'Approach', name: 'Approach' }
				]}
			/>
		</Label>
		<Label class="flex flex-row gap-2">
			<Toggle type="checkbox" bind:checked={settings.landingReverse} />

			<span>Landing Reverse Thrust</span>
		</Label>
		<Label class="flex flex-col gap-2">
			<span>Landing Obstacle</span>
			<Input max="50" min="0" type="number" bind:value={settings.landingObstacle} />
		</Label>
		<Label class="flex flex-col gap-2">
			<span>Landing Flaps</span>
			<Select
				bind:value={settings.landingFlaps}
				items={[
					{ value: 'Up', name: 'Up' },
					{ value: 'Approach', name: 'Approach' },
					{ value: 'Down', name: 'Down' }
				]}
			/>
		</Label>
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
