/*
   ram: emulates 64KiB of byte-addressed RAM
*/

import { base64Encode, base64Decode } from "../tools/base64";
import { videoAsAnsi }  from "../tools/videoAsAnsi";

// bound by attach
let c64;

const state = new Uint8Array(65536);

const petsciiToChar = (
  /* 0x00 */ "����������������" + /* 0x10 */ "����������������" +
  /* 0x20 */" !\"#$%&'()*+,-./" + /* 0x30 */ "0123456789:;<=>?" +
  /* 0x40 */ "@abcdefghijklmno" + /* 0x50 */ "pqrstuvwxyz[£]↑←" +
  /* 0x60 */ "—ABCDEFGHIJKLMNO" + /* 0x70 */ "PQRSTUVWXYZ┼▒│▒▒" +
  /* 0x80 */ "����������������" + /* 0x90 */ "����������������" +
  /* 0xa0 */ " ▌▄▔▁▎▒▕▒▒▕├▗└┐▂" + /* 0xb0 */ "┌┴┬┤▎▍▕▔▔▃✓▖▝┘▘▚" +
  /* 0xc0 */ "─ABCDEFGHIJKLMNO" + /* 0xd0 */ "PQRSTUVWXYZ┼▒│▒▒" +
  /* 0xe0 */ " ▌▄▔▁▎▒▕▒▒▕├▗└┐▂" + /* 0xf0 */ "┌┴┬┤▎▍▕▔▔▃✓▖▝┘▘▒"
);

export function attach(nascentC64) {
  c64 = nascentC64;

  nascentC64.ram = {
    // Control
    reset,
    serialize,
    deserialize,
    // Accessors
    readRam,
    writeRam,
    vicReadRam,
    vicReadActiveScreen,

    extractVisibleText,
    getVisibleText, // TODO remove?
    extractTextFromCoordinates, // don't expose?
    extractTextFromRow,  // don't expose?
    extractTextBetweenRows,  // don't expose?

    dumpScreen,  // remove?
    state  // don't expose?
  };

  reset();
}

function reset() {
  // Initialize RAM with 0xdeadbeef. Not to help our own debugging, but to
  // simulate static noise. Some games, like Dominator's tape loader, look for
  // a constant value in memory as a sign that you're trying to hack them, and
  // will crash if they detect one.
  for (let i = 0; i < 65536; i += 4) {
    state[i + 0] = 0xde;
    state[i + 1] = 0xad;
    state[i + 2] = 0xbe;
    state[i + 3] = 0xef;
  }
}

function serialize() {
  return base64Encode(state);
}

function deserialize(base64) {
  const bytes = base64Decode(base64);
  for (let i in bytes) {
    state[i] = bytes[i];
  }
}

function readRam(addr) {
  if (c64.hooks.onRamRead) c64.hooks.onRamRead(addr);
  return state[addr];
}

function vicReadRam(addr) {
  if (c64.hooks.onVicRead) c64.hooks.onVicRead(addr);
  return state[addr];
}

function vicReadActiveScreen() {
    // https://sta.c64.org/cbm64mem.html

    /* -----------------------------------------------------------------------------------------------------------------
    $D018 - 53272
    Memory setup register. Bits:
    Bits #1-#3: In text mode, pointer to character memory (bits #11-#13), relative to VIC bank, memory address $DD00. Values:
    %000, 0: $0000-$07FF, 0-2047.
    %001, 1: $0800-$0FFF, 2048-4095.
    %010, 2: $1000-$17FF, 4096-6143.
    %011, 3: $1800-$1FFF, 6144-8191.
    %100, 4: $2000-$27FF, 8192-10239.
    %101, 5: $2800-$2FFF, 10240-12287.
    %110, 6: $3000-$37FF, 12288-14335.
    %111, 7: $3800-$3FFF, 14336-16383.

    Values %010 and %011 in VIC bank #0 and #2 select Character ROM instead.
    In bitmap mode, pointer to bitmap memory (bit #13), relative to VIC bank, memory address $DD00. Values:
    %0xx, 0: $0000-$1FFF, 0-8191.
    %1xx, 4: $2000-$3FFF, 8192-16383.

    Bits #4-#7: Pointer to screen memory (bits #10-#13), relative to VIC bank, memory address $DD00. Values:
    %0000, 0: $0000-$03FF, 0-1023.
    %0001, 1: $0400-$07FF, 1024-2047.
    %0010, 2: $0800-$0BFF, 2048-3071.
    %0011, 3: $0C00-$0FFF, 3072-4095.
    %0100, 4: $1000-$13FF, 4096-5119.
    %0101, 5: $1400-$17FF, 5120-6143.
    %0110, 6: $1800-$1BFF, 6144-7167.
    %0111, 7: $1C00-$1FFF, 7168-8191.
    %1000, 8: $2000-$23FF, 8192-9215.
    %1001, 9: $2400-$27FF, 9216-10239.
    %1010, 10: $2800-$2BFF, 10240-11263.
    %1011, 11: $2C00-$2FFF, 11264-12287.
    %1100, 12: $3000-$33FF, 12288-13311.
    %1101, 13: $3400-$37FF, 13312-14335.
    %1110, 14: $3800-$3BFF, 14336-15359.
    %1111, 15: $3C00-$3FFF, 15360-16383.
    */

    /* -----------------------------------------------------------------------------------------------------------------
    $DD00 - 56576
    Bits #0-#1: VIC bank. Values:
    %00, 0: Bank #3, $C000-$FFFF, 49152-65535.
    %01, 1: Bank #2, $8000-$BFFF, 32768-49151.
    %10, 2: Bank #1, $4000-$7FFF, 16384-32767.
    %11, 3: Bank #0, $0000-$3FFF, 0-16383.

    Bit #2: RS232 TXD line, output bit.
    Bit #3: Serial bus ATN OUT; 0 = High; 1 = Low.
    Bit #4: Serial bus CLOCK OUT; 0 = High; 1 = Low.
    Bit #5: Serial bus DATA OUT; 0 = High; 1 = Low.
    Bit #6: Serial bus CLOCK IN; 0 = Low; 1 = High.
    Bit #7: Serial bus DATA IN; 0 = Low; 1 = High.
    */

    var memorySetupRegister = c64.wires.cpuRead(0xd018); //state[0xd018];
    var vicBankRegister = c64.wires.cpuRead(0xdd00) & 3 ; // state[0xdd00];
    var screenMemoryPointer = (memorySetupRegister >> 4) * 1024;

    var banks = new Array(4);
    banks[0] = 0xc000;
    banks[1] = 0x8000;
    banks[2] = 0x4000;
    banks[3] = 0x0000;

    var actualScreenMemoryAddress = banks[vicBankRegister] + screenMemoryPointer;
//    console.log('calculated video memory address = ' + actualScreenMemoryAddress.toString(16));
    var actualScreen = new Uint8Array(1024);
//    var actualScreen = new Array(1024);
    for (let i = 0; i < 1024; i ++) {
        actualScreen[i] = c64.wires.cpuRead(actualScreenMemoryAddress+i);
//        actualScreen[i] = state[actualScreenMemoryAddress+i];
    }

    return actualScreen;
}

// -------------------------------------------------------------------------------------------------------------------
var timerId = 0;
var previousVisibleText = '';
var pollingFrequencyMs = 1000;

const cols = 40;
const rows = 25;

function swapCase(letters){
    var newLetters = "";
    for(var i = 0; i<letters.length; i++){
        if(letters[i] === letters[i].toLowerCase()){
            newLetters += letters[i].toUpperCase();
        }else {
            newLetters += letters[i].toLowerCase();
        }
    }
    //console.log(newLetters);
    return newLetters;
}

// row : from 0 to 24
function extractTextFromRow(row) {
    var x1 = 0;
    var y1 = row;
    var x2 = cols;
    var y2 = y1+1;
    // console.log(' x1 = ' + x1 + ' , y1 = '  + y1 + ' , x2 = ' + x2 + ' , y2 = ' + y2);
    return swapCase(extractTextFromCoordinates(x1, y1, x2, y2)).trim()+' ';
}

function extractTextBetweenRows(row1, row2) {
//    var res = '';
    var res = new Array();
    for(var i = row1; i<row2; i++) {
        res.push(extractTextFromRow(i));
//        res+=extractTextFromRow(i);
    }
    return res;
}

// x2 > x1 and y2 > y1
// x : from 0 to 39
// y : from 0 to 24
function extractTextFromCoordinates(x1, y1, x2, y2) {
    var actualScreen = c64.ram.vicReadActiveScreen();
    var chars = '';
    for(var y = y1; y<y2; y++ ) {
        for(var x = x1; x<x2; x++ ) {
            var index = y * cols + x;
            var byte = actualScreen[index];
            var char = petsciiToChar[byte];
            chars+= char;

        }
    }
    return chars;
}

// this is castle of terror specific, TODO remove it from here
const cursorChar = '←'; // 0x5f = 95
const returnForMore = "*** RETURN for more *** ";
function extractVisibleText() {
    var line1 = extractTextFromRow(19);
    var line2 = extractTextFromRow(20);
    var line3 = extractTextFromRow(21);
    var line4 = extractTextFromRow(22);
    var line5 = extractTextFromRow(23);
    var line6 = extractTextFromRow(24);

    if ( line6 === returnForMore ) {
        return line1 + line2 + line3 + line4 + line5 + line6;
    }
    return line1 + line2 + line3 + line4 + line5;

}

function extractVisibleText_old(from, lastchar) {
    if ( typeof from === 'undefined' ) {
        from = 750; // castle of terror text output
    }
    if ( typeof lastchar === 'undefined' ) {
        lastchar = '←';
    }
    var actualScreen = c64.ram.vicReadActiveScreen();
    var prevChar = '';
    var chars = '';
    for(var i = from; i<actualScreen.length; i++ ) {
        var byte = actualScreen[i];
        // meaningful characters only
        if ( ( byte >= 0x20 && byte <= 0x7b) ) { //} || ( byte >= 0xc0 && byte <= 0xdd)  ) {
            var char = petsciiToChar[byte];
            if ( char == lastchar ) {
                break;
            }
            if ( ! ( prevChar == ' ' && char == ' ') ) {
                chars+= char;
                prevChar = char;
            }
        }
    }
    return chars;
}

function pollTextArea(callback) {
    if (typeof(timerId) != 'undefined') {
      // console.log('   there was a poller already running, cancelling it');
      clearTimeout(timerId);
    }

    var visibleText = extractVisibleText();

    // if there was no change in 1 second
    if ( visibleText == previousVisibleText ) {
        if (typeof(timerId) != 'undefined') {
          // console.log('   finished, cancelling poller');
          clearTimeout(timerId);
        }
        if ( typeof callback === 'function' ) {
            callback(visibleText);
        }
    } else {
        previousVisibleText = visibleText;
        timerId = setTimeout(pollTextArea, pollingFrequencyMs, callback);
    }
};

function getVisibleText(callback) {
    pollTextArea((visibleText)=>{
        if ( typeof callback === 'function' ) {
            callback(visibleText);
        }
    });
}

function dumpScreen() {
  console.log(videoAsAnsi(c64.wires.cpuRead));
}


function writeRam(addr, byte) {
  if (c64.hooks.onRamWrite) c64.hooks.onRamWrite(addr, byte);
  state[addr] = byte;
}
