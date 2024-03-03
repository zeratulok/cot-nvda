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
import { attach as screenreaderfunctions } from "../host/screenreaderfunctions";

const c64 = bringup({
  host:   { audio, video, keyboard, joystick },
  target: { wires, ram, vic, sid, cpu, cias, tape, basic, kernal, character },
  attachments: [
    monitor,
    dragAndDrop,
    webFrontEnd,
    screenreaderfunctions
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

