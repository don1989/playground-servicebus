import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

import './service_bus';

const app : Express = express();
app.use(bodyParser.json());

const port = process.env.PORT || 3012;
const runningMessage = 'Server running on port ' + port;

app.get('/', cors(), (request : Request, response : Response) => {
    response.status(200).send(runningMessage);
})

app.listen(port, ()=> {
    console.log(runningMessage)
});
