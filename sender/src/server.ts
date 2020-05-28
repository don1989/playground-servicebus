import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

import sendToServiceBus from './service_bus';

const app : Express = express();
app.use(bodyParser.json());

const port = process.env.PORT || 3011;
const runningMessage = 'Server running on port ' + port;


const allowCrossDomain = (req : any, res : any, next : any) => {
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
}

app.use(allowCrossDomain); 

app.get('/', cors(), (request : Request, response : Response) => {
    sendToServiceBus( request, response )
})

app.listen(port, ()=> {
    console.log(runningMessage)
});
