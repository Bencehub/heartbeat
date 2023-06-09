
// Sample.source -> gain (midiEvent.velocity) ->
// Track.input -> [FX input ~~ FX output] -> Track.panner (Track.setPanning())-> Track.output (Track.setVolume())
// Song.gain (Song.setVolume()) ->
// Sequencer.gain (sequencer.setMasterVolume()) -> Sequencer.compressor -> context.destiny

(function(){

    'use strict';

    var
        // satisfy jslint
        sequencer = window.sequencer,
        console = window.console,

        id = 0,
        context,

        createClass, // defined in util.js
        getSample, // defined in instrument_manager.js

        Reverb,
        Panner,
        Panner2,
        Delay,
        BiQuadFilter,
        Compressor;


    function Effect(config){
        this.id = 'FX' + id++ + '' + new Date().getTime();
        this.type = config.type;
        this.buffer = config.buffer;
        this.config = config;

        this.bypass = false;
        this.amount = 0;//0.5;

        this.output = context.createGainNode();
        this.wetGain = context.createGainNode();
        this.dryGain = context.createGainNode();
        this.output.gain.value = 1;
        this.wetGain.gain.value = this.amount;
        this.dryGain.gain.value = 1 - this.amount;
    }


    Effect.prototype.setInput = function(input){
        // input.connect(this.node);
        // return;

        // dry channel
        input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        // wet channel
        input.connect(this.node);
        this.node.connect(this.wetGain);
        this.wetGain.connect(this.output);
    };

/*
    Effect.prototype.setOutput = function(output){
        this.output.disconnect(0);
        this.output.connect(output);
    };
*/

    Effect.prototype.setAmount = function(value){
        /*
        this.amount = value < 0 ? 0 : value > 1 ? 1 : value;
        var gain1 = Math.cos(this.amount * 0.5 * Math.PI),
            gain2 = Math.cos((1.0 - this.amount) * 0.5 * Math.PI);
        this.gainNode.gain.value = gain2 * this.ratio;
        */

        this.amount = value < 0 ? 0 : value > 1 ? 1 : value;
        this.wetGain.gain.value = this.amount;
        this.dryGain.gain.value = 1 - this.amount;
        //console.log('wet',this.wetGain.gain.value,'dry',this.dryGain.gain.value);
    };


    Effect.prototype.copy = function(){
        switch(this.type){
            case 'reverb':
                return new Reverb(this.config);
            case 'panner':
                return new Panner(this.config);
            case 'panner2':
                return new Panner2(this.config);
            case 'delay':
                return new Delay(this.config);
            case 'compressor':
                return new Compressor(this.config);
        }
    };


    sequencer.createReverb = function(id){
        var buffer = getSample(id);
        if(buffer === false){
            console.warn('no reverb with id', id, 'loaded');
            return false;
        }
        var config = {
            type: 'reverb',
            buffer: buffer
        };
        return new Reverb(config);
    };


    sequencer.createPanner = function(config){
        config = config || {};
        config.type = 'panner';
        return new Panner(config);
    };


    sequencer.createPanner2 = function(config){
        config = config || {};
        config.type = 'panner2';
        return new Panner2(config);
    };


    sequencer.createDelay = function(config){
        config = config || {};
        config.type = 'delay';
        return new Delay(config);
    };


    sequencer.createCompressor = function(config){
        config = config || {};
        config.type = 'compressor';
        return new Compressor(config);
    };


    sequencer.createBiQuadFilter = function(config){
        config = config || {};
        config.type = 'biquadfilter';
        return new BiQuadFilter(config);
    };


    sequencer.protectedScope.addInitMethod(function(){
        context = sequencer.protectedScope.context;
        createClass = sequencer.protectedScope.createClass;
        getSample = sequencer.getSample;

        Reverb = createClass(Effect, function(config){
            this.node = context.createConvolver();
            this.node.buffer = config.buffer;
            //console.log(this.node.buffer);
        });

        Panner = createClass(Effect, function(config){
            this.node = context.createPanner();
            this.node.panningModel = 'equalpower';
            this.node.setPosition(0, 0, 0);
        });

        Panner2 = createClass(Effect, function(config){
            this.node = context.createPanner();
            this.node.panningModel = 'HRTF';
            this.node.setPosition(0, 0, 0);
        });

        Delay = createClass(Effect, function(config){
            this.node = context.createDelay();
            this.node.delayTime.value = 0.3;
        });

        Compressor = createClass(Effect, function(config){
            this.node = context.createDynamicsCompressor();
        });


        BiQuadFilter = createClass(Effect, function(config){
            this.node = context.createBiquadFilter();
            this.node.type = 0;
            this.node.Q.value = 4;
            this.node.frequency.value = 1600;
        });

        /*
        Panner.prototype.setPosition = function(x, y, z){
            var multiplier = 5;
            console.log(x * multiplier);
            this.node.setPosition(x * multiplier, y * multiplier, z * multiplier);
        };
        */

        Panner.prototype.setPosition = function(value){
            var x = value,
                z = 1 - Math.abs(x);
            this.node.setPosition(x, 0, z);
            //console.log(x,z);
        };

        Panner2.prototype.setPosition = function(value){
            var xDeg = parseInt(value),
                zDeg = xDeg + 90,
                x, z;
            if (zDeg > 90) {
                zDeg = 180 - zDeg;
            }
            x = Math.sin(xDeg * (Math.PI / 180));
            z = Math.sin(zDeg * (Math.PI / 180));
            this.node.setPosition(x, 0, z);
        };

        Delay.prototype.setTime = function(value){
            this.node.delayTime.value = value;
        };

    });
}());


/*

        // only reverb is currently supported, filter out reverb
        if(this.numEffects > 0){
            for(i in this.effects){
                if(this.effects.hasOwnProperty(i)){
                   effect = this.effects[i];
                   if(this.reverb === undefined && effect.type === 'reverb'){
                        this.reverb = effect;
                        break;
                   }
                }
            }
            this.source.connect(this.reverb.node);
            this.reverb.node.disconnect(0);
            this.reverb.node.connect(this.wetGain);
            this.wetGain.gain.value = this.reverb.amount;
            this.dryGain.gain.value = (1 - this.reverb.amount);
        }else{
            this.dryGain.gain.value = 1;
        }


*/



