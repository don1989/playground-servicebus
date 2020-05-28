import { ServiceBusClient, ReceivedMessageWithLock } from "@azure/service-bus";
import {  Request, Response } from 'express';

const timeout = (ms : number, res : Response) => {
    let _timeout : NodeJS.Timeout;
    let _cancel  : any;
  
    const _promise = new Promise( (resolve, reject) => {
        _timeout = setTimeout( () => {
            resolve('Timed Out');
            res.status(504).send('Timed Out')
        }, ms);
        _cancel = () => {
            clearTimeout( _timeout );
            resolve('Cancelled');
        }
    }); 
  
    return {
        promise: _promise, 
        cancel: _cancel
    };
}

const sendMessage = async ( message : any, sessionId : string, serviceBusClient : ServiceBusClient, requestQueue : string, responseQueue : string) => {
    
    const sender = serviceBusClient.createSender(requestQueue);
    const maxMessageSize = 262144;
    const maxHeaderSize = 64000;
    const allowableError = 40000;
    const maxAllowableSize = maxMessageSize - maxHeaderSize - allowableError;

    const buffer = JSON.stringify(message);
    const bufferSize = (new TextEncoder().encode(buffer)).byteLength;
    console.log('bufferSize : ', bufferSize)
    if ( bufferSize > maxAllowableSize ) {
        const numMessages = Math.ceil(bufferSize / maxAllowableSize);
        
        console.log('too big', bufferSize, maxAllowableSize, numMessages)
        
        const chunks = [];
        const chunkSize = maxAllowableSize;
        let workingBuffer = buffer;
        while (workingBuffer) {
            if (workingBuffer.length < chunkSize) {
                chunks.push(workingBuffer);
                break;
            }
            else {
                chunks.push(workingBuffer.slice(0, chunkSize));
                workingBuffer = workingBuffer.slice(chunkSize);
            }
        }

        let accumulatedLen = 0;
        chunks.forEach( c => accumulatedLen += c.length );
        console.log('sizeof chunks', accumulatedLen )
        for ( let i = 0; i < numMessages; ++i ) {
            
            await sender.send({
                body: chunks[i],
                replyTo: responseQueue,
                sessionId,
                userProperties : {
                    messageIndex : i,
                    numMessages,
                    totalBufferSize : bufferSize
                }
            });
        }

        console.log('sent all ', numMessages)
    }
    else {
        await sender.send({
            body: message,
            replyTo: responseQueue,
            sessionId,
            userProperties : {
                messageIndex : 0,
                numMessages : 1,
                totalBufferSize : bufferSize
            }
        });
    }
    await sender.close();
}

const order = {
    ID: 123,
    Name: 'Paul',
    Surname: 'Smith'
}

const sendToServiceBus = async (req: Request, res: Response) => {

    // Connect to the service bus
    const connectionString = "Endpoint=sb://uk01d-sb01.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=jYOvxpDlxovPypyvA5VxbY0MD3SZ40kvWDML/jRH7L8=";
    const requestQueue = "playground_request";
    const responseQueue = "playground_response";

    const serviceBusClient = new ServiceBusClient( connectionString );
    if ( !serviceBusClient ) {
        console.log("Failed to initialise service bus client with connection string: ", connectionString);
    } else {
        const sessionId = Math.random().toString();

        const getRandomInt = (max : number) => {
            return Math.floor(Math.random() * Math.floor(max));
        }

        const bod = [];
        const leInt = getRandomInt(100000);
        console.log('msg size: ', leInt)
        for ( let i = 0; i < leInt; ++i ) {
            bod.push(order)
        }

        await sendMessage( bod, sessionId, serviceBusClient, requestQueue, responseQueue );
        
        console.log('Sent to SB request queue ', requestQueue, sessionId)

        // Now we must await the response...
        const receiver = serviceBusClient.createSessionReceiver(responseQueue, "peekLock", {
            sessionId
        });
        const sleepTime = timeout( 90000, res );

        const sessionData = [] as any[];
        const messageHandler = async (message : ReceivedMessageWithLock) => {
            const receivedSessionId = message.sessionId;
            const messageIndex = message.userProperties ? message.userProperties['messageIndex'] : 0;
            const numMessages = message.userProperties ? message.userProperties['numMessages'] : 0;

            console.log('Received message from session', receivedSessionId, messageIndex, numMessages)
            if ( receivedSessionId === sessionId ) {
                const resp = message.body;

                sessionData.push( resp );

                await message.complete();
                
                if ( (sessionData.length === numMessages && numMessages > 0) || numMessages === 0 ) {

                    const joinedData = sessionData.length > 1 ? sessionData.join('') : JSON.stringify(sessionData[0]);
                    const bufferSize = (new TextEncoder().encode(joinedData)).byteLength;
                    console.log('Matched', bufferSize)
                    res.status(200).send(joinedData)
                    sleepTime.cancel();
                }
            }
        }

        const errorHandler = async (err : Error) => {

            console.log('Error handled ', err.message)
            
            sleepTime.cancel();
            res.status(500).send(err)
        }

        try {
            receiver.subscribe({
                processMessage: messageHandler,
                processError: errorHandler
            }, { 
                autoComplete: false
            })

            // Wait long enough before closing the receiver to receive messages.
            // It will be cancelled when we've received the message we're after.
            await sleepTime.promise;
            await receiver.close();
        } 
        finally {
            await serviceBusClient.close();
        }
    }
};

export default sendToServiceBus;