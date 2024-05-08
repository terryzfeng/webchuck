// Copyright (c) 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { Chuck } from '../src/wc-bundle.js';

let audioContext = new AudioContext();
audioContext.suspend();

let theChuck;
// window.theChuck = theChuck;
var osc = new OscillatorNode(audioContext);

var initialized = () => {
    osc.connect(theChuck).connect(audioContext.destination);
    osc.start();
    audioContext.resume();
}
document.getElementById('action').addEventListener('click', async () => {
    // Initialize default ChucK object, if not already initialized
    if (theChuck === undefined) {
        theChuck = await Chuck.init2(audioContext, "../src/", initialized);
    }
});
