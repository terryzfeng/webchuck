declare namespace STATE {
    const REQUEST_RENDER: number;
    const IB_FRAMES_AVAILABLE: number;
    const IB_READ_INDEX: number;
    const IB_WRITE_INDEX: number;
    const OB_FRAMES_AVAILABLE: number;
    const OB_READ_INDEX: number;
    const OB_WRITE_INDEX: number;
    const RING_BUFFER_LENGTH: number;
    const KERNEL_LENGTH: number;
}
/**
 * @class SharedBufferWorkletProcessor
 * @extends AudioWorkletProcessor
 */
declare class ChuckProcessor {
    /**
     * @constructor
     * @param {AudioWorkletNodeOptions} nodeOptions
     */
    constructor(nodeOptions: AudioWorkletNodeOptions);
    _initialized: boolean;
    /**
     * Without a proper coordination with the worker backend, this processor
     * cannot function. This initializes upon the event from the worker backend.
     *
     * @param {Event} eventFromWorker
     */
    _initializeOnEvent(eventFromWorker: Event): void;
    _states: Int32Array | undefined;
    _inputRingBuffer: Float32Array[] | undefined;
    _outputRingBuffer: Float32Array[] | undefined;
    _ringBufferLength: number | undefined;
    _kernelLength: number | undefined;
    /**
     * Push 128 samples to the shared input buffer.
     * @tzfeng OSC => AWP
     *
     * @param {Float32Array} inputChannelData The input data.
     */
    _pushInputChannelData(inputChannelData: Float32Array): void;
    /**
     * Pull the data out of the shared input buffer to fill |outputChannelData|
     * (128-frames).
     * @tzfeng AWP => DAC
     *
     * @param {Float32Array} outputChannelData The output array to be filled.
     */
    _pullOutputChannelData(outputChannelData: Float32Array): void;
    /**
     * AWP's process callback.
     *
     * @param {Array} inputs Input audio data.
     * @param {Array} outputs Output audio data.
     * @return {Boolean} Lifetime flag.
     */
    process(inputs: any[], outputs: any[]): boolean;
}
