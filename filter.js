const fs = require("fs");

const filterScenarios = [
  {
    status: "ACTIVE",
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
];

const RUN_REPEATS = 10;

/**
 * ===== DATA LOADING =====
 */
const entriesNo = process.argv[2] ? parseInt(process.argv[2]) : 10000;
const fileName = `data_${entriesNo}.json`;

if (!fs.existsSync(fileName)) {
  console.error(
    `File for ${entriesNo} entries not found. Please choose another number.`
  );
  process.exit();
}

const data = JSON.parse(fs.readFileSync(fileName, "utf8"));
const dataWithHashIndex = {
  collection: data.collection,
};
const dataWithMappedIndex = {
  collection: data.collection,
};

Object.entries(data).forEach(([indexName, indexByValue]) => {
  if (!indexName.startsWith("by")) {
    return;
  }

  dataWithHashIndex[indexName] = {};
  dataWithMappedIndex[indexName] = {};

  Object.entries(indexByValue).forEach(([val, ids]) => {
    dataWithHashIndex[indexName][val] = ids.reduce((idsHashed, id) => {
      idsHashed[id] = true;
      return idsHashed;
    }, {});

    dataWithMappedIndex[indexName][val] = new Map();
    ids.forEach((id) => dataWithMappedIndex[indexName][val].set(id, true));
  });
});

console.log(
  `Successfully loaded collection of ${
    Object.keys(data.collection).length
  } entries`
);

/**
 * ===== FILTERING METHODS =====
 */
const getIndex = (filterKey, filterVal, dataInput) => {
  const indexData =
    dataInput === 1
      ? dataWithHashIndex
      : dataInput === 2
      ? dataWithMappedIndex
      : data;

  return indexData[
    `by${filterKey.charAt(0).toUpperCase() + filterKey.slice(1)}`
  ][filterVal];
};

const resolveSingleFilter = (filter) => {
  return getIndex(Object.keys(filter)[0], Object.values(filter)[0]).map(
    (id) => data.collection[id]
  );
};

/**
 * In this approach we get set of indexes for each filter property, and then find intersection of all the sets.
 *
 * Calc complexity - we iterate over each index set (to build hash map of occurrences),
 * and then one additional time over set of ids found in any of the sets (to find ids occurring in all sets).
 */
const filterByIntersection = (filter) => {
  if (Object.keys(filter).length === 1) {
    return resolveSingleFilter(filter);
  }

  const indexesArr = Object.entries(filter).map(([filterKey, filterVal]) =>
    getIndex(filterKey, filterVal)
  );

  const intersectionCount = indexesArr.reduce((acc, index) => {
    index.forEach((id) => {
      if (!acc[id]) {
        acc[id] = 1;
      } else {
        acc[id]++;
      }
    });
    return acc;
  }, {});

  return Object.entries(intersectionCount)
    .filter(([_, count]) => count === indexesArr.length)
    .map(([id]) => data.collection[id]);
};

/**
 * In this approach indexes are used for 2 purposes:
 *  1) based on the indexes length, sort sets from the smallest to biggest
 *  2) get entries ids - but only for the initial set (the smallest one)
 *
 * Calc complexity - in the method's last reduce, collection starts from the smallest possible set and becomes
 * smaller and smaller after each iteration => thus reducing number of iterations needed
 */
const filterIterativelyCol = (filter) => {
  if (Object.keys(filter).length === 1) {
    return resolveSingleFilter(filter);
  }

  const indexesMap = Object.entries(filter).reduce(
    (acc, [filterKey, filterVal]) => {
      acc[filterKey] = getIndex(filterKey, filterVal);
      return acc;
    },
    {}
  );

  const filtersSortedFromSmallest = Object.keys(indexesMap).sort(
    (filterA, filterB) =>
      indexesMap[filterA].length - indexesMap[filterB].length
  );

  const initCollection = indexesMap[filtersSortedFromSmallest[0]].map(
    (id) => data.collection[id]
  );

  return filtersSortedFromSmallest
    .slice(1)
    .reduce(
      (col, filterKey) =>
        col.filter((item) => item[filterKey] === filter[filterKey]),
      initCollection
    );
};

const filterIterativelyIndexHash = (filter) => {
  if (Object.keys(filter).length === 1) {
    return resolveSingleFilter(filter);
  }

  const indexHashedMap = Object.entries(filter).reduce(
    (acc, [filterKey, filterVal]) => {
      acc[filterKey] = getIndex(filterKey, filterVal, 1);
      return acc;
    },
    {}
  );

  const filtersSortedFromSmallest = Object.keys(indexHashedMap).sort(
    (filterA, filterB) =>
      Object.keys(indexHashedMap[filterA]).length -
      Object.keys(indexHashedMap[filterB]).length
  );

  const initIds = Object.keys(indexHashedMap[filtersSortedFromSmallest[0]]);

  return filtersSortedFromSmallest
    .slice(1)
    .reduce(
      (ids, filterKey) => ids.filter((id) => indexHashedMap[filterKey][id]),
      initIds
    )
    .map((id) => data.collection[id]);
};

const filterIterativelyIndexMap = (filter) => {
  if (Object.keys(filter).length === 1) {
    return resolveSingleFilter(filter);
  }

  const indexMappedMap = Object.entries(filter).reduce(
    (acc, [filterKey, filterVal]) => {
      acc[filterKey] = getIndex(filterKey, filterVal, 2);
      return acc;
    },
    {}
  );

  const filtersSortedFromSmallest = Object.keys(indexMappedMap).sort(
    (filterA, filterB) =>
      indexMappedMap[filterA].size - indexMappedMap[filterB].size
  );

  const initIds = Array.from(
    indexMappedMap[filtersSortedFromSmallest[0]].keys()
  );

  return filtersSortedFromSmallest
    .slice(1)
    .reduce(
      (ids, filterKey) => ids.filter((id) => indexMappedMap[filterKey].has(id)),
      initIds
    )
    .map((id) => data.collection[id]);
};

/**
 * ===== RUN SCENARIOS =====
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
        if (resultArr[0][entryIndex] !== resultArr[resultIndex][entryIndex]) {
          throw new Error("different id");
        }
      }
    }

    console.log(`valid: OK (${resultArr[0].length} results)`);
  } catch (e) {
    console.error("ERROR: Results validation FAILED!", e.message);
    console.log("resultIds", resultIds);
  }
};

const runFilterMultipleTimes = (filterFn, filter, methodName) => {
  let filterResult = null;

  //warm up
  for (let i = 0; i < RUN_REPEATS; i++) {
    filterResult = filterFn(filter);
  }

  let timer = process.hrtime();
  for (let i = 0; i < RUN_REPEATS; i++) {
    filterResult = filterFn(filter);
  }
  timer = process.hrtime(timer);
  const avgTimeMs = (timer[0] * 1000 + timer[1] / 1000000) / RUN_REPEATS;
  console.log(` - ${methodName} - avg: ${avgTimeMs.toFixed(1)}ms`);

  return filterResult;
};

const runScenario = (filter) => {
  console.log(`===== running filter scenario: ${JSON.stringify(filter)}`);

  const intersectionResult = runFilterMultipleTimes(
    filterByIntersection,
    filter,
    "intersection"
  );

  const iterativeResult = runFilterMultipleTimes(
    filterIterativelyCol,
    filter,
    "iterative-col"
  );

  const mixedHashResult = runFilterMultipleTimes(
    filterIterativelyIndexHash,
    filter,
    "iterative-index-hash"
  );

  const mixedMapResult = runFilterMultipleTimes(
    filterIterativelyIndexMap,
    filter,
    "iterative-index-map"
  );

  validateFilterResults([
    intersectionResult,
    iterativeResult,
    mixedHashResult,
    mixedMapResult,
  ]);
};

filterScenarios.forEach((filter) => {
  runScenario(filter);
});
