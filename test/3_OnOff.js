if (typeof require == 'function') Swarm = require('../lib/swarm3.js');
Spec = Swarm.Spec;
Model = Swarm.Model;
Field = Swarm.Field;
Set = Swarm.Set;


var Thermometer = Swarm.Model.extend('Thermometer',{
    defaults: {
        t: -20 // Russia :)
    }
});


asyncTest('3.a serialized on, reon', function (){
    console.warn(QUnit.config.current.testName);
    var storage = new DummyStorage(true);
    var uplink = new Swarm.Host('swarm~3a',0,storage);
    var downlink = new Swarm.Host('client~3a');
    // that's the default uplink.getSources = function () {return [storage]};
    
    var conn = new AsyncLoopbackConnection('loopback:3a');
    var nnoc = new AsyncLoopbackConnection('loopback:a3');
    
    var upperPipe = new Swarm.Pipe(uplink, conn); // waits for 'data'/'close'
    var lowerPipe = new Swarm.Pipe(downlink, nnoc);
    downlink.connect(lowerPipe); // TODO possible mismatch
    
    //downlink.getSources = function () {return [lowerPipe]};
    
    downlink.on('/Thermometer#room.init',function i(spec,val,obj){
        obj.set({t:22});
    });
    
    setTimeout(function x(){
        var o = uplink.objects['/Thermometer#room'];
        ok(o);
        o && equal(o.t,22);
        //downlink.disconnect(lowerPipe);
        start();
        upperPipe.close();
    },250);

});


asyncTest('3.b pipe reconnect, backoff', function (){
    console.warn(QUnit.config.current.testName);
    var storage = new DummyStorage(false);
    var uplink = new Swarm.Host('swarm~3b',0,storage);
    var downlink = new Swarm.Host('client~3b');
    
    var lowerPipe = new Swarm.Pipe(downlink,'loopback:3b');
    var upperPipe = new Swarm.Pipe(uplink,'loopback:b3');

    downlink.connect(lowerPipe);

    var thermometer = uplink.get(Thermometer), i=0;

    // OK. The idea is to connect/disconnect it 100 times then
    // check that the state is OK, there are no zombie listeners
    // no objects/hosts, log is 1 record long (distilled) etc

    var ih = setInterval(function(){
        thermometer.set({t:i});
        if (i++==30) {
            ok(thermometer._lstn.length<=3); // storage and maybe the client
            clearInterval(ih);
            start();
            lowerPipe.close();
        }
    },100);

    // FIXME sets are NOT aggregated; make a test for that

    downlink.on(thermometer.spec().toString() + '.set', function i(spec,val,obj){
        console.log('YPA ',val);
        if (spec.method()==='set') {
            lowerPipe.stream && lowerPipe.stream.close();
        }
    });
    
});

