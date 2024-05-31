// Copyright (c) 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { Chuck } from '../src/wc-bundle.js';

let audioContext = new AudioContext();
window.audioContext = audioContext;
audioContext.suspend();
let osc = audioContext.createOscillator();

let theChuck;

document.getElementById('action').addEventListener('click', async () => {
    // Initialize default ChucK object, if not already initialized
    if (theChuck === undefined) {
        Chuck.loadChugin("./ChuGL.chug.wasm");
        // Chuck.loadChugin("./ABSaturator.chug.wasm");
        theChuck = await Chuck.initAsWorker([], audioContext, 1, "../src/");
        // TODO: @tzfeng 
        // default only works when there is input going into chuck, otherwise atomic is never triggered
        // currently hacked a workaround
        theChuck.connect(audioContext.destination);
        audioContext.resume();

        theChuck.runCode(`
            <<< GG.foo >>>; // should print 12345
            Blit s => dac;
            Blit s2 => dac;
            .5 => s.gain;
            .2 => s2.gain;

            1::second => now;
        `);

        // theChuck.runCode(`
        // // patch
        // <<< GG.foo >>>; // should print 12345
        // Blit s => ADSR e => JCRev r => dac;
        // .5 => s.gain;
        // .05 => r.mix;

        // // set adsr
        // e.set( 5::ms, 3::ms, .5, 5::ms );

        // // an array
        // [ 0, 2, 4, 7, 9, 11 ] @=> int hi[];

        // // infinite time loop
        // while( true )
        // {
        //     // frequency
        //     Std.mtof( 33 + Math.random2(0,3) * 12 +
        //         hi[Math.random2(0,hi.size()-1)] ) => s.freq;

        //     // harmonics
        //     Math.random2( 1, 5 ) => s.harmonics;

        //     // key on
        //     e.keyOn();
        //     // advance time
        //     120::ms => now;
        //     // key off
        //     e.keyOff();
        //     // advance time
        //     5::ms => now;
        // }
        // `)
    }
});
