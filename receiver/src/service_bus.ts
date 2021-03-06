
import { ServiceBusClient, ReceivedMessageWithLock, SessionReceiver, MessagingError, delay } from "@azure/service-bus";

const maxSessionsToProcessSimultaneously 	= 8;
const sessionIdleTimeoutMs 					= 5 * 1000;
const delayOnErrorMs 						= 5 * 1000;
const maxMessageSize 						= 262144;
const maxHeaderSize 						= 64000;
const allowableError 						= 40000;
const maxAllowableSize 						= maxMessageSize - maxHeaderSize - allowableError;
	
const sendMessage = async ( message : any, sessionId : string, serviceBusClient : ServiceBusClient, queue : string) => {
    
    const sender = serviceBusClient.createSender(queue);
    
    const buffer = JSON.stringify(message);
    const bufferSize = (new TextEncoder().encode(buffer)).byteLength;
    // console.log('bufferSize : ', bufferSize)
    if ( bufferSize > maxAllowableSize ) {
        const numMessages = Math.ceil(bufferSize / maxAllowableSize);
        
        // console.log('too big', bufferSize, maxAllowableSize, numMessages)
        
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
        // console.log('sizeof chunks', accumulatedLen )
        for ( let i = 0; i < numMessages; ++i ) {
            
            await sender.send({
                body: chunks[i],
                sessionId,
                userProperties : {
                    messageIndex : i,
                    numMessages,
                    totalBufferSize : bufferSize
                }
            });
        }

        // console.log('sent all ', numMessages)
    }
    else {
        await sender.send({
            body: message,
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

// Called by the SessionReceiver when a message is received.
// This is passed as part of the handlers when calling `SessionReceiver.subscribe()`.
async function processMessage(serviceBusClient : ServiceBusClient, 
	msg: ReceivedMessageWithLock, 
	sessionData : any[], 
	responseQueue : string,
	processMessageHandler : (msgBody : string)=>Promise<void>) {

    const numMessages = msg.userProperties ? msg.userProperties['numMessages'] : 0;
    const messageIndex = msg.userProperties ? msg.userProperties['messageIndex'] : 0;
    const totalBufferSize = msg.userProperties ? msg.userProperties['totalBufferSize'] : 0;

	sessionData.push( msg.body );
	
    console.log(`[${msg.sessionId}] received message with body`, /*msg.body, JSON.parse(msg.body),*/ messageIndex + 1, numMessages, sessionData.length );
    if ( (sessionData.length === numMessages && numMessages > 0) || numMessages === 0 ) {
        console.log('got all messages');

        // We would have stringified if the messages are more than 1.
        const joinedData = sessionData.length > 1 ? sessionData.join('') : JSON.stringify(sessionData[0]);
		// console.log('joinedData', joinedData);
		let responseVal;
        try {
			const parsedData = JSON.parse(joinedData)
			responseVal = await processMessageHandler( parsedData );
            console.log('json parsed and processed')
        } catch( err ){
			responseVal = err;
            console.log(err)
        }

        const joinedBufferSize = (new TextEncoder().encode(joinedData)).byteLength;

        if ( joinedBufferSize !== totalBufferSize ) {
            const errMsg = `JoinedBufferSize !== ExpectedBufferSize. Joined: ${joinedBufferSize}, Expected: ${totalBufferSize}`;
            console.error(errMsg);
        }

        await sendMessage( 
            responseVal, 
            msg.sessionId!, 
            serviceBusClient, 
            responseQueue);
    }

    await msg.complete();
}
  
  // Called by the SessionReceiver when an error occurs.
  // This will be called in the handlers we pass in `SessionReceiver.subscribe()`
  // and by the sample when we encounter an error opening a session.
async function processError(err: Error, sessionId?: string) {
	if (sessionId) {
		console.log(`Error when receiving messages from the session ${sessionId}: `, err);
	} else {
		console.log(`Error when creating the receiver for next available session`, err);
	}
}

  // utility function to create a timer that can be refreshed
function createRefreshableTimer(timeoutMs: number, resolve: Function): () => void {
    let timer: any;
  
	return () => {
		clearTimeout(timer);
		timer = setTimeout(() => resolve(), timeoutMs);
	};
}

// Queries Service Bus for the next available session and processes it.
async function receiveFromNextSession(serviceBusClient: ServiceBusClient, 
									  requestQueue : string,
									  responseQueue : string,
									  abortController : AbortController,
									  processMessageHandler : ( messageBody: any )=>Promise<void>): Promise<void> {
    let sessionReceiver: SessionReceiver<ReceivedMessageWithLock>;
  
    const sessionData = [] as any[];
    try {

		sessionReceiver = serviceBusClient.createSessionReceiver(requestQueue, "peekLock");
		  
    } catch (err) {
		if ((err as MessagingError).code === "SessionCannotBeLockedError" ||
			(err as MessagingError).code === "OperationTimeoutError") {
			console.log(`INFO: no available sessions, sleeping for ${delayOnErrorMs}`);
		} 
		else {
			await processError(err, undefined);
		}
			
		await delay(delayOnErrorMs);
		return;
    }
    
    const sessionFullyRead = new Promise((resolveSessionAsFullyRead, rejectSessionWithError) => {
      	const refreshTimer = createRefreshableTimer(sessionIdleTimeoutMs, resolveSessionAsFullyRead);
      	refreshTimer();
  
		sessionReceiver.subscribe({
			async processMessage(msg) {
				refreshTimer();
				await processMessage(serviceBusClient, msg, sessionData, responseQueue, processMessageHandler);
			},
			async processError(err) {
				rejectSessionWithError(err);
			}
		},
		{
			abortSignal: abortController.signal
		});
    });
  
    try {
      	await sessionFullyRead;
    } catch (err) {
      	await processError(err, sessionReceiver.sessionId);
    } finally {
        await sessionReceiver.close();
    }
}
  

async function roundRobinThroughAvailableSessions( 
	connectionString : string,
	requestQueue : string, 
	responseQueue : string,
	abortController : AbortController,
	processMessageHandler : (messageBody : any)=>Promise<any>, 
	): Promise<void> {

	const serviceBusClient = new ServiceBusClient( connectionString );

    const receiverPromises = [];
  
    for (let i = 0; i < maxSessionsToProcessSimultaneously; ++i) {
      	receiverPromises.push(
			(async () => {
			while (!abortController.signal.aborted) {
				await receiveFromNextSession(
					serviceBusClient, 
					requestQueue, 
					responseQueue, 
					abortController,
					processMessageHandler);
			}
			})()
		);
    }
  
    console.log(`Listening for available sessions...`);
    await Promise.all(receiverPromises);
  
    await serviceBusClient.close();
    console.log(`Exiting...`);
}

export default roundRobinThroughAvailableSessions;