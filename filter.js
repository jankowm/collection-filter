const fs = require("fs");

const filterScenarios = [
  {
    status: "ACTIVE",
  },
  {
    status: ["ACTIVE", "IN_PROGRESS", "DELIVERED"],
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
const dataWithSetIndex = {
  collection: data.collection,
};

Object.entries(data).forEach(([indexName, indexByValue]) => {
  if (!indexName.startsWith("by")) {
    return;
  }

  dataWithHashIndex[indexName] = {};
  dataWithMappedIndex[indexName] = {};
  dataWithSetIndex[indexName] = {};

  Object.entries(indexByValue).forEach(([val, ids]) => {
    dataWithHashIndex[indexName][val] = ids.reduce((idsHashed, id) => {
      idsHashed[id] = true;
      return idsHashed;
    }, {});

    dataWithMappedIndex[indexName][val] = new Map();
    dataWithSetIndex[indexName][val] = new Set();

    ids.forEach((id) => {
      dataWithMappedIndex[indexName][val].set(id, true);
      dataWithSetIndex[indexName][val].add(id);
    });
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
      : dataInput === 3
      ? dataWithSetIndex
      : data;

  const filterName = `by${
    filterKey.charAt(0).toUpperCase() + filterKey.slice(1)
  }`;

  if (!Array.isArray(filterVal)) {
    return indexData[filterName][filterVal];
  }

  // POJO-based indexes
  if (dataInput === 1) {
    return filterVal.reduce(
      (acc, val) => ({ ...acc, ...indexData[filterName][val] }),
      {}
    );
  }

  // Map-/Set-based indexes => return array of map/set (since merging map/set is highly inefficient)
  else if (dataInput === 2 || dataInput === 3) {
    return filterVal.map((val) => indexData[filterName][val]);
  }

  // array-based indexes
  else {
    return [].concat.apply(
      [],
      filterVal.map((val) => indexData[filterName][val])
    );
  }
};

const resolveSingleFilter = (filter) => {
  const [[filterKey, filterVal]] = Object.entries(filter);

  const values = !Array.isArray(filterVal) ? [filterVal] : filterVal;

  return values
    .reduce((acc, val) => acc.concat(getIndex(filterKey, val)), [])
    .map((id) => data.collection[id]);
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

  return filtersSortedFromSmallest.slice(1).reduce((col, filterKey) => {
    const filterVal = filter[filterKey];
    const compareFn = Array.isArray(filterVal)
      ? (item) => filterVal.includes(item[filterKey])
      : (item) => item[filterKey] === filterVal;

    return col.filter(compareFn);
  }, initCollection);
};

const filterIterativelyIndexPojo = (filter) => {
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
    (filterA, filterB) => {
      const mapsA = indexMappedMap[filterA];
      const mapsB = indexMappedMap[filterB];

      const sizeA = Array.isArray(mapsA)
        ? mapsA.reduce((acc, map) => acc + map.size, 0)
        : mapsA.size;
      const sizeB = Array.isArray(mapsB)
        ? mapsB.reduce((acc, map) => acc + map.size, 0)
        : mapsB.size;

      return sizeA - sizeB;
    }
  );

  const initIds = Array.from(
    indexMappedMap[filtersSortedFromSmallest[0]].keys()
  );

  return filtersSortedFromSmallest
    .slice(1)
    .reduce(
      (ids, filterKey) =>
        ids.filter((id) => {
          const maps = indexMappedMap[filterKey];

          return Array.isArray(maps)
            ? maps.reduce((acc, map) => acc || map.has(id), false)
            : maps.has(id);
        }),
      initIds
    )
    .map((id) => data.collection[id]);
};

const filterIterativelyIndexSet = (filter) => {
  if (Object.keys(filter).length === 1) {
    return resolveSingleFilter(filter);
  }

  const indexSetMap = Object.entries(filter).reduce(
    (acc, [filterKey, filterVal]) => {
      acc[filterKey] = getIndex(filterKey, filterVal, 3);
      return acc;
    },
    {}
  );

  const filtersSortedFromSmallest = Object.keys(indexSetMap).sort(
    (filterA, filterB) => {
      const setsA = indexSetMap[filterA];
      const setsB = indexSetMap[filterB];

      const sizeA = Array.isArray(setsA)
        ? setsA.reduce((acc, set) => acc + set.size, 0)
        : setsA.size;
      const sizeB = Array.isArray(setsB)
        ? setsB.reduce((acc, set) => acc + set.size, 0)
        : setsB.size;

      return sizeA - sizeB;
    }
  );

  const initIds = Array.from(
    indexSetMap[filtersSortedFromSmallest[0]].values()
  );

  return filtersSortedFromSmallest
    .slice(1)
    .reduce(
      (ids, filterKey) =>
        ids.filter((id) => {
          const sets = indexSetMap[filterKey];

          return Array.isArray(sets)
            ? sets.reduce((acc, set) => acc || set.has(id), false)
            : sets.has(id);
        }),
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

  const iterativePojoResult = runFilterMultipleTimes(
    filterIterativelyIndexPojo,
    filter,
    "iterative-index-pojo"
  );

  const iterativeResult = runFilterMultipleTimes(
    filterIterativelyCol,
    filter,
    "iterative-collection"
  );
  const iterativeMapResult = runFilterMultipleTimes(
    filterIterativelyIndexMap,
    filter,
    "iterative-index-map"
  );

  const iterativeSetResult = runFilterMultipleTimes(
    filterIterativelyIndexSet,
    filter,
    "iterative-index-set"
  );

  validateFilterResults([
    intersectionResult,
    iterativePojoResult,
    iterativeResult,
    iterativeMapResult,
    iterativeSetResult,
  ]);
};

filterScenarios.forEach((filter) => {
  runScenario(filter);
});
