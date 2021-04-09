// Host interfaces
import { attach as video    } from "../host/video-canvas";
import { attach as audio    } from "../host/audio-OscillatorNode";
import { attach as joystick } from "../host/joystick-KeyboardEvent";
import { attach as keyboard } from "../host/keyboard-KeyboardEvent";

// Target devices
import { attach as wires } from "../target/wires";
import { attach as ram   } from "../target/ram";
import { attach as vic   } from "../target/vic";
import { attach as sid   } from "../target/sid";
import { attach as cias  } from "../target/cias";
import { attach as cpu   } from "../target/cpu";
import { attach as tape  } from "../target/tape";

// ROMs
import basic     from "../target/rom/basic";
import kernal    from "../target/rom/kernal";
import character from "../target/rom/character";

// Bringup
import { bringup } from "../target/bringup";

// Everything else
import { attach as monitor }     from "../monitor";
import { attach as webFrontEnd } from "../host/webFrontEnd";
import { attach as dragAndDrop } from "../host/dragAndDrop";


import {
  KEYBOARD_BUFFER_ADDR,
  KEYBOARD_BUFFER_INDEX,
  KEYBOARD_BUFFER_LENGTH,
  AWAIT_KEYBOARD_PC
} from "../tools/romLocations";

const c64 = bringup({
  host:   { audio, video, keyboard, joystick },
  target: { wires, ram, vic, sid, cpu, cias, tape, basic, kernal, character },
  attachments: [
    monitor,
    dragAndDrop,
    webFrontEnd,
  ],
});

// Show static for a hot second before resetting
c64.vic.showStatic();
c64.runloop.run();

// loli harry potter
import { ingest } from "../host/ingest";
import loliPrg from "../host/webFrontEnd/demos/loli_harry_potter_prg";
import castleOfTerror from "../host/webFrontEnd/demos/Castle_of_terror_startup_snapshot";

setTimeout(
  () => {
//    c64.runloop.reset();
//    c64.runloop.run();
//    ingest(c64, ".prg", loliPrg);
    ingest(c64, "castleOfTerror.snapshot", castleOfTerror);
  },
  1000
);

var poller = function() {
    c64.ram.getVisibleText((text)=>{
        setTimeout(poller, 3000);
    });
};

setTimeout(
  () => {
    poller()
  },
  1000
);

var actualSelect = 'c64_text1';
var actualOption = 'textonscreen1';

function triggerNvdaRead(text) {
    // some trickery here as we don't want NVDA to read 'combobox' or other html element name, so
    // we set the first word in the aria-roledescription, NVDA will read it up and will read up the content next
    // but as the first ford is already read up, we need to put only the rest (without the first word) into the content
    var firstword = text.substr(0, text.indexOf(' ') );
    var rest = text.substr(text.indexOf(' ') + 1 );

    var actualSelectDomObject = document.getElementById( actualSelect );
    actualSelectDomObject.setAttribute('aria-roledescription', firstword);

    var actualOptionDomObject = document.getElementById( actualOption );
    actualOptionDomObject.innerText = rest;
    document.getElementById( actualSelect ).focus();

    // we need to swap the dom object where we focus on next time, otherwise NVDA will think we are on the same element and will not read up anything
    if ( actualSelect === 'c64_text1' ) {
        actualSelect = 'c64_text2';
        actualOption = 'textonscreen2';
    } else {
        actualSelect = 'c64_text1';
        actualOption = 'textonscreen1';
    }
//    actualSelect = actualSelect === 'c64_text1' ? 'c64_text2' : 'c64_text1'; // swap
//    actualOption = actualSelect === 'c64_text1' ? 'textonscreen1' : 'textonscreen2'; // set

    console.log(text);
}

c64.hooks.ctrlS = ()=> {
    console.log("Ctrl+S is pressed.");

    c64.hooks.userPressedY = ()=>{
        console.log('user pressed Y, we should save the snapshot');
        const serial = c64.runloop.serialize();
        localStorage.setItem('snapshot', JSON.stringify(serial));
        triggerNvdaRead('State saved.');

    };
    c64.hooks.userPressedAnyOther = ()=>{
        console.log('user cancelled the save snapshot action');
        triggerNvdaRead('Save action cancelled.');
    };
    c64.hooks.isUserChoise = ()=>{return true};

    triggerNvdaRead('Do you want to save the state? Press Y for yes or press any other to cancel this action.');
};

c64.hooks.ctrlR = ()=> {
    console.log("Ctrl+R is pressed.");
    c64.hooks.userPressedY = ()=>{
        console.log('user pressed Y, we should restore the snapshot');

        var serial = localStorage.getItem('snapshot');

        console.log('-----------------------');
        console.log( serial );
        console.log( typeof serial );

        if ( typeof serial === 'undefined' || serial == null ) {
            triggerNvdaRead('There is no snapshot saved yet, nothing to restore.');
        } else {
            c64.runloop.stop();
            c64.runloop.reset();
            c64.runloop.deserialize(JSON.parse(serial));
            c64.runloop.run();
            triggerNvdaRead('State restored.');
        }
    };
    c64.hooks.userPressedAnyOther = ()=>{
        console.log('user cancelled the restore snapshot action');
        triggerNvdaRead('Restore action cancelled.');
    };
    c64.hooks.isUserChoise = ()=>{return true};

    triggerNvdaRead('Do you want to restore previously saved state? Press Y for yes or press any other to cancel this action.');
};


c64.hooks.ctrlL = ()=> {
    console.log("Ctrl+L is pressed.");
    c64.ram.getVisibleText((text)=>{
       triggerNvdaRead(text.toUpperCase().replaceAll('>', ''));
    });
};

c64.hooks.ctrlI = ()=> {
    console.log("Ctrl+I is pressed.");
    document.getElementById("c64input").focus();
};

c64.hooks.ctrlM = ()=> {
    if ( c64.audio.isMuted() ) {
        c64.audio.setUiGain(1);
        triggerNvdaRead('Emulator unmuted.');
    } else {
        c64.audio.setUiGain(0);
        triggerNvdaRead('Emulator muted.');
    }
};

c64.hooks.enterPressed = ()=> {
    console.log('enter pressed, check the screen for redraw in the next couple of seconds');
};

window.onload = ()=> {
    document.addEventListener("keydown", (event)=>{
        var ev = event || window.event;  // Event object 'ev'
        var key = ev.which || ev.keyCode; // Detecting keyCode
        var ctrl = ev.ctrlKey ? ev.ctrlKey : ((key === 17)  ? true : false);
        // disabling ctrl + r and ctrl + s
        if ( ctrl && (key == 82 || key == 83) )  {
            event.preventDefault();
        }
    });

    async function a() {
        await c64.runloop.untilPc(AWAIT_KEYBOARD_PC);
        document.getElementById("c64input").focus();
    };
    a();

    setTimeout(
      () => {
        // c64.hooks.ctrlL();
        // document.getElementById("c64input").focus();
      },
      1000
    );

    setTimeout(
      () => {
//        c64.hooks.ctrlL();
        document.getElementById("c64input").focus();
        triggerNvdaRead("Welcome to the Castle of Terror Commodore 64 game. CTRL + L to listen what's on the screen. CTRL + S to save snapshot. CTRL + R to restore snapshot. CTRL + M to mute the emulator.");
      },
      1500
    );

};



