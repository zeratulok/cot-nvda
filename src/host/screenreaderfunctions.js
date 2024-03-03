import { attach as ram   } from "../target/ram";
import { attach as keyboard } from "../host/keyboard-KeyboardEvent";
import {
  KEYBOARD_BUFFER_ADDR,
  KEYBOARD_BUFFER_INDEX,
  KEYBOARD_BUFFER_LENGTH,
  AWAIT_KEYBOARD_PC
} from "../tools/romLocations";

var firstRun = true;

// Castle of Terror related
const cursorChar = '←'; // 0x5f = 95
const RETURN_FOR_MORE_TEXT = "*** RETURN for more *** ";
const PROMPT_TEXT =  '>'+cursorChar+' ';

const modes = { PROMPT: 'PROMPT', UDPATING: 'UPDATING', PRESSRETURN: 'PRESSRETURN', SCENELOADING: 'SCENELOADING'};

var mode = modes.UPDATING;

var buffer = new Array();
var previousText;
var dynamicPreviousText;
var dynamicPreviousScene;

var audio = new Audio('https://zeratulok.github.io/c64/mixkit-typing-on-an-electronic-device-1376.wav');

// NVDA related
var actualSelect = 'c64_text1';
var actualOption = 'textonscreen1';
//var inputElement = 'c64input';
var inputElement = 'scopeSelect';

let c64;

export function attach(nascentC64) {
  c64 = nascentC64;
  initHooks();
  async function a() {
      await c64.runloop.untilPc(AWAIT_KEYBOARD_PC);
      document.getElementById(inputElement).focus();
//       ariaLiveContainer.focus();
  };
  a();
}

function subtractTwoArrays(arr1, arr2) {
	return arr1.filter( el => !arr2.includes(el) ).filter( el => el.trim() != '');
};

function getNewLines(previous, actual) {
    var matchingLines = [];
    var disappeared = [];
    var firsthit = true;

	for(var a=0; a<actual.length; a++) {
        for(var i=0; i<previous.length;i++) {
            if ( previous[i] === actual[a] ) {
                matchingLines.push(previous[i]);
                if ( firsthit ) {
                    for(var j=0; j<i; j++) {
                        disappeared.push(previous[j]);
                    }
                    firsthit = false;
                }
            }
        }
    }
    var newLines = subtractTwoArrays(actual, matchingLines );
    return newLines;
}


var isPressReturnDisplayed = function(text) {
    if ( typeof text != 'undefined' && text.length > 0 ) {
        var lastLine = text[text.length-1];
        return lastLine === RETURN_FOR_MORE_TEXT;
    }
    return false;
}

var isPromptDisplayed = function(text) {
    if ( typeof text != 'undefined' && text.length > 0 ) {
        var lastLine = text[text.length-1];
//        return lastLine === PROMPT_TEXT || lastLine === RETURN_FOR_MORE_TEXT;
        return lastLine === PROMPT_TEXT;
    }
    return false;
}

function modeChangedToPrompt(text) {
    // console.log('[+++] mode changed to PROMPT');
    var newText = getNewLines(previousText, text);
    if ( Array.isArray(newText) && newText.length > 0 ) {
        // console.log('********* buffer + new text ');
        var newTextWithBuffer = buffer.concat(newText);
        // console.log( newTextWithBuffer );
        triggerNvdaRead(newTextWithBuffer.join('').replaceAll(PROMPT_TEXT, ''));

        buffer = new Array();
    }
    previousText = text;
}

function modeChangedToPressReturn(text) {
    // console.log('[+++] mode changed to PRESS RETURN');
    var newText = getNewLines(previousText, text);
    if ( Array.isArray(newText) && newText.length > 0 ) {
        // saves to the buffer
        for(var i=0;i<newText.length-1;i++) {  // length-1 as we don't wan to save the "PRESS RETURN" text
            buffer.push(newText[i]);
        }
        // and presses return automatically
        c64.keyboard.buttonNamesToKeyMatrix(['Return']);
    }
    previousText = text;
}


function modeChangedToUpdating(text) {
    console.log('[+++] mode changed to UPDATING');
    //triggerNvdaRead('Text updating');
    audio.play();
}

function modeChangedToSceneLoading() {
    // console.log('[+++] mode changed to SCENE LOADING');
    triggerNvdaRead('Loading next scene');
}

function isDifferent(text1, text2) {
    if ( typeof text1 === 'undefined' || typeof text2 === 'undefined' ) {
        return false;
    }

    var newText = getNewLines(text1, text2);

//     var isDifferent = Array.isArray(newText) && newText.length > 0;
//     if ( isDifferent ) {
//        console.log('-----------------difference:');
//        console.log(newText);
//     }

    return Array.isArray(newText) && newText.length > 0;
}


var poller = function() {
    var text = c64.ram.extractTextBetweenRows(19, 25);

    var dynamicText = c64.ram.extractTextBetweenRows(19, 24); // without command line

    var dynamicScene = c64.ram.extractTextBetweenRows(0, 18); // scene

    if ( typeof dynamicPreviousText === 'undefined' ) {
        dynamicPreviousText = dynamicText;
    }

    if ( typeof dynamicPreviousScene === 'undefined' ) {
        dynamicPreviousScene = dynamicScene;
    }

    if ( typeof previousText === 'undefined' ) {
        previousText = text;
    }

    if ( ( mode === modes.UPDATING && isPromptDisplayed(text) ) || ( mode === modes.PRESSRETURN && isPromptDisplayed(text) ) )  {
        modeChangedToPrompt(text);
        mode = modes.PROMPT;
        dynamicPreviousText = dynamicText;
    }

    if ( mode === modes.UPDATING && isPressReturnDisplayed(text) ) {
        modeChangedToPressReturn(text);
        mode = modes.PRESSRETURN;
    }

//    if ( (mode === modes.PRESSRETURN || mode === modes.PROMPT) && !isPromptDisplayed(text) && !isPressReturnDisplayed(text) ) {
//        modeChangedToUpdating(text);
//        mode = modes.UPDATING;
//    }

    if ( mode != modes.UPDATING && mode != modes.PRESSRETURN && isDifferent(dynamicPreviousText, dynamicText) ) {
        modeChangedToUpdating(dynamicText);
        mode = modes.UPDATING;
    }
    dynamicPreviousText = dynamicText;

//    if ( mode != modes.SCENELOADING && isDifferent(dynamicPreviousScene, dynamicScene) ) {
//        modeChangedToSceneLoading();
//        mode = modes.SCENELOADING;
//    }
//
//    dynamicPreviousScene = dynamicScene;

    setTimeout(poller, 500);
};

setTimeout(
  () => {
    poller()
  },
  500
);

var nvdaTimer;
var ariaLiveContainer;

function triggerNvdaRead(text) {
    if ( typeof ariaLiveContainer === 'undefined' ) {
        ariaLiveContainer = document.getElementById('sr-only');
    }
    console.log("*** NVDA READ: " + text );

    if (typeof(nvdaTimer) != 'undefined') {
      // console.log('   there was a poller already running, cancelling it');
      clearTimeout(nvdaTimer);
      ariaLiveContainer.innerHTML = "";
    }

    audio.pause();

    ariaLiveContainer.appendChild(document.createTextNode(text));
    nvdaTimer = setTimeout(function () {
       ariaLiveContainer.innerHTML = "";
    }, 500);
}

function triggerNvdaRead2(text) {
    // some trickery here as we don't want NVDA to read 'combobox' or other html element name, so
    // we set the first word in the aria-roledescription, NVDA will read it up and will read up the content next
    // but as the first ford is already read up, we need to put only the rest (without the first word) into the content
    var firstword = text.substr(0, text.indexOf(' ') );
    var rest = text.substr(text.indexOf(' ') + 1 );

    var actualSelectDomObject = document.getElementById( actualSelect );
    actualSelectDomObject.setAttribute('aria-roledescription', firstword);

    var actualOptionDomObject = document.getElementById( actualOption );
    actualOptionDomObject.innerText = rest;

    audio.pause();

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

    console.log('   **** [NVDA]: ' +  text);
}

function initHooks() {

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
        var text = c64.ram.extractVisibleText();
        triggerNvdaRead(text.replaceAll(PROMPT_TEXT, ''));
    };

    c64.hooks.ctrlI = ()=> {
        console.log("Ctrl+I is pressed.");
        document.getElementById(inputElement).focus();
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
        // console.log(document.activeElement);
        // c64.keyboard.buttonNamesToKeyMatrix(['Return']);
    };
}

function sayWelcome() {
    // triggerNvdaRead("Welcome to the Castle of Terror Commodore 64 game. CTRL + L to listen what's on the screen. CTRL + S to save snapshot. CTRL + R to restore snapshot. CTRL + M to mute the emulator.");
}

window.onload = ()=> {
    document.addEventListener("keydown", (event)=>{
        var ev = event || window.event;  // Event object 'ev'
        var key = ev.which || ev.keyCode; // Detecting keyCode
        var ctrl = ev.ctrlKey ? ev.ctrlKey : ((key === 17)  ? true : false);
        // disabling ctrl + r and ctrl + s
        if ( ctrl && (key == 82 || key == 83) )  {
            event.preventDefault();
        }
        //keyboard.onKeyDown(event);
    });

    document.addEventListener("keydown", keyboard.onKeyDown);
    document.addEventListener("keyup",   keyboard.onKeyUp);
    document.addEventListener("blur",    keyboard.onBlur);

//    async function a() {
//        await c64.runloop.untilPc(AWAIT_KEYBOARD_PC);
//        document.getElementById(inputElement).focus();
//    };
//    a();

   /* setTimeout(
      () => {
        // c64.hooks.ctrlL();
        // document.getElementById(inputElement).focus();
      },
      1000
    );*/

   var c64input = document.getElementById(inputElement);
   ariaLiveContainer = document.getElementById('sr-only');

   //ariaLiveContainer.focus();



   // c64input.focus();

    setTimeout(
      () => {
//        c64.hooks.ctrlL();
//        document.getElementById(inputElement).focus();
 //        sayWelcome();
         document.getElementById('c64input').focus();
    },
      100
    );

    setTimeout(
      () => {
//        c64.hooks.ctrlL();
//        document.getElementById(inputElement).focus();
 //        sayWelcome();
         document.getElementById('scopeSelect').focus();
    },
      600
    );

};



