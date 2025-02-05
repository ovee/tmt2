import { Component, createSignal } from 'solid-js';
import {
	getCurrentTeamSideAndRoundSwitch,
	IMatchMap,
	IMatchMapUpdateDto,
	IMatchResponse,
	IMatchUpdateDto,
	TMatchMapSate,
} from '../../../common';
import { createFetcher } from '../utils/fetcher';
import { t } from '../utils/locale';
import { mustConfirm } from '../utils/mustConfirm';
import { Card } from './Card';
import { CardMenu } from './CardMenu';
import { Modal } from './Modal';
import { RoundBackups } from './RoundBackups';

export const MatchMapCard: Component<{
	match: IMatchResponse;
	map: IMatchMap;
	mapIndex: number;
}> = (props) => {
	const fetcher = createFetcher(props.match.tmtSecret);
	const patchMatch = (dto: IMatchUpdateDto) =>
		fetcher('PATCH', `/api/matches/${props.match.id}`, dto);
	const patchMatchMap = (dto: IMatchMapUpdateDto) =>
		fetcher('PATCH', `/api/matches/${props.match.id}/matchMap/${props.mapIndex}`, dto);
	const loadThisMap = () =>
		patchMatch({
			currentMap: props.mapIndex,
		});
	const changeMapName = () => {
		const response = prompt(t('enter map name'), 'de_dust2');
		if (response) {
			patchMatchMap({
				name: response,
			});
		}
	};
	const changeMapState = () => {
		const response = prompt(t('enter map state'), 'PENDING');
		if (response) {
			patchMatchMap({
				state: response as TMatchMapSate,
			});
		}
	};
	const switchTeamInternals = () => {
		patchMatchMap({
			_switchTeamInternals: true,
		});
	};

	const [showRoundBackupsModal, setShowRoundBackupsModal] = createSignal(false);

	const teamA = () => {
		if (props.match.currentMap !== props.mapIndex || props.map.state === 'FINISHED') {
			return '';
		}
		return getCurrentTeamSideAndRoundSwitch(props.map).currentCtTeamAB === 'TEAM_A'
			? '(CT)'
			: '(T)';
	};
	const teamB = () => {
		switch (teamA()) {
			case '(CT)':
				return '(T)';
			case '(T)':
				return '(CT)';
			default:
				return '';
		}
	};
	return (
		<Card>
			<CardMenu
				show={props.match.isLive}
				entries={[
					[t('change map name'), changeMapName],
					[t('change map state'), changeMapState],
					props.match.currentMap === props.mapIndex
						? [t('load round backup'), () => setShowRoundBackupsModal(true)]
						: [t('switch to this map'), mustConfirm(loadThisMap)],
					[t('switch team internals'), switchTeamInternals],
				]}
			/>
			<h3 class="text-base font-light">{props.map.name}</h3>
			<p class="flex basis-1/3 items-center justify-center space-x-5">
				<span class="flex-1 text-right">
					{teamA()} {props.match.teamA.name}
				</span>
				<span class="text-center text-2xl">
					{props.map.score.teamA}
					{' : '}
					{props.map.score.teamB}
				</span>
				<span class="flex-1 text-left">
					{props.match.teamB.name} {teamB()}
				</span>
			</p>
			<p>
				<span>{t(props.map.state)}</span>
			</p>
			<Modal
				show={showRoundBackupsModal()}
				onBackdropClick={() => setShowRoundBackupsModal(false)}
			>
				<div class="text-left">
					<RoundBackups
						match={props.match}
						onClose={() => setShowRoundBackupsModal(false)}
					/>
				</div>
				<button onClick={() => setShowRoundBackupsModal(false)}>{t('close')}</button>
			</Modal>
		</Card>
	);
};
