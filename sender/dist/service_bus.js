"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var service_bus_1 = require("@azure/service-bus");
var timeout = function (ms, res) {
    var _timeout;
    var _cancel;
    var _promise = new Promise(function (resolve, reject) {
        _timeout = setTimeout(function () {
            resolve('Timed Out');
            res.status(504).send('Timed Out');
        }, ms);
        _cancel = function () {
            clearTimeout(_timeout);
            resolve('Cancelled');
        };
    });
    return {
        promise: _promise,
        cancel: _cancel
    };
};
var sendMessage = function (message, sessionId, serviceBusClient, requestQueue, responseQueue) { return __awaiter(void 0, void 0, void 0, function () {
    var sender, maxMessageSize, maxHeaderSize, allowableError, maxAllowableSize, buffer, bufferSize, numMessages, chunks, chunkSize, workingBuffer, accumulatedLen_1, i;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                sender = serviceBusClient.createSender(requestQueue);
                maxMessageSize = 262144;
                maxHeaderSize = 64000;
                allowableError = 40000;
                maxAllowableSize = maxMessageSize - maxHeaderSize - allowableError;
                buffer = JSON.stringify(message);
                bufferSize = (new TextEncoder().encode(buffer)).byteLength;
                console.log('bufferSize : ', bufferSize);
                if (!(bufferSize > maxAllowableSize)) return [3 /*break*/, 5];
                numMessages = Math.ceil(bufferSize / maxAllowableSize);
                console.log('too big', bufferSize, maxAllowableSize, numMessages);
                chunks = [];
                chunkSize = maxAllowableSize;
                workingBuffer = buffer;
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
                accumulatedLen_1 = 0;
                chunks.forEach(function (c) { return accumulatedLen_1 += c.length; });
                console.log('sizeof chunks', accumulatedLen_1);
                i = 0;
                _a.label = 1;
            case 1:
                if (!(i < numMessages)) return [3 /*break*/, 4];
                return [4 /*yield*/, sender.send({
                        body: chunks[i],
                        replyTo: responseQueue,
                        sessionId: sessionId,
                        userProperties: {
                            messageIndex: i,
                            numMessages: numMessages,
                            totalBufferSize: bufferSize
                        }
                    })];
            case 2:
                _a.sent();
                _a.label = 3;
            case 3:
                ++i;
                return [3 /*break*/, 1];
            case 4:
                console.log('sent all ', numMessages);
                return [3 /*break*/, 7];
            case 5: return [4 /*yield*/, sender.send({
                    body: message,
                    replyTo: responseQueue,
                    sessionId: sessionId,
                    userProperties: {
                        messageIndex: 0,
                        numMessages: 1,
                        totalBufferSize: bufferSize
                    }
                })];
            case 6:
                _a.sent();
                _a.label = 7;
            case 7: return [4 /*yield*/, sender.close()];
            case 8:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
var order = {
    ID: 123,
    Name: 'Paul',
    Surname: 'Smith'
};
var sendToServiceBus = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var connectionString, requestQueue, responseQueue, serviceBusClient, sessionId_1, getRandomInt, bod, leInt, i, receiver, sleepTime_1, sessionData_1, messageHandler, errorHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                connectionString = "Endpoint=sb://uk01d-sb01.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=jYOvxpDlxovPypyvA5VxbY0MD3SZ40kvWDML/jRH7L8=";
                requestQueue = "playground_request";
                responseQueue = "playground_response";
                serviceBusClient = new service_bus_1.ServiceBusClient(connectionString);
                if (!!serviceBusClient) return [3 /*break*/, 1];
                console.log("Failed to initialise service bus client with connection string: ", connectionString);
                return [3 /*break*/, 8];
            case 1:
                sessionId_1 = Math.random().toString();
                getRandomInt = function (max) {
                    return Math.floor(Math.random() * Math.floor(max));
                };
                bod = [];
                leInt = getRandomInt(100000);
                console.log('msg size: ', leInt);
                for (i = 0; i < leInt; ++i) {
                    bod.push(order);
                }
                return [4 /*yield*/, sendMessage(bod, sessionId_1, serviceBusClient, requestQueue, responseQueue)];
            case 2:
                _a.sent();
                console.log('Sent to SB request queue ', requestQueue, sessionId_1);
                receiver = serviceBusClient.createSessionReceiver(responseQueue, "peekLock", {
                    sessionId: sessionId_1
                });
                sleepTime_1 = timeout(90000, res);
                sessionData_1 = [];
                messageHandler = function (message) { return __awaiter(void 0, void 0, void 0, function () {
                    var receivedSessionId, messageIndex, numMessages, resp, joinedData, bufferSize;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                receivedSessionId = message.sessionId;
                                messageIndex = message.userProperties ? message.userProperties['messageIndex'] : 0;
                                numMessages = message.userProperties ? message.userProperties['numMessages'] : 0;
                                console.log('Received message from session', receivedSessionId, messageIndex, numMessages);
                                if (!(receivedSessionId === sessionId_1)) return [3 /*break*/, 2];
                                resp = message.body;
                                sessionData_1.push(resp);
                                return [4 /*yield*/, message.complete()];
                            case 1:
                                _a.sent();
                                if ((sessionData_1.length === numMessages && numMessages > 0) || numMessages === 0) {
                                    joinedData = sessionData_1.length > 1 ? sessionData_1.join('') : JSON.stringify(sessionData_1[0]);
                                    bufferSize = (new TextEncoder().encode(joinedData)).byteLength;
                                    console.log('Matched', bufferSize);
                                    res.status(200).send(joinedData);
                                    sleepTime_1.cancel();
                                }
                                _a.label = 2;
                            case 2: return [2 /*return*/];
                        }
                    });
                }); };
                errorHandler = function (err) { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        console.log('Error handled ', err.message);
                        sleepTime_1.cancel();
                        res.status(500).send(err);
                        return [2 /*return*/];
                    });
                }); };
                _a.label = 3;
            case 3:
                _a.trys.push([3, , 6, 8]);
                receiver.subscribe({
                    processMessage: messageHandler,
                    processError: errorHandler
                }, {
                    autoComplete: false
                });
                // Wait long enough before closing the receiver to receive messages.
                // It will be cancelled when we've received the message we're after.
                return [4 /*yield*/, sleepTime_1.promise];
            case 4:
                // Wait long enough before closing the receiver to receive messages.
                // It will be cancelled when we've received the message we're after.
                _a.sent();
                return [4 /*yield*/, receiver.close()];
            case 5:
                _a.sent();
                return [3 /*break*/, 8];
            case 6: return [4 /*yield*/, serviceBusClient.close()];
            case 7:
                _a.sent();
                return [7 /*endfinally*/];
            case 8: return [2 /*return*/];
        }
    });
}); };
exports.default = sendToServiceBus;
