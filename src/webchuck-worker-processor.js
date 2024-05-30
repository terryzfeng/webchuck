//-----------------------------------------------------------------------------
// title: WebChucK Worker Processor
// desc:  WebChucK AudioWorkletProcessor implementation for WebChucK 
//        when running as a Web Worker.
//        
//        This is an extension of the SharedBufferWorkletProcessor 
//        implementation from Chome Web Audio Samples, extended for 
//        multi-channel audio processing from WebChucK.
//
// author: terry feng (tzfeng@ccrma.stanford.edu)
// date:   May 2024
//-----------------------------------------------------------------------------

/**
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
const STATE = {
    'REQUEST_RENDER': 0,
    'IB_FRAMES_AVAILABLE': 1,
    'IB_READ_INDEX': 2,
    'IB_WRITE_INDEX': 3,
    'OB_FRAMES_AVAILABLE': 4,
    'OB_READ_INDEX': 5,
    'OB_WRITE_INDEX': 6,
    'RING_BUFFER_LENGTH': 7,
    'KERNEL_LENGTH': 8,
};

const RENDER_QUANTUM_FRAMES = 128;

/**
 * @class SharedBufferWorkletProcessor
 * @extends AudioWorkletProcessor
 */
class ChuckProcessor extends AudioWorkletProcessor {
    /**
     * @constructor
     * @param {AudioWorkletNodeOptions} nodeOptions
     */
    constructor(nodeOptions) {
        super();

        this._initialized = false;
        this._numQuantumFrames = 0;  
        this.port.onmessage = this._initializeOnEvent.bind(this);
    }

    /**
     * Without a proper coordination with the worker backend, this processor
     * cannot function. This initializes upon the event from the worker backend.
     *
     * @param {Event} eventFromWorker
     */
    _initializeOnEvent(eventFromWorker) {
        const sharedBuffers = eventFromWorker.data;

        // Get the states buffer.
        this._states = new Int32Array(sharedBuffers.states);

        // Worker's input/output buffers. This example only handles mono channel
        // for both.
        this._inputRingBuffer = [new Float32Array(sharedBuffers.inputRingBuffer)];
        this._outputRingBuffer = [new Float32Array(sharedBuffers.outputRingBuffer)];

        this._ringBufferLength = this._states[STATE.RING_BUFFER_LENGTH];
        this._kernelLength = this._states[STATE.KERNEL_LENGTH];

        this._initialized = true;
        this.port.postMessage({
            message: 'PROCESSOR_READY',
        });
    }

    /**
     * Push 128 samples to the shared input buffer.
     * @tzfeng OSC => AWP
     *
     * @param {Float32Array} inputChannelData The input data.
     */
    _pushInputChannelData(inputChannelData) {
        const inputWriteIndex = this._states[STATE.IB_WRITE_INDEX];

        if (inputWriteIndex + inputChannelData.length < this._ringBufferLength) {
            // If the ring buffer has enough space to push the input.
            this._inputRingBuffer[0].set(inputChannelData, inputWriteIndex);
            this._states[STATE.IB_WRITE_INDEX] += inputChannelData.length;
        } else {
            // When the ring buffer does not have enough space so the index needs to
            // be wrapped around.
            const splitIndex = this._ringBufferLength - inputWriteIndex;
            const firstHalf = inputChannelData.subarray(0, splitIndex);
            const secondHalf = inputChannelData.subarray(splitIndex);
            this._inputRingBuffer[0].set(firstHalf, inputWriteIndex);
            this._inputRingBuffer[0].set(secondHalf);
            this._states[STATE.IB_WRITE_INDEX] = secondHalf.length;
        }

        // Update the number of available frames in the input ring buffer.
        this._states[STATE.IB_FRAMES_AVAILABLE] += inputChannelData.length;
    }

    /**
     * Pull the data out of the shared input buffer to fill |outputChannelData|
     * (128-frames).
     * @tzfeng AWP => DAC
     *
     * @param {Float32Array} outputChannelData The output array to be filled.
     */
    _pullOutputChannelData(outputChannelData) {
        const outputReadIndex = this._states[STATE.OB_READ_INDEX];
        const nextReadIndex = outputReadIndex + outputChannelData.length;

        if (nextReadIndex < this._ringBufferLength) {
            outputChannelData.set(this._outputRingBuffer[0].subarray(outputReadIndex, nextReadIndex));
            this._states[STATE.OB_READ_INDEX] += outputChannelData.length;
        } else {
            const overflow = nextReadIndex - this._ringBufferLength;
            const firstHalf = this._outputRingBuffer[0].subarray(outputReadIndex);
            const secondHalf = this._outputRingBuffer[0].subarray(0, overflow);
            outputChannelData.set(firstHalf);
            outputChannelData.set(secondHalf, firstHalf.length);
            this._states[STATE.OB_READ_INDEX] = secondHalf.length;
        }
    }

    /**
     * AWP's process callback.
     * @param {Array} inputs Input audio data.
     * @param {Array} outputs Output audio data.
     * @return {Boolean} Lifetime flag.
     */
    process(inputs, outputs) {
        if (!this._initialized) {
            return true;
        }
        // This example only handles mono channel.
        // TODO: @tzfeng needs to handle multi-channel.
        // original:
        // const inputChannelData = inputs[0][0];
        // const outputChannelData = outputs[0][0];
        // this._pushInputChannelData(inputChannelData);
        // this._pullOutputChannelData(outputChannelData);

        const input = inputs[0];
        for (let channel = 0; channel < input.length; ++channel) {
            if (input[channel].length > 0) {
                this._pushInputChannelData(input[channel]);
            }
        }

        const output = outputs[0];
        for (let channel = 0; channel < output.length; ++channel) {
            if (output[channel].length > 0) {
                this._pullOutputChannelData(output[channel]);
            }
        }

        // TODO: @tzfeng - is only true when there is input going into chuck
        // need to figure out how to trigger this when there is no input
        // if (this._states[STATE.IB_FRAMES_AVAILABLE] >= this._kernelLength
        // ) {
        //     // Now we have enough frames to process. Wake up the worker.
        //     Atomics.notify(this._states, STATE.REQUEST_RENDER, 1);
        // }

        // @tzfeng - this is a hack to trigger the worker to process
        // RENDER_QUANTUM_FRAMES == input[0].length
        this._numQuantumFrames += RENDER_QUANTUM_FRAMES;
        if (this._numQuantumFrames >= this._kernelLength) {
            // Now we have enough frames to process. Wake up the worker.
            Atomics.notify(this._states, STATE.REQUEST_RENDER, 1);
            this._numQuantumFrames = 0;
        }

        return true;
    }
}

registerProcessor('chuck-processor', ChuckProcessor);
