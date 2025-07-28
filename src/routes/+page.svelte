<script lang="ts">
	import { browser } from '$app/environment';
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
		computeWindComponents,
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
	import {
		defaultConditions,
		defaultInputs,
		defaultOutputs,
		defaultSettings,
		findAirportByICAO,
		findBestRunwayForTakeoff,
		findRunwaysByICAO,
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

	let airport: Airport | undefined = $derived.by(() => {
		if (icao.startsWith('K') && icao.length === 4) icao = icao.slice(1);
		return findAirportByICAO(`K${icao}`);
	});
	let runways: Runway[] = $derived.by(() => {
		if (icao.startsWith('K') && icao.length === 4) icao = icao.slice(1);
		return findRunwaysByICAO(`K${icao}`);
	});

	const updateConditions = async () => {
		try {
			//if (icao.startsWith('K') && icao.length === 4) icao = icao.slice(1);
			if (icao.length !== 3) return;

			const airport = findAirportByICAO(`K${icao}`);
			const runways = findRunwaysByICAO(`K${icao}`);

			const response = await fetch(
				`https://api.allorigins.win/get?url=${encodeURIComponent(
					`https://www.aviationweather.gov/cgi-bin/data/metar.php?ids=K${icao}`
				)}`
			);
			const data = await response.json();

			conditions.rawMetar = data.contents.trim();

			const windMatch = conditions.rawMetar?.match(/(\d{3})(\d{2,3})(G\d{2,3})?KT/);
			const tempMatch = conditions.rawMetar?.match(/M?(\d{2})\/M?(\d{2})/);
			const altimeterMatch = conditions.rawMetar?.match(/A(\d{4})/);

			conditions.windDirection = windMatch ? parseInt(windMatch[1]) : 0;
			conditions.windSpeed = windMatch ? parseInt(windMatch[2]) : 0;
			conditions.temperature = tempMatch
				? tempMatch[1].startsWith('M')
					? -parseInt(tempMatch[1].slice(1))
					: parseInt(tempMatch[1])
				: undefined;
			conditions.altimeter = altimeterMatch ? parseInt(altimeterMatch[1]) / 100 : undefined;

			conditions.elevation = airport?.elevation_ft;
			const bestRunway = findBestRunwayForTakeoff(
				runways,
				conditions.windDirection,
				conditions.windSpeed
			);
			conditions.runway = bestRunway ?? undefined;
			conditions.hwTw = bestRunway?.headwind || undefined;
			conditions.xw = bestRunway?.crosswind || undefined;

			conditions.pressureAlt =
				airport?.elevation_ft && conditions.altimeter
					? (29.92 - conditions.altimeter) * 1000 + airport.elevation_ft
					: undefined;
		} catch (error) {
			console.error(error);
		}
	};
	$effect(() => {
		icao;
		updateConditions();
	});
</script>

<div class="space-y-6 p-8">
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
			<!-- <DarkMode /> -->
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
		<div>
			<ButtonGroup>
				<InputAddon>K</InputAddon>
				<Input
					placeholder="Enter ICAO"
					class="max-w-64"
					bind:value={icao}
					onkeypress={(e) => (e.key === 'Enter' ? updateConditions() : undefined)}
				/>
				<Button color="primary" size="sm" onclick={updateConditions}>METAR</Button>
			</ButtonGroup>
		</div>
	</div>
	<Hr />
	<div class="flex w-full flex-row gap-4">
		<Label class="flex flex-1 flex-col gap-2">
			<span>1. BOW</span>
			<ButtonGroup class="w-full">
				<Input type="number" bind:value={inputs.bow} />
				<InputAddon>lbs</InputAddon>
			</ButtonGroup>
		</Label>
		<Label class="flex flex-1 flex-col gap-2">
			<span>2. Fuel on Board</span>
			<ButtonGroup class="w-full">
				<Input type="number" bind:value={inputs.fuelOnBoard} />
				<InputAddon>lbs</InputAddon>
			</ButtonGroup>
		</Label>
	</div>
	<div class="flex w-full flex-row gap-4">
		<Label class="flex flex-1 flex-col gap-2">
			<span>3. Cargo</span>
			<ButtonGroup class="w-full">
				<Input type="number" bind:value={inputs.cargo} />
				<InputAddon>lbs</InputAddon>
			</ButtonGroup>
		</Label>
		<Label class="flex flex-1 flex-col gap-2">
			<span>4. Planned Taxi</span>
			<ButtonGroup class="w-full">
				<Input type="number" bind:value={inputs.plannedTaxi} />
				<InputAddon>lbs</InputAddon>
			</ButtonGroup>
		</Label>
	</div>
	<div class="flex w-full flex-row gap-4">
		<Label class="flex flex-1 flex-col gap-2">
			<span>5. Pass Wt (8 x 7)</span>
			<ButtonGroup class="w-full">
				<Input type="number" bind:value={inputs.passWt} />
				<InputAddon>lbs</InputAddon>
			</ButtonGroup>
		</Label>
		<Label class="flex flex-1 flex-col gap-2">
			<span>6. Planned Reserve</span>
			<ButtonGroup class="w-full">
				<Input type="number" bind:value={inputs.plannedReserve} />
				<InputAddon>lbs</InputAddon>
			</ButtonGroup>
		</Label>
	</div>
	<div class="flex w-full flex-row gap-4">
		<Label class="flex flex-1/2 flex-col gap-2">
			<span>7. Avg Pass Wt </span>
			<ButtonGroup class="w-full">
				<Input type="number" bind:value={inputs.avgPassWt} />
				<InputAddon>lbs</InputAddon>
			</ButtonGroup>
		</Label>
		<div class="flex-1/2"></div>
	</div>
	<div class="flex w-full flex-row gap-4">
		<Label class="flex flex-1/2 flex-col gap-2">
			<span>8. # Pass </span>
			<ButtonGroup class="w-full">
				<Input type="number" bind:value={inputs.numPass} />
				<InputAddon>lbs</InputAddon>
			</ButtonGroup>
		</Label>
		<div class="flex-1/2"></div>
	</div>
	<div class="flex w-full flex-row gap-4">
		<Label class="flex flex-1 flex-col gap-2">
			<span>9. ZFW (1 + 3 + 5)</span>
			<ButtonGroup class="w-full">
				<Input type="number" bind:value={outputs.zfw} />
				<InputAddon>lbs</InputAddon>
			</ButtonGroup>
		</Label>
		<Label class="flex flex-1 flex-col gap-2">
			<span>11. Takeoff Weight (10 - 4)</span>
			<ButtonGroup class="w-full">
				<Input type="number" bind:value={outputs.takeoffWeight} />
				<InputAddon>lbs</InputAddon>
			</ButtonGroup>
		</Label>
	</div>
	<div class="flex w-full flex-row gap-4">
		<Label class="flex flex-1/2 flex-col gap-2">
			<span>10. Gross Weight (2 + 9) </span>
			<ButtonGroup class="w-full">
				<Input type="number" bind:value={outputs.grossWeight} />
				<InputAddon>lbs</InputAddon>
			</ButtonGroup>
		</Label>
		<div class="flex-1/2"></div>
	</div>
	<Hr />
	<div class="gap-4 md:flex md:flex-row md:flex-nowrap">
		<div class="flex-1 space-y-6 md:flex-4/5">
			<Label class="flex flex-row gap-2">
				<span class="flex-1/4">Accelerate Stop Distance</span>
				<ButtonGroup class="w-full">
					<Input type="number" bind:value={outputs.accelerateStop} />
					<InputAddon>ft</InputAddon>
				</ButtonGroup>
			</Label>
			<Label class="flex flex-row gap-2">
				<span class="flex-1/4">Accelerate Go Distance</span>
				<ButtonGroup class="w-full">
					<Input type="number" bind:value={outputs.accelerateGo} />
					<InputAddon>ft</InputAddon>
				</ButtonGroup>
			</Label>
			<div>
				<Label class="flex flex-row gap-2">
					<span class="flex-1/4">V1</span>
					<ButtonGroup class="w-full">
						<Input type="number" bind:value={outputs.v1} />
						<InputAddon>kts</InputAddon>
					</ButtonGroup>
				</Label>
			</div>
			<Label class="flex flex-row gap-2">
				<span class="flex-1/4">One Engine INOP Climb Rate</span>
				<ButtonGroup class="w-full">
					<Input type="number" bind:value={outputs.oneEngineInopClimbRate} />
					<InputAddon>ft/min</InputAddon>
				</ButtonGroup>
			</Label>
			<Label class="flex flex-row gap-2">
				<span class="flex-1/4">Landing Distance</span>
				<ButtonGroup class="w-full">
					<Input type="number" bind:value={outputs.landingDistance} />
					<InputAddon>ft</InputAddon>
				</ButtonGroup>
			</Label>
			<Hr />
			<P>{conditions.rawMetar}</P>
		</div>
		<div
			class="flex-1 space-y-2 border-t-1 border-gray-200 pt-4 pl-4 md:flex-1/5 md:border-t-0 md:border-l-1"
		>
			<P class="text-center">Conditions</P>
			<Label class="flex flex-col gap-2">
				<span class="flex-1/4">Temp</span>
				<ButtonGroup>
					<Input type="number" bind:value={conditions.temperature} />
					<InputAddon>°C</InputAddon>
				</ButtonGroup>
			</Label>
			<Label class="flex flex-col gap-2">
				<span class="flex-1/4">Elevation</span>
				<ButtonGroup>
					<Input type="number" bind:value={conditions.elevation} />
					<InputAddon>ft</InputAddon>
				</ButtonGroup>
			</Label>
			<Label class="flex flex-col gap-2">
				<span class="flex-1/4">Weight</span>
				<ButtonGroup>
					<Input type="number" bind:value={outputs.takeoffWeight} />
					<InputAddon>lbs</InputAddon>
				</ButtonGroup>
			</Label>
			<Label class="flex flex-col gap-2">
				<span class="flex-1/4">Slope</span>
				<ButtonGroup>
					<Input type="number" bind:value={conditions.slope} />
					<InputAddon>°</InputAddon>
				</ButtonGroup>
			</Label>

			<div class="flex flex-row gap-2">
				<Label class="flex flex-1/2 flex-col gap-2">
					<span class="flex-1/4">HW/TW</span>
					<ButtonGroup>
						<Input type="number" bind:value={conditions.hwTw} />
						<InputAddon>kts</InputAddon>
					</ButtonGroup>
				</Label>
				<Label class="flex flex-1/2 flex-col gap-2">
					<span class="flex-1/4">XW</span>
					<ButtonGroup>
						<Input type="number" bind:value={conditions.xw} />
						<InputAddon>kts</InputAddon>
					</ButtonGroup>
				</Label>
			</div>
			{#if conditions.runway}
				<Label class="flex flex-1/2 flex-col gap-2">
					<span class="flex-1/4">Runway</span>
					<Select
						size="md"
						class="h-full"
						bind:value={conditions.runway.ident}
						items={runways
							.map((rwy) => ({ value: rwy.he_ident, name: rwy.he_ident }))
							.concat(runways.map((rwy) => ({ value: rwy.le_ident, name: rwy.le_ident })))}
						onchange={() => {
							//console.log('Runway changed:', conditions.runway?.ident);
							const runway = runways.find(
								(r) =>
									r.he_ident === conditions.runway?.ident || r.le_ident === conditions.runway?.ident
							);
							//console.log('Selected runway:', runway);
							if (runway) {
								const end = [
									{ ident: runway.le_ident, heading: runway.le_heading_degT },
									{ ident: runway.he_ident, heading: runway.he_heading_degT }
								].find((end) => end.ident === conditions.runway?.ident);

								if (
									end &&
									end?.ident === conditions.runway?.ident &&
									conditions.windDirection !== undefined &&
									conditions.windSpeed !== undefined
								) {
									const { headwind, crosswind } = computeWindComponents(
										end.heading,
										conditions.windDirection,
										conditions.windSpeed
									);

									conditions.runway = {
										headwind,
										crosswind,
										length: runway.length_ft,
										heading: end.heading,
										ident: end.ident
									};
									conditions.hwTw = conditions.runway.headwind;
									conditions.xw = conditions.runway.crosswind;
								}
							}
						}}
					/>
				</Label>
			{/if}
			<div class="flex flex-row gap-2">
				<Label class="flex flex-1/2 flex-col gap-2">
					<span class="flex-1/4">Wind Direction</span>
					<ButtonGroup>
						<Input type="number" bind:value={conditions.windDirection} />
						<InputAddon>°</InputAddon>
					</ButtonGroup>
				</Label>

				<Label class="flex flex-1/2 flex-col gap-2">
					<span class="flex-1/4">Wind Speed</span>
					<ButtonGroup>
						<Input type="number" bind:value={conditions.windSpeed} />
						<InputAddon>kts</InputAddon>
					</ButtonGroup>
				</Label>
			</div>
			<Label class="flex flex-col gap-2">
				<span class="flex-1/4">Pressure Altitude</span>
				<ButtonGroup>
					<Input type="number" bind:value={conditions.pressureAlt} />
					<InputAddon>ft</InputAddon>
				</ButtonGroup>
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
