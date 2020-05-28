"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var cors_1 = __importDefault(require("cors"));
var body_parser_1 = __importDefault(require("body-parser"));
var service_bus_1 = __importDefault(require("./service_bus"));
var app = express_1.default();
app.use(body_parser_1.default.json());
var port = process.env.PORT || 3011;
var runningMessage = 'Server running on port ' + port;
app.get('/', cors_1.default(), function (request, response) {
    service_bus_1.default(request, response);
});
app.listen(port, function () {
    console.log(runningMessage);
});
