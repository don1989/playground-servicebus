import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

import sendToServiceBus from './service_bus';

const app : Express = express();
app.use(bodyParser.json());

const port = process.env.PORT || 3011;
const runningMessage = 'Server running on port ' + port;

app.get('/', cors(), (request : Request, response : Response) => {
    sendToServiceBus( request, response )
})

app.listen(port, ()=> {
    console.log(runningMessage)
});
