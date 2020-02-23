import { BASE_API } from "../config/env"
import * as io from "socket.io-client";


var socket = connect()
function connect() {
    return io.connect(BASE_API + "/lobby");
}

export function bindhero(herotype) {
    socket.emit("bind hero",herotype);
}
