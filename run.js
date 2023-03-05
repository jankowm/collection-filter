const fs = require("fs");
const { table } = require("table");
const {
  buildIndexArr,
  buildIndexPojo,
  buildIndexMap,
  buildIndexSet,
} = require("./buildIndexes");
const { testPerformance, printTime } = require("./performance");
const {
  CONTROL_RUN,
  filterIntersection,
  filterIterativeCol,
  filterIterativePojo,
  filterIterativeMap,
  filterIterativeSet,
} = require("./filter");

const CONFIG = {
  buildIndexWarmUpRepeats: 5,
  buildIndexRepeats: 10,

  testWarmUpRepeats: 10,

  methodWarmUpRepeats: 1,
  methodRunRepeats: 10,
};

const filterScenarios = [
  CONTROL_RUN,
  {
    status: "ACTIVE",
  },
  {
    status: ["ACTIVE", "IN_PROGRESS", "DELIVERED"],
  },
  {
    status: ["ACTIVE", "IN_PROGRESS", "DELIVERED"],
    city: ["Zakopane", "Katowice", "Bydgoszcz"],
  },
  {
    status: "ERROR",
    delivery: "FedEx",
  },
  {
    status: "IN_PROGRESS",
    city: "Wroclaw",
    delivery: "DPD",
  },
  {
    status: ["ACTIVE", "IN_PROGRESS", "DELIVERED"],
    city: "Warszawa",
    delivery: "InPost",
  },
  {
    status: ["ACTIVE", "IN_PROGRESS", "DELIVERED"],
    city: ["Krakow", "Gdynia", "Szczecin"],
    delivery: ["InPost", "Pocztex", "UPS"],
  },
];

// load data
let data = null;
const loadData = () => {
  console.log(`===== DATA =====`);
  const entriesNo = process.argv[2] ? parseInt(process.argv[2]) : 10000;
  const fileName = `data_${entriesNo}.json`;

  if (!fs.existsSync(fileName)) {
    console.error(
      `File for ${entriesNo} entries not found. Please choose another number.`
    );
    process.exit();
  }

  data = JSON.parse(fs.readFileSync(fileName, "utf8"));

  console.log(
    `Successfully loaded collection of ${
      Object.keys(data.collection).length
    } entries`
  );
};

/**
 * INDEXES
 */
let indexTime = null;

const runIndexesTest = () => {
  console.log(`===== INDEXES =====`);

  const repeatsConfig = {
    warmUpRepeats: CONFIG.buildIndexWarmUpRepeats,
    runRepeats: CONFIG.buildIndexRepeats,
  };

  // tests
  const arrTest = testPerformance({
    fn: buildIndexArr.bind(null, data.collection),
    ...repeatsConfig,
  });
  console.log(` - array: ${arrTest.time.toFixed(1)}ms`);

  const pojoTest = testPerformance({
    fn: buildIndexPojo.bind(null, data.collection),
    ...repeatsConfig,
  });
  console.log(` - pojo: ${pojoTest.time.toFixed(1)}ms`);

  const mapTest = testPerformance({
    fn: buildIndexMap.bind(null, data.collection),
    ...repeatsConfig,
  });
  console.log(` - map: ${mapTest.time.toFixed(1)}ms`);

  const setTest = testPerformance({
    fn: buildIndexSet.bind(null, data.collection),
    ...repeatsConfig,
  });
  console.log(` - set: ${setTest.time.toFixed(1)}ms`);

  data = {
    collection: data.collection,
    indexArr: arrTest.result,
    indexPojo: pojoTest.result,
    indexMap: mapTest.result,
    indexSet: setTest.result,
  };

  indexTime = {
    arr: arrTest.time,
    pojo: pojoTest.time,
    map: mapTest.time,
    set: setTest.time,
  };
};

/**
 * FILTERING
 */
const validateFilterResults = (resultArr) => {
  const resultIds = resultArr.map((resultCol) =>
    resultCol.map((entry) => entry && entry.id).sort()
  );

  const entriesLength = resultIds[0].length;

  try {
    resultIds.forEach((idArr) => {
      if (entriesLength !== idArr.length) throw new Error("different length");
    });

    for (let entryIndex = 0; entryIndex < entriesLength; entryIndex++) {
      for (let resultIndex = 1; resultIndex < resultArr.length; resultIndex++) {
        if (resultIds[0][entryIndex] !== resultIds[resultIndex][entryIndex]) {
          throw new Error(
            `different id ${resultIds[0][entryIndex]} !== ${resultIds[resultIndex][entryIndex]} (resultIndex: ${resultIndex}, entryIndex: ${entryIndex})`
          );
        }
      }
    }

    console.log(`valid: OK (${resultArr[0].length} results)`);
  } catch (e) {
    console.error("ERROR: Results validation FAILED!", e.message);
    console.log("resultIds", resultIds);
  }
};

const runFilterScenario = (filter) => {
  if (filter === CONTROL_RUN) {
    console.log(`===== FILTER: CONTROL RUN =====`);
    console.log(`(all results should be very close)`);
  } else {
    console.log(`===== FILTER: ${JSON.stringify(filter)}`);
  }

  const repeatsConfig = {
    warmUpRepeats: CONFIG.methodWarmUpRepeats,
    runRepeats: CONFIG.methodRunRepeats,
  };

  // tests
  const { result: intersectionResult, time: intersectionTime } =
    testPerformance({
      fn: filterIntersection.bind(null, { data, filter }),
      ...repeatsConfig,
    });

  const { result: iterativePojoResult, time: iterativePojoTime } =
    testPerformance({
      fn: filterIterativePojo.bind(null, { data, filter }),
      ...repeatsConfig,
    });

  const { result: iterativeColResult, time: iterativeColTime } =
    testPerformance({
      fn: filterIterativeCol.bind(null, { data, filter }),
      ...repeatsConfig,
    });

  const { result: iterativeMapResult, time: iterativeMapTime } =
    testPerformance({
      fn: filterIterativeMap.bind(null, { data, filter }),
      ...repeatsConfig,
    });

  const { result: iterativeSetResult, time: iterativeSetTime } =
    testPerformance({
      fn: filterIterativeSet.bind(null, { data, filter }),
      ...repeatsConfig,
    });

  console.log(
    table([
      ["method", "filter", "index", "sum"],
      [
        "intersection",
        printTime(intersectionTime),
        printTime(indexTime.arr),
        printTime(intersectionTime + indexTime.arr),
      ],
      [
        "iter-index-pojo",
        printTime(iterativePojoTime),
        printTime(indexTime.pojo),
        printTime(iterativePojoTime + indexTime.pojo),
      ],
      [
        "iter-collection",
        printTime(iterativeColTime),
        printTime(indexTime.arr),
        printTime(iterativeColTime + indexTime.arr),
      ],
      [
        "iter-index-map",
        printTime(iterativeMapTime),
        printTime(indexTime.map),
        printTime(iterativeMapTime + indexTime.map),
      ],
      [
        "iter-index-set",
        printTime(iterativeSetTime),
        printTime(indexTime.set),
        printTime(iterativeSetTime + indexTime.set),
      ],
    ])
  );

  validateFilterResults([
    intersectionResult,
    iterativePojoResult,
    iterativeColResult,
    iterativeMapResult,
    iterativeSetResult,
  ]);
};

(function run() {
  console.time("process took");
  console.log("CONFIG", JSON.stringify(CONFIG));
  loadData();

  // warm up
  testPerformance({
    fn: buildIndexArr.bind(null, data.collection),
    warmUpRepeats: CONFIG.testWarmUpRepeats,
    runRepeats: CONFIG.testWarmUpRepeats,
  });

  runIndexesTest();

  // warm up
  testPerformance({
    fn: filterIntersection.bind(null, { data, filter: filterScenarios[0] }),
    warmUpRepeats: CONFIG.testWarmUpRepeats,
    runRepeats: CONFIG.testWarmUpRepeats,
  });

  filterScenarios.forEach((filter) => {
    runFilterScenario(filter);
  });

  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  console.timeEnd("process took");
})();
