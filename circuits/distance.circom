pragma circom 2.1.8;

include "node_modules/circomlib/circuits/comparators.circom";

template DistanceWithinThreshold(n) {
    signal input a[n];
    signal input b[n];
    signal input threshold;

    signal output distance;
    signal output thresholdOut;
    signal output withinThreshold;

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
}

component main = DistanceWithinThreshold(16);
