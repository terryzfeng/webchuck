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
        theChuck = await Chuck.init2([], audioContext, undefined, "../src/");
        // TODO: @tzfeng 
        // only works when there is input going into chuck, otherwise atomic is never triggered
        // osc.connect(theChuck).connect(audioContext.destination);
        theChuck.connect(audioContext.destination);
        audioContext.resume();
    }
});
