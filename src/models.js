// =====================================================================
// DATA STRUCTURES
// =====================================================================

class StageInterval {
    constructor(laneId, stageName, startCycle, endCycle) {
        this.laneId = laneId;
        this.stageName = stageName;
        this.startCycle = startCycle;
        this.endCycle = endCycle;
    }
}

class Instruction {
    constructor(idInFile, tid, cycle, retireCycle) {
        this.idInFile = idInFile;
        this.tid = tid;
        this.cycle = cycle;
        this.retireCycle = retireCycle;
        this.retireType = 0;
        this.labels = [];
        this.stages = [];
    }
}

class Dependency {
    constructor(producerId, consumerId, type) {
        this.producerId = producerId;
        this.consumerId = consumerId;
        this.type = type;
    }
}

class KonataTrace {
    constructor(startCycle, endCycle, instructions, dependencies, maxLaneId = 0) {
        this.startCycle = startCycle;
        this.endCycle = endCycle;
        this.instructions = instructions;
        this.dependencies = dependencies;
        this.maxLaneId = maxLaneId;
    }
}
