const readline = require("readline");

const INSTRUCTION_LIMIT = 10000;
const debugMode = true;

let label = {}, opcode = {}, adr = {}, prog = [], mem = {};
let vartab = {};
let accumulator = 0;
let varindex = 0;
let pc = 0;
let sloccount = 0;
let instcount = 0;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// === Yardımcı Fonksiyonlar ===
function getlab(s) {
    const token = s.trim().split(/\s+/)[0]?.toLowerCase() || "";
    return token.endsWith(":") ? token.slice(0, -1) : "";
}

function getop(s) {
    const tokens = s.trim().split(/\s+/);
    if (tokens[0].endsWith(":")) return tokens[1]?.toLowerCase() || "";
    return tokens[0]?.toLowerCase() || "";
}

function getadr(s) {
    const tokens = s.trim().split(/\s+/);
    if (tokens[0].endsWith(":")) return tokens[2]?.toLowerCase() || "";
    return tokens[1]?.toLowerCase() || "";
}

function litoradr(s) {
    if (/^-?[0-9]+$/.test(s)) return Number(s);
    return Number(mem[findlab(s)]);
}

function findlab(s) {
    for (let i = 0; i < prog.length; i++) {
        if (label[i] === s) return i;
    }
    console.log(`Etiket bulunamadı: ${s}`);
    return -1;
}

function setmem(s, v) {
    let pos = /^[0-9]+$/.test(s) ? s : findlab(s);
    mem[pos] = v;
}

// === Derleyici ===
function assemble(sourceCode) {
    prog = sourceCode.trim().split(/\r?\n/);
    sloccount = prog.length;
    for (let i = 0; i < sloccount; i++) {
        label[i] = getlab(prog[i]);
        opcode[i] = getop(prog[i]);
        adr[i] = getadr(prog[i]);
        setmem(i, 0);
        if (opcode[i] === "init") setmem(label[i], Number(adr[i]));
    }
    accumulator = 0;
    varindex = 0;
    pc = 0;
    instcount = 0;
    console.log("Derleme tamamlandı.");
}

// === Komut Yorumlayıcı ===
async function instr() {
    if (pc < 0) return false;
    const cmd = opcode[pc];
    const argument = adr[pc];

    if (cmd === "stop") {
        instcount++;
        if (debugMode) {
            const arg = argument && argument !== cmd ? ` ${argument}` : "";
            console.log(`🪯 Adım ${instcount} | Satır ${pc} | Komut: ${cmd}${arg} | ACC: ${accumulator}`);
        }
        console.log("🔵 Program durduruldu.");
        pc = -2;
        return false;
    }

    switch (cmd) {
        case "get":
            return new Promise((resolve) => {
                rl.question("📥 Değer girin: ", (val) => {
                    accumulator = Number(val);
                    instcount++;
                    if (debugMode)
                        console.log(`🪯 Adım ${instcount} | Satır ${pc} | Komut: ${cmd} ${argument} | ACC: ${accumulator}`);
                    pc++;
                    resolve(true);
                });
            });
        case "print": break;
        case "store": setmem(argument, accumulator); break;
        case "load": accumulator = litoradr(argument); break;
        case "add": accumulator += litoradr(argument); break;
        case "sub": accumulator -= litoradr(argument); break;
        case "mod": accumulator %= litoradr(argument); break;
        case "mul": accumulator *= litoradr(argument); break;
        case "square": accumulator *= accumulator; break;
        case "cubic": accumulator *= accumulator * accumulator; break;
        case "div":
            let denom = litoradr(argument);
            if (denom === 0) { console.log("❌ Sıfıra bölme hatası."); return false; }
            accumulator /= denom;
            break;
        case "goto": pc = findlab(argument) - 1; break;
        case "ifpos": if (accumulator > 0) pc = findlab(argument) - 1; break;
        case "ifzero": if (accumulator === 0) pc = findlab(argument) - 1; break;
        case "ifneg": if (accumulator < 0) pc = findlab(argument) - 1; break;
        case "abs": accumulator = Math.abs(accumulator); break;
        case "neg": accumulator = -accumulator; break;
        case "not": accumulator = (accumulator === 0 ? 1 : 0); break;
        case "and": accumulator = accumulator & litoradr(argument); break;
        case "or": accumulator = accumulator | litoradr(argument); break;
        case "xor": accumulator = accumulator ^ litoradr(argument); break;
        case "init":
            console.log("⚠️ init çalıştırılamaz."); return false;
        default:
            console.log(`❌ Hatalı opcode: ${cmd}`); return false;
    }

    instcount++;
    if (debugMode) {
        console.log(`🪯 Adım ${instcount} | Satır ${pc} | Komut: ${cmd} ${argument} | ACC: ${accumulator}`);
        if (cmd === "print") console.log("📤 Çıktı:", accumulator);
    }

    pc++;
    return true;
}

// === Ana Komutlar ===
async function run() {
    instcount = 0;
    while (pc >= 0) {
        const devam = await instr();
        if (!devam) break;
        if (instcount > INSTRUCTION_LIMIT) {
            console.log("⛔ Maksimum komut sınırı aşıldı.");
            break;
        }
    }
    console.log(`✅ Toplam ${instcount} adımda tamamlandı.`);
}

async function step() {
    if (pc == null) {
        console.log("ℹ️ Program başlatılmadı.");
    } else if (pc >= 0) {
        const devam = await instr();
        console.log(`✅ Adım ${instcount} tamamlandı.`);
        if (!devam && pc < 0) {
            console.log(`📊 Program ${instcount} adımda tamamlandı.`);
        }
    } else {
        console.log("🔵 Program tamamlandı.");
        console.log(`📊 Toplam adım sayısı: ${instcount}`);
    }
}

function restart() {
    accumulator = 0;
    pc = 0;
    instcount = 0;
    mem = {};
    vartab = {};
    varindex = 0;
    console.log("🔄 Simülatör sıfırlandı.");
}

function showMemory() {
    console.log("\n🔎 Bellek Durumu (mem):");
    for (const addr in mem) {
        console.log(`[${addr}] = ${mem[addr]}`);
    }
    console.log("\n🧠 Değişken Tablosu (vartab):");
    for (const variable in vartab) {
        console.log(`${variable} -> ${vartab[variable]}`);
    }
    console.log("");
}

// === Menü ===
async function menu() {
    console.log("\nMikroişlemci Simülatör Menüsü:");
    console.log("1. Derle (assemble)");
    console.log("2. Çalıştır (run)");
    console.log("3. Adım Adım Çalıştır (step)");
    console.log("4. Hafıza ve Değişkenleri Göster (debug)");
    console.log("5. Yeniden Başlat (reset)");
    console.log("6. Çıkış (exit)");

    rl.question("Seçiminizi yapın: ", async (choice) => {
        switch (choice.trim()) {
            case "1":
                let inputCode = "";
                console.log("Kodunuzu girin (boş satırla bitirin):");
                rl.on("line", async (line) => {
                    if (!line.trim()) {
                        rl.removeAllListeners("line");
                        assemble(inputCode);
                        await menu();
                    } else {
                        inputCode += line + "\n";
                    }
                });
                break;
            case "2": await run(); await menu(); break;
            case "3": await step(); await menu(); break;
            case "4": showMemory(); await menu(); break;
            case "5": restart(); await menu(); break;
            case "6": rl.close(); break;
            default: console.log("Geçersiz seçim."); await menu();
        }
    });
}

menu();

