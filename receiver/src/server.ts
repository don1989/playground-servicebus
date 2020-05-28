import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { AbortController } from "@azure/abort-controller";

import roundRobinThroughAvailableSessions from './service_bus';

const app : Express = express();
app.use(bodyParser.json());

const port = process.env.PORT || 3012;
const runningMessage = 'Server running on port ' + port;


const allowCrossDomain = (req : any, res : any, next : any) => {
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
}

app.use(allowCrossDomain);


const g_connectionString 	= "Endpoint=sb://uk01d-sb01.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=jYOvxpDlxovPypyvA5VxbY0MD3SZ40kvWDML/jRH7L8=";
const g_requestQueue 		= "playground_request";
const g_responseQueue 		= "playground_response";
const g_abortController 	= new AbortController();
const g_messageHandler = async ( messageBody : any ) => {
	console.log('messageHandler called');
	return messageBody;
}

roundRobinThroughAvailableSessions(
    g_connectionString,
    g_requestQueue,
    g_responseQueue,
    g_abortController,
    g_messageHandler
)

app.get('/', cors(), (request : Request, response : Response) => {
    response.status(200).send(runningMessage);
})

app.listen(port, ()=> {
    console.log(runningMessage)
});
