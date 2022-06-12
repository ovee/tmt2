import http from 'http';
import * as WebSocket from 'ws';
import { TWebhook } from '../../common';
import {
	ISubscribeMessage,
	IUnsubscribeMessage,
	TWebSocketMessages,
} from '../../common/interfaces/websocket';
import * as Auth from './auth';

const WS_CLIENTS = new Map<
	WebSocket,
	{
		ip?: string;
		forwardedFor?: string | string[];
		userAgent?: string;
		matches: Set<string>;
		sysChannels: Set<never>;
	}
>();

export const setup = async (httpServer: http.Server) => {
	const wsServer = new WebSocket.Server({
		server: httpServer,
		path: '/ws',
	});
	wsServer.on('connection', (ws: WebSocket, req) => {
		WS_CLIENTS.set(ws, {
			ip: req.socket.remoteAddress,
			forwardedFor: req.headers['x-forwarded-for'],
			userAgent: req.headers['user-agent'],
			matches: new Set(),
			sysChannels: new Set(),
		});

		ws.on('message', (data) => onMessage(ws, data));

		ws.on('close', () => WS_CLIENTS.delete(ws));
	});
};

const onMessage = (ws: WebSocket, data: WebSocket.RawData) => {
	let msg: TWebSocketMessages | undefined;
	try {
		msg = JSON.parse(data + '');
	} catch (err) {}
	if (!msg) {
		console.warn('Could not json parse websocket data');
		return;
	}
	if (msg.type === 'SUBSCRIBE') {
		subscribe(ws, msg);
	} else if (msg.type === 'UNSUBSCRIBE') {
		unSubscribe(ws, msg);
	} else {
		console.warn(`Websocket type ${(msg as any).type} not implemented`);
	}
};

const subscribe = (ws: WebSocket, msg: ISubscribeMessage) => {
	const authResponse = Auth.isAuthorized(msg.token, msg.matchId);
	if (!authResponse) {
		console.warn(`prevent subscribe to match ${msg.matchId}: invalid token`);
		return;
	}
	const client = WS_CLIENTS.get(ws);
	if (client) {
		console.info(`subscribe client to match ${msg.matchId} (${WS_CLIENTS.size} clients)`);
		WS_CLIENTS.get(ws)?.matches.add(msg.matchId);
	}
};

const unSubscribe = (ws: WebSocket, msg: IUnsubscribeMessage) => {
	WS_CLIENTS.get(ws)?.matches.delete(msg.matchId);
};

export const publish = (msg: TWebhook) => {
	WS_CLIENTS.forEach((data, ws) => {
		if (msg.matchId && data.matches.has(msg.matchId)) {
			ws.send(JSON.stringify(msg));
		}
	});
};
