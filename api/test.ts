import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import pino from "pino";

async function test() {
    const { version } = await fetchLatestBaileysVersion();
    console.log("versão:", version);
    
    const { state, saveCreds } = await useMultiFileAuthState("./test-session");
    
    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on("creds.update", saveCreds);
    
    sock.ev.on("connection.update", (update) => {
        console.log("connection.update:", JSON.stringify(update));
    });
}

test();