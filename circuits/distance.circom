pragma circom 2.1.8;

include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/poseidon.circom";

template DistanceTranscript(n) {
    signal input a[n];
    signal input b[n];
    signal input threshold;

    signal output distance;
    signal output thresholdOut;
    signal output withinThreshold;
    signal output referenceHash;
    signal output candidateHash;
    signal output transcriptHash;

    var sum = 0;
    signal diff[n];
    signal sq[n];

    for (var i = 0; i < n; i++) {
        diff[i] <== a[i] - b[i];
        sq[i] <== diff[i] * diff[i];
        sum += sq[i];
    }

    distance <== sum;
    thresholdOut <== threshold;

    component cmp = LessThan(253);
    cmp.in[0] <== threshold + 1;
    cmp.in[1] <== distance + 1;
    withinThreshold <== 1 - cmp.out;

    signal refChain[n + 1];
    signal candChain[n + 1];

    refChain[0] <== 0;
    candChain[0] <== 0;

    component refHashers[n];
    component candHashers[n];

    for (var j = 0; j < n; j++) {
        refHashers[j] = Poseidon(2);
        refHashers[j].inputs[0] <== refChain[j];
        refHashers[j].inputs[1] <== a[j];
        refChain[j + 1] <== refHashers[j].out;

        candHashers[j] = Poseidon(2);
        candHashers[j].inputs[0] <== candChain[j];
        candHashers[j].inputs[1] <== b[j];
        candChain[j + 1] <== candHashers[j].out;
    }

    referenceHash <== refChain[n];
    candidateHash <== candChain[n];

    component transcript = Poseidon(4);
    transcript.inputs[0] <== referenceHash;
    transcript.inputs[1] <== candidateHash;
    transcript.inputs[2] <== threshold;
    transcript.inputs[3] <== distance;
    transcriptHash <== transcript.out;
}

component main = DistanceTranscript(16);
