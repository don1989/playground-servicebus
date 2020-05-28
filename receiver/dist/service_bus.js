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
var abort_controller_1 = require("@azure/abort-controller");
var connectionString = "Endpoint=sb://uk01d-sb01.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=jYOvxpDlxovPypyvA5VxbY0MD3SZ40kvWDML/jRH7L8=";
var requestQueue = "playground_request";
var responseQueue = "playground_response";
var serviceBusClient = new service_bus_1.ServiceBusClient(connectionString);
var sendMessage = function (message, sessionId, serviceBusClient, queue) { return __awaiter(void 0, void 0, void 0, function () {
    var sender, maxMessageSize, maxHeaderSize, allowableError, maxAllowableSize, buffer, bufferSize, numMessages, chunks, chunkSize, workingBuffer, accumulatedLen_1, i;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                sender = serviceBusClient.createSender(queue);
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
/* */
// This can be used control when the round-robin processing will terminate
// by calling abortController.abort().
var abortController = new abort_controller_1.AbortController();
var maxSessionsToProcessSimultaneously = 8;
var sessionIdleTimeoutMs = 5 * 1000;
var delayOnErrorMs = 5 * 1000;
// Called by the SessionReceiver when a message is received.
// This is passed as part of the handlers when calling `SessionReceiver.subscribe()`.
function processMessage(msg, sessionData) {
    return __awaiter(this, void 0, void 0, function () {
        var numMessages, messageIndex, totalBufferSize, joinedData, parsedData, joinedBufferSize, errMsg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    numMessages = msg.userProperties ? msg.userProperties['numMessages'] : 0;
                    messageIndex = msg.userProperties ? msg.userProperties['messageIndex'] : 0;
                    totalBufferSize = msg.userProperties ? msg.userProperties['totalBufferSize'] : 0;
                    // if ( numMessages > 1 ) {
                    sessionData.push(msg.body);
                    // }
                    console.log("[" + msg.sessionId + "] received message with body", /*msg.body, JSON.parse(msg.body),*/ messageIndex + 1, numMessages, sessionData.length);
                    if (!((sessionData.length === numMessages && numMessages > 0) || numMessages === 0)) return [3 /*break*/, 2];
                    console.log('got all messages');
                    joinedData = sessionData.length > 1 ? sessionData.join('') : JSON.stringify(sessionData[0]);
                    parsedData = void 0;
                    try {
                        // There is no need to parse if the number of messages is 1. Otherwise we would have
                        // stringified it and split it up.
                        parsedData = JSON.parse(joinedData);
                        console.log('json parsed');
                    }
                    catch (err) {
                        console.log(err);
                    }
                    joinedBufferSize = (new TextEncoder().encode(joinedData)).byteLength;
                    if (joinedBufferSize !== totalBufferSize) {
                        errMsg = "JoinedBufferSize !== ExpectedBufferSize. Joined: " + joinedBufferSize + ", Expected: " + totalBufferSize;
                        console.error(errMsg);
                    }
                    return [4 /*yield*/, sendMessage(parsedData, msg.sessionId, serviceBusClient, responseQueue)];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 2];
                case 2: return [4 /*yield*/, msg.complete()];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// Called by the SessionReceiver when an error occurs.
// This will be called in the handlers we pass in `SessionReceiver.subscribe()`
// and by the sample when we encounter an error opening a session.
function processError(err, sessionId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (sessionId) {
                console.log("Error when receiving messages from the session " + sessionId + ": ", err);
            }
            else {
                console.log("Error when creating the receiver for next available session", err);
            }
            return [2 /*return*/];
        });
    });
}
// Called just before we start processing the first message of a session.
// NOTE: This function is used only in the sample and is not part of the Service Bus library.
function sessionAccepted(sessionId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/];
        });
    });
}
// Called if we are closing a session.
// `reason` will be:
// * 'error' if we are closing because of an error(the error will be delivered
//   to `processError` above)
// * 'idle_timeout' if `sessionIdleTimeoutMs` milliseconds pass without
//   any messages being received (ie, session can be considered empty).
// NOTE: This function is used only in the sample and is not part of the Service Bus library.
function sessionClosed(reason, sessionId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/];
        });
    });
}
// utility function to create a timer that can be refreshed
function createRefreshableTimer(timeoutMs, resolve) {
    var timer;
    return function () {
        clearTimeout(timer);
        timer = setTimeout(function () { return resolve(); }, timeoutMs);
    };
}
// Queries Service Bus for the next available session and processes it.
function receiveFromNextSession(serviceBusClient) {
    return __awaiter(this, void 0, void 0, function () {
        var sessionReceiver, sessionData, err_1, sessionFullyRead, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sessionData = [];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 2, , 7]);
                    sessionReceiver = serviceBusClient.createSessionReceiver(requestQueue, "peekLock");
                    return [3 /*break*/, 7];
                case 2:
                    err_1 = _a.sent();
                    if (!(err_1.code === "SessionCannotBeLockedError" ||
                        err_1.code === "OperationTimeoutError")) return [3 /*break*/, 3];
                    console.log("INFO: no available sessions, sleeping for " + delayOnErrorMs);
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, processError(err_1, undefined)];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5: return [4 /*yield*/, service_bus_1.delay(delayOnErrorMs)];
                case 6:
                    _a.sent();
                    return [2 /*return*/];
                case 7: return [4 /*yield*/, sessionAccepted(sessionReceiver.sessionId)];
                case 8:
                    _a.sent();
                    sessionFullyRead = new Promise(function (resolveSessionAsFullyRead, rejectSessionWithError) {
                        var refreshTimer = createRefreshableTimer(sessionIdleTimeoutMs, resolveSessionAsFullyRead);
                        refreshTimer();
                        sessionReceiver.subscribe({
                            processMessage: function (msg) {
                                return __awaiter(this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                refreshTimer();
                                                return [4 /*yield*/, processMessage(msg, sessionData)];
                                            case 1:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                });
                            },
                            processError: function (err) {
                                return __awaiter(this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        rejectSessionWithError(err);
                                        return [2 /*return*/];
                                    });
                                });
                            }
                        }, {
                            abortSignal: abortController.signal
                        });
                    });
                    _a.label = 9;
                case 9:
                    _a.trys.push([9, 12, 15, 17]);
                    return [4 /*yield*/, sessionFullyRead];
                case 10:
                    _a.sent();
                    return [4 /*yield*/, sessionClosed("idle_timeout", sessionReceiver.sessionId)];
                case 11:
                    _a.sent();
                    return [3 /*break*/, 17];
                case 12:
                    err_2 = _a.sent();
                    return [4 /*yield*/, processError(err_2, sessionReceiver.sessionId)];
                case 13:
                    _a.sent();
                    return [4 /*yield*/, sessionClosed("error", sessionReceiver.sessionId)];
                case 14:
                    _a.sent();
                    return [3 /*break*/, 17];
                case 15: return [4 /*yield*/, sessionReceiver.close()];
                case 16:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 17: return [2 /*return*/];
            }
        });
    });
}
function roundRobinThroughAvailableSessions() {
    return __awaiter(this, void 0, void 0, function () {
        var receiverPromises, i;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    receiverPromises = [];
                    for (i = 0; i < maxSessionsToProcessSimultaneously; ++i) {
                        receiverPromises.push((function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        if (!!abortController.signal.aborted) return [3 /*break*/, 2];
                                        return [4 /*yield*/, receiveFromNextSession(serviceBusClient)];
                                    case 1:
                                        _a.sent();
                                        return [3 /*break*/, 0];
                                    case 2: return [2 /*return*/];
                                }
                            });
                        }); })());
                    }
                    console.log("Listening for available sessions...");
                    return [4 /*yield*/, Promise.all(receiverPromises)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, serviceBusClient.close()];
                case 2:
                    _a.sent();
                    console.log("Exiting...");
                    return [2 /*return*/];
            }
        });
    });
}
roundRobinThroughAvailableSessions().catch(function (err) { return console.log("Fatal error : " + err); });
