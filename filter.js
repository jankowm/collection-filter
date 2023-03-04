const fs = require("fs");

const filterScenarios = [
  {
    status: "ACTIVE",
  },
  {
    city: "Wroclaw",
  },
  {
    status: "ACTIVE",
    city: "Wroclaw",
    delivery: "DPD",
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

const data = JSON.parse(fs.readFileSync(fileName, "utf8"));

console.log(
  `Successfully loaded collection of ${
    Object.keys(data.collection).length
  } entries`
);

//filtering
const getIndex = (filterKey, filterVal) =>
  data[`by${filterKey.charAt(0).toUpperCase() + filterKey.slice(1)}`][
    filterVal
  ];

/**
 * In this approach we get set of indexes for each filter property, and then find intersection of all the sets.
 *
 * Calc complexity - we iterate over each index set (to build hash map of occurrences),
 * and then one additional time over set of ids found in any of the sets (to find ids occurring in all sets).
 */
const filterByIntersection = (filter) => {
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
const filterIteratively = (filter) => {
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

  if (filtersSortedFromSmallest.length === 1) {
    return initCollection;
  }

  return filtersSortedFromSmallest
    .slice(1)
    .reduce(
      (col, filterKey) =>
        col.filter((item) => item[filterKey] === filter[filterKey]),
      initCollection
    );
};

const validateFilterResults = (resultArr) => {
  const resultIds = resultArr.map((resultCol) =>
    resultCol.map(({ id }) => id).sort()
  );

  try {
    const entriesLength = resultIds[0].length;

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

    console.log("valid: OK");
  } catch (e) {
    console.error("ERROR: Results validation FAILED!", e.message);
    console.log("resultIds", resultIds);
  }
};

const runScenario = (filter) => {
  console.log(`===== running filter scenario: ${JSON.stringify(filter)}`);

  console.time(" - intersection");
  const intersectionResult = filterByIntersection(filter);
  console.timeEnd(" - intersection");

  console.time(" - iterative");
  const iterativeResult = filterIteratively(filter);
  console.timeEnd(" - iterative");

  validateFilterResults([intersectionResult, iterativeResult]);
};

filterScenarios.forEach((filter) => {
  runScenario(filter);
});
