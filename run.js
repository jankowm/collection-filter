const fs = require("fs");
const { buildIndexes } = require("./buildIndexes");
const { testPerformance } = require("./performance");
const {
  CONTROL_RUN,
  filterIntersection,
  filterIterativeCol,
  filterIterativePojo,
  filterIterativeMap,
  filterIterativeSet,
} = require("./filter");

const CONFIG = {
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
];

// load data
const entriesNo = process.argv[2] ? parseInt(process.argv[2]) : 10000;
const fileName = `data_${entriesNo}.json`;
if (!fs.existsSync(fileName)) {
  console.error(
    `File for ${entriesNo} entries not found. Please choose another number.`
  );
  process.exit();
}
let data = JSON.parse(fs.readFileSync(fileName, "utf8"));

console.log(
  `Successfully loaded collection of ${
    Object.keys(data.collection).length
  } entries`
);

// build indexes
const { result: indexResult, time: indexTime } = buildIndexes(data.collection);
data = { ...data, ...indexResult };

// run scenarios
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

const runScenario = (filter) => {
  if (filter === CONTROL_RUN) {
    console.log(
      `===== running CONTROL RUN (all results should be very close) =====`
    );
  } else {
    console.log(`===== running filter scenario: ${JSON.stringify(filter)}`);
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

  console.log(` - intersection - avg: ${intersectionTime.toFixed(1)}ms`);
  console.log(` - iter-index-pojo - avg: ${iterativePojoTime.toFixed(1)}ms`);
  console.log(` - iter-collection - avg: ${iterativeColTime.toFixed(1)}ms`);
  console.log(` - iter-index-map - avg: ${iterativeMapTime.toFixed(1)}ms`);
  console.log(` - iter-index-set - avg: ${iterativeSetTime.toFixed(1)}ms`);

  validateFilterResults([
    intersectionResult,
    iterativePojoResult,
    iterativeColResult,
    iterativeMapResult,
    iterativeSetResult,
  ]);
};

// initial test warm up
testPerformance({
  fn: filterIntersection.bind(null, { data, filter: filterScenarios[0] }),
  warmUpRepeats: CONFIG.testWarmUpRepeats,
  runRepeats: CONFIG.testWarmUpRepeats,
});

filterScenarios.forEach((filter) => {
  runScenario(filter);
});
